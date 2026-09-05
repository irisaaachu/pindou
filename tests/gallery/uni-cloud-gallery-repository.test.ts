import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createUniCloudGalleryPayloadSource,
  createUniCloudGalleryRepository,
  type GalleryCloudDependencies,
} from "../../src/adapters/gallery";
import { buildGalleryImport } from "../../scripts/gallery/build-gallery-import.mjs";

const require = createRequire(import.meta.url);
const { projectPatternDetail } = require(resolve(process.cwd(), "uniCloud-aliyun/cloudfunctions/pindou-gallery/gallery-core.js")) as {
  projectPatternDetail(record: unknown): unknown;
};
const galleryContentDirectory = resolve(process.cwd(), "content/gallery");
const pilotCatalog = JSON.parse(await readFile(resolve(galleryContentDirectory, "catalog.json"), "utf8")) as {
  patterns: Array<{ id: string; version: string }>;
};
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

async function readPublishedAsset(fileRef: string): Promise<Buffer | null> {
  try {
    return await readFile(resolve(galleryContentDirectory, fileRef));
  } catch {
    return null;
  }
}

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
  test("carries exact pilot editable-text summaries from mapped import through cloud projection to client detail", async () => {
    const outputDirectory = await mkdtemp(resolve(tmpdir(), "gallery-detail-import-"));
    temporaryDirectories.push(outputDirectory);
    const cloudFileMap = Object.fromEntries(pilotCatalog.patterns.flatMap((pattern) => [
      [`gallery/${pattern.id}/${pattern.version}/payload`, `cloud://test-space/${pattern.id}/payload`],
      [`gallery/${pattern.id}/${pattern.version}/card`, `cloud://test-space/${pattern.id}/card`],
      [`gallery/${pattern.id}/${pattern.version}/detail`, `cloud://test-space/${pattern.id}/detail`],
    ]));
    await buildGalleryImport(pilotCatalog, readPublishedAsset, outputDirectory, cloudFileMap);
    const imports = (await readFile(resolve(outputDirectory, "patterns-import.json"), "utf8"))
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    const importedInsideDog = imports.find((record) => record.content_id === "inside-cute-dog-sign");
    expect(importedInsideDog).toMatchObject({
      editable_text_regions: [{
        id: "message",
        default_text: "内有萌犬",
        x: 27,
        y: 3,
        font_id: "pindou-hanzi-12",
        size: 12,
        color_id: "H6",
        max_length: 4,
      }],
    });

    const clientDetails = await Promise.all(imports.map(async (record) => {
      const projected = projectPatternDetail(record);
      const deps = dependencies({ getPattern: vi.fn(async () => ({ ok: true, data: projected })) });
      const result = await createUniCloudGalleryRepository(deps).getPattern(record.content_id);
      if (!result.ok || !result.data) throw new Error(`Expected valid detail for ${record.content_id}`);
      return result.data;
    }));

    expect(Object.fromEntries(clientDetails.map((detail) => [detail.id, {
      count: detail.editableTextRegions.length,
      hasEditableText: detail.hasEditableText,
    }]))).toEqual({
      "birthday-dog-cake-bouquet": { count: 0, hasEditableText: false },
      "delivery-block-door-sign": { count: 1, hasEditableText: true },
      "farewell-fortune-sign": { count: 2, hasEditableText: true },
      "inside-cute-dog-sign": { count: 1, hasEditableText: true },
    });
    expect(JSON.stringify(clientDetails)).not.toContain("\"cells\"");
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
