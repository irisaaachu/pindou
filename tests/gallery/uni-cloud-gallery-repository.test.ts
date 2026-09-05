import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import { describe, expect, test, vi } from "vitest";

import {
  createUniCloudGalleryPayloadSource,
  createUniCloudGalleryRepository,
  type GalleryCloudDependencies,
} from "../../src/adapters/gallery";
import { resolveCloudAssetRefs } from "../../scripts/gallery/build-gallery-import.mjs";
import { toPatternImport } from "../../scripts/gallery/gallery-contract.mjs";

const require = createRequire(import.meta.url);
const { projectPatternDetail } = require(resolve(process.cwd(), "uniCloud-aliyun/cloudfunctions/pindou-gallery/gallery-core.js")) as {
  projectPatternDetail(record: unknown): unknown;
};
const pilotCatalog = JSON.parse(readFileSync(resolve(process.cwd(), "content/gallery/catalog.json"), "utf8")) as {
  patterns: Array<{ id: string; version: string }>;
};

const payloadDescriptor = {
  fileRef: "https://temporary.example/tiny-heart.json",
  formatVersion: 1 as const,
  byteSize: 302,
  sha256: "a".repeat(64),
};

function summary(id = "tiny-heart") {
  return {
    id,
    version: "1.0.0",
    name: "Tiny Heart",
    coverRef: "https://temporary.example/cover.png",
    width: 2,
    height: 2,
    difficulty: "beginner" as const,
    sizeClass: "small" as const,
    tags: { usage: ["keychain"], themes: ["love"], features: ["text"] },
    hasEditableText: true,
    publishedAt: "2026-09-01T00:00:00.000Z",
  };
}

function detail(id = "tiny-heart") {
  return {
    ...summary(id),
    description: "A small heart.",
    previewRef: "https://temporary.example/preview.png",
    physicalWidthMm: 10,
    physicalHeightMm: 10,
    palette: { id: "pindou-basic", version: "1.0.0" },
    direction: "normal" as const,
    colorCount: 1,
    beadCount: 3,
    editableTextRegions: [{
      id: "message", defaultText: "Hi", x: 0, y: 0, fontId: "sans", size: 12, colorId: "R01", maxLength: 12,
    }],
    creator: "Pindou",
    sourceType: "original" as const,
    payload: payloadDescriptor,
  };
}

function dependencies(overrides: Partial<GalleryCloudDependencies> = {}): GalleryCloudDependencies {
  return {
    listCategories: vi.fn(async () => ({ ok: true, data: [{
      id: "category-hearts", version: "1.0.0", slug: "hearts", name: "Hearts", shortLabel: "Hearts", quickEntry: true, order: 0,
    }] })),
    listPatterns: vi.fn(async () => ({ ok: true, data: { items: [summary()], nextCursor: "opaque-next" } })),
    getPattern: vi.fn(async () => ({ ok: true, data: detail() })),
    downloadText: vi.fn(async () => "{\"payload\":true}"),
    ...overrides,
  };
}

describe("uniCloud gallery repository", () => {
  test("accepts a production pilot detail after its cloud asset references are resolved", async () => {
    const cloudFileMap = Object.fromEntries(pilotCatalog.patterns.flatMap((pattern) => [
      [`gallery/${pattern.id}/${pattern.version}/payload`, `cloud://test-space/${pattern.id}/payload`],
      [`gallery/${pattern.id}/${pattern.version}/card`, `cloud://test-space/${pattern.id}/card`],
      [`gallery/${pattern.id}/${pattern.version}/detail`, `cloud://test-space/${pattern.id}/detail`],
    ]));
    const productionPattern = resolveCloudAssetRefs(pilotCatalog, cloudFileMap).patterns[0];
    const detail = projectPatternDetail(toPatternImport(productionPattern));
    const deps = dependencies({ getPattern: vi.fn(async () => ({ ok: true, data: detail })) });

    await expect(createUniCloudGalleryRepository(deps).getPattern(productionPattern.id)).resolves.toMatchObject({
      ok: true,
      data: expect.objectContaining({
        id: "inside-cute-dog-sign",
        name: "内有萌犬",
        previewRef: "cloud://test-space/inside-cute-dog-sign/detail",
      }),
    });
  });

  test("maps validated public category envelopes without consulting identity state", async () => {
    const deps = dependencies();
    const repository = createUniCloudGalleryRepository(deps);

    await expect(repository.listCategories()).resolves.toEqual({
      ok: true,
      data: [{
        id: "category-hearts", version: "1.0.0", slug: "hearts", name: "Hearts", shortLabel: "Hearts", quickEntry: true, order: 0,
      }],
    });
    expect(Object.keys(deps)).not.toContain("readStorage");
  });

  test("preserves the validated page cursor and query", async () => {
    const deps = dependencies();
    const query = { order: "newest" as const, limit: 12, cursor: "opaque-current" };

    await expect(createUniCloudGalleryRepository(deps).listPatterns(query)).resolves.toEqual({
      ok: true,
      data: { items: [summary()], nextCursor: "opaque-next" },
    });
    expect(deps.listPatterns).toHaveBeenCalledWith(query);
  });

  test("maps a missing published pattern to a public null result", async () => {
    const deps = dependencies({ getPattern: vi.fn(async () => ({ ok: true, data: null })) });

    await expect(createUniCloudGalleryRepository(deps).getPattern("missing")).resolves.toEqual({ ok: true, data: null });
  });

  test.each([
    ["INVALID_REQUEST", "INVALID_REQUEST"],
    ["NOT_FOUND", "NOT_FOUND"],
    ["ASSET_UNAVAILABLE", "ASSET_UNAVAILABLE"],
    ["NETWORK_ERROR", "NETWORK_ERROR"],
    ["UNSUPPORTED_VERSION", "UNSUPPORTED_VERSION"],
    ["anything-private", "INTERNAL_ERROR"],
  ])("maps cloud code %s to the stable public error %s", async (cloudCode, expectedCode) => {
    const deps = dependencies({ listCategories: vi.fn(async () => ({ ok: false, error: { code: cloudCode } })) });

    await expect(createUniCloudGalleryRepository(deps).listCategories()).resolves.toEqual({
      ok: false,
      error: { code: expectedCode },
    });
  });

  test("maps a thrown transport failure to NETWORK_ERROR without exposing its message", async () => {
    const deps = dependencies({ listCategories: vi.fn(async () => { throw new Error("private upstream detail"); }) });
    const result = await createUniCloudGalleryRepository(deps).listCategories();

    expect(result).toEqual({ ok: false, error: { code: "NETWORK_ERROR" } });
    expect(result).not.toHaveProperty("error.message");
  });

  test("rejects malformed successful cloud data", async () => {
    const deps = dependencies({ getPattern: vi.fn(async () => ({ ok: true, data: { ...detail(), width: 0 } })) });

    await expect(createUniCloudGalleryRepository(deps).getPattern("tiny-heart")).resolves.toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR" },
    });
  });

  test("downloads exact payload text from a temporary payload URL", async () => {
    const deps = dependencies({ downloadText: vi.fn(async (url) => `downloaded:${url}`) });

    await expect(createUniCloudGalleryPayloadSource(deps).download(payloadDescriptor)).resolves.toEqual({
      ok: true,
      data: "downloaded:https://temporary.example/tiny-heart.json",
    });
    expect(deps.downloadText).toHaveBeenCalledWith("https://temporary.example/tiny-heart.json");
  });
});
