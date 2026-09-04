import { describe, expect, test, vi } from "vitest";

import {
  createCachedPayloadSource,
  createUniH5PayloadCache,
  createUniWeChatPayloadCache,
  payloadCacheKey,
  createPlatformPayloadCache,
  type GalleryPayloadCache,
} from "../../src/adapters/gallery";
import { sha256Utf8, type GalleryPayloadDescriptor } from "../../src/domain/gallery";

const validPayload = JSON.stringify({
  format: "pindou-gallery-pattern",
  formatVersion: 1,
  contentId: "tiny-heart",
  contentVersion: "1.0.0",
  width: 2,
  height: 2,
  palette: { id: "pindou-basic", version: "1.0.0" },
  cells: ["R01", null, "R01", "R01"],
  direction: "normal",
  editableTextRegions: [{ id: "message", defaultText: "Hi", x: 0, y: 0, fontId: "sans", size: 12, colorId: "R01", maxLength: 12 }],
});

function descriptor(text = validPayload, overrides: Partial<GalleryPayloadDescriptor> = {}): GalleryPayloadDescriptor {
  return {
    fileRef: "https://temporary.example/tiny-heart.json",
    formatVersion: 1,
    byteSize: new TextEncoder().encode(text).byteLength,
    sha256: sha256Utf8(text),
    ...overrides,
  };
}

function source(text = validPayload) {
  return { download: vi.fn(async () => ({ ok: true as const, data: text })) };
}

function identity() {
  return { id: "tiny-heart", version: "1.0.0" };
}

function createMemoryPayloadCache(): GalleryPayloadCache {
  const entries = new Map<string, string>();
  return {
    get: async (key) => entries.get(key) ?? null,
    put: async (key, text) => { entries.set(key, text); },
    remove: async (key) => { entries.delete(key); },
  };
}

describe("gallery payload cache", () => {
  test("rejects writes larger than the descriptor byte size", async () => {
    const write = vi.fn(async () => undefined);
    const cache = createPlatformPayloadCache({ read: async () => null, write, remove: async () => undefined });

    await expect(cache.put("payload.json", "猫", 1)).rejects.toThrow("PAYLOAD_TOO_LARGE");
    expect(write).not.toHaveBeenCalled();
  });

  test("uses the same logical key for H5 storage", async () => {
    const set = vi.fn(async (key: string, data: string) => { void key; void data; });
    const cache = createUniH5PayloadCache({
      getStorage: ({ fail }) => fail(),
      setStorage: ({ key, data, success }) => { void set(key, data); success(); },
      removeStorage: ({ success }) => success(),
    });

    await cache.put("gallery-payload-v1/id/1/hash.json", "{}", 2);
    expect(set).toHaveBeenCalledWith("gallery-payload-v1/id/1/hash.json", "{}");
  });

  test("writes WeChat cache files below USER_DATA_PATH", async () => {
    const writeFile = vi.fn((options: { success(): void }) => options.success());
    const cache = createUniWeChatPayloadCache({
      getFileSystemManager: () => ({
        readFile: ({ fail }) => fail(),
        mkdir: ({ success }) => success(),
        writeFile,
        unlink: ({ success }) => success(),
      }),
    }, { env: { USER_DATA_PATH: "/wx-data" } });

    await cache.put("gallery-payload-v1/id/1/hash.json", "{}", 2);
    expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({
      filePath: "/wx-data/gallery-payload-v1/id/1/hash.json",
      data: "{}",
      encoding: "utf8",
    }));
  });
  test("builds a versioned cache key from content identity and descriptor hash", () => {
    expect(payloadCacheKey(identity(), descriptor("x"))).toBe(`gallery-payload-v1/tiny-heart/1.0.0/${sha256Utf8("x")}.json`);
  });

  test("returns a verified cache hit without downloading", async () => {
    const cache = createMemoryPayloadCache();
    const network = source();
    await cache.put(payloadCacheKey(identity(), descriptor()), validPayload);

    await expect(createCachedPayloadSource(network, cache).download(descriptor(), identity())).resolves.toEqual({ ok: true, data: validPayload });
    expect(network.download).not.toHaveBeenCalled();
  });

  test("does not reuse a cached payload from another content version or hash", async () => {
    const cache = createMemoryPayloadCache();
    const network = source();
    await cache.put(payloadCacheKey({ id: "tiny-heart", version: "0.9.0" }, descriptor()), validPayload);

    await createCachedPayloadSource(network, cache).download(descriptor(), identity());

    expect(network.download).toHaveBeenCalledTimes(1);
  });

  test("removes a corrupt cache entry and replaces it from one clean download", async () => {
    const cache = createMemoryPayloadCache();
    const network = source();
    const key = payloadCacheKey(identity(), descriptor());
    await cache.put(key, "corrupt cache");

    await expect(createCachedPayloadSource(network, cache).download(descriptor(), identity())).resolves.toEqual({ ok: true, data: validPayload });
    await expect(cache.get(key)).resolves.toBe(validPayload);
    expect(network.download).toHaveBeenCalledTimes(1);
  });

  test("retries exactly once after an integrity failure and never caches the failed result", async () => {
    const cache = createMemoryPayloadCache();
    const network = {
      download: vi.fn()
        .mockResolvedValueOnce({ ok: true, data: "tampered" })
        .mockResolvedValueOnce({ ok: true, data: validPayload }),
    };

    await expect(createCachedPayloadSource(network, cache).download(descriptor(), identity())).resolves.toEqual({ ok: true, data: validPayload });
    expect(network.download).toHaveBeenCalledTimes(2);
    await expect(cache.get(payloadCacheKey(identity(), descriptor()))).resolves.toBe(validPayload);
  });

  test("returns a retryable integrity error after the second invalid download and writes nothing", async () => {
    const cache = createMemoryPayloadCache();
    const network = source("tampered");

    await expect(createCachedPayloadSource(network, cache).download(descriptor(), identity())).resolves.toEqual({
      ok: false,
      error: { code: "PAYLOAD_INTEGRITY_FAILED" },
    });
    expect(network.download).toHaveBeenCalledTimes(2);
    await expect(cache.get(payloadCacheKey(identity(), descriptor()))).resolves.toBeNull();
  });

  test("returns a verified download when cache persistence fails", async () => {
    const cache: GalleryPayloadCache = {
      get: vi.fn(async () => null),
      put: vi.fn(async () => { throw new Error("quota detail"); }),
      remove: vi.fn(async () => undefined),
    };

    await expect(createCachedPayloadSource(source(), cache).download(descriptor(), identity())).resolves.toEqual({ ok: true, data: validPayload });
  });
});
