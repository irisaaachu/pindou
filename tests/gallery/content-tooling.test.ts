import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";
import { afterEach, describe, expect, test } from "vitest";

import { buildGalleryImport, resolveCloudAssetRefs } from "../../scripts/gallery/build-gallery-import.mjs";
import { buildGalleryUploadManifest } from "../../scripts/gallery/build-gallery-upload-manifest.mjs";
import { compareSemanticVersions, validateCatalog, validatePublishedCatalog } from "../../scripts/gallery/gallery-contract.mjs";

const fixtureDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/gallery");
const repositoryRoot = resolve(fixtureDirectory, "../../..");
const galleryContentDirectory = resolve(repositoryRoot, "content/gallery");
const validCatalog = JSON.parse(await readFile(resolve(fixtureDirectory, "valid-catalog.json"), "utf8"));
const invalidHashCatalog = JSON.parse(await readFile(resolve(fixtureDirectory, "invalid-hash-catalog.json"), "utf8"));
const publishedCatalog = JSON.parse(await readFile(resolve(galleryContentDirectory, "catalog.json"), "utf8"));
const expectedPilotMetadata = JSON.parse(await readFile(resolve(fixtureDirectory, "pilot-expected-metadata.json"), "utf8"));
const temporaryDirectories: string[] = [];
const execFileAsync = promisify(execFile);

function cloudFileMap(catalog: typeof publishedCatalog): Record<string, string> {
  return Object.fromEntries(catalog.patterns.flatMap((pattern: { id: string; version: string }) => [
    [`gallery/${pattern.id}/${pattern.version}/payload`, `cloud://test-space/${pattern.id}/payload`],
    [`gallery/${pattern.id}/${pattern.version}/card`, `cloud://test-space/${pattern.id}/card`],
    [`gallery/${pattern.id}/${pattern.version}/detail`, `cloud://test-space/${pattern.id}/detail`],
  ]));
}

async function readFixtureAsset(fileRef: string): Promise<string | null> {
  try {
    return await readFile(resolve(fixtureDirectory, fileRef), "utf8");
  } catch {
    return null;
  }
}

async function readPublishedAsset(fileRef: string): Promise<Buffer | null> {
  try {
    return await readFile(resolve(galleryContentDirectory, fileRef));
  } catch {
    return null;
  }
}

function validationPaths(catalog: unknown): Promise<string[]> {
  return validateCatalog(catalog, readFixtureAsset).then((issues) => issues.map((issue) => issue.path));
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("gallery content tooling", () => {
  test("orders semantic versions including numeric prerelease identifiers", () => {
    const versions = ["1.0.0", "1.0.0-alpha.10", "1.0.0-alpha.2", "1.0.0-alpha", "1.0.0-beta", "1.0.1"];

    expect(versions.sort(compareSemanticVersions)).toEqual([
      "1.0.0-alpha",
      "1.0.0-alpha.2",
      "1.0.0-alpha.10",
      "1.0.0-beta",
      "1.0.0",
      "1.0.1",
    ]);
  });

  test("keeps the complete hyphenated prerelease identifier", () => {
    expect(compareSemanticVersions("1.0.0-alpha-beta", "1.0.0-alpha")).toBeGreaterThan(0);
  });

  test("accepts a complete synthetic 2x2 catalog", async () => {
    expect(await validateCatalog(validCatalog, readFixtureAsset)).toEqual([]);
  });

  test.each([
    ["duplicate content IDs", { ...validCatalog, categories: [...validCatalog.categories, { ...validCatalog.categories[0] }] }, "categories[1].id"],
    ["unknown usage tags", { ...validCatalog, patterns: [{ ...validCatalog.patterns[0], usageTags: ["unknown"] }] }, "patterns[0].usageTags[0]"],
    ["mismatched payload bytes or hash", invalidHashCatalog, "patterns[0].payload"],
    ["unapproved published content", { ...validCatalog, categories: [{ ...validCatalog.categories[0], licenseStatus: "pending" }] }, "categories[0].licenseStatus"],
    ["missing payload assets", { ...validCatalog, patterns: [{ ...validCatalog.patterns[0], payload: { ...validCatalog.patterns[0].payload, fileRef: "payloads/missing.json" } }] }, "patterns[0].payload.fileRef"],
  ])("rejects %s with a precise JSON path", async (_name, catalog, path) => {
    expect(await validationPaths(catalog)).toContain(path);
  });

  test("rejects out-of-bounds editable text with a precise JSON path", async () => {
    const invalidPayload = JSON.stringify({
      ...JSON.parse(await readFixtureAsset("payloads/tiny-heart-v1.json") as string),
      editableTextRegions: [{ id: "message", defaultText: "Hi", x: 2, y: 0, fontId: "sans", size: 12, colorId: "R01", maxLength: 12 }],
    });
    const readInvalidAsset = async (fileRef: string) => fileRef === "payloads/tiny-heart-v1.json" ? invalidPayload : readFixtureAsset(fileRef);

    expect((await validateCatalog(validCatalog, readInvalidAsset)).map((issue) => issue.path)).toContain("patterns[0].payload.editableTextRegions[0].x");
  });

  test("writes eight category objects and four pilot patterns as JSONL", async () => {
    const outputDirectory = await mkdtemp(resolve(tmpdir(), "gallery-import-"));
    temporaryDirectories.push(outputDirectory);
    const obsoleteCategories = resolve(outputDirectory, "categories.json");
    const obsoletePatterns = resolve(outputDirectory, "patterns.json");
    await Promise.all([writeFile(obsoleteCategories, "obsolete", "utf8"), writeFile(obsoletePatterns, "obsolete", "utf8")]);

    await buildGalleryImport(publishedCatalog, readPublishedAsset, outputDirectory);
    const categories = await readFile(resolve(outputDirectory, "categories-import.json"), "utf8");
    const patterns = await readFile(resolve(outputDirectory, "patterns-import.json"), "utf8");
    const categoryLines = categories.trimEnd().split("\n");

    expect(categoryLines).toHaveLength(8);
    expect(categoryLines.map((line) => JSON.parse(line))).toEqual(expect.arrayContaining([
      expect.objectContaining({ _id: "gallery-category:usage-gift@1.0.0", content_id: "usage-gift", short_label: "礼物" }),
    ]));
    expect(() => JSON.parse(categories)).toThrow();
    expect(patterns.trimEnd().split("\n")).toHaveLength(4);
    expect(patterns.trimEnd().split("\n").map((line) => JSON.parse(line))).toEqual(expect.arrayContaining([
      expect.objectContaining({ _id: "gallery-pattern:inside-cute-dog-sign@1.0.0", name: "内有萌犬" }),
    ]));
    await expect(readFile(obsoleteCategories, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(obsoletePatterns, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("publishes the four approved pilot records with asset-derived metadata", async () => {
    expect(publishedCatalog.patterns).toHaveLength(4);
    expect(publishedCatalog.patterns.map((pattern: { id: string }) => pattern.id)).toEqual(expectedPilotMetadata.patterns.map((pattern: { id: string }) => pattern.id));
    for (const expected of expectedPilotMetadata.patterns) {
      const pattern = publishedCatalog.patterns.find((candidate: { id: string }) => candidate.id === expected.id);
      const [card, detail] = await Promise.all([readPublishedAsset(pattern.coverRef), readPublishedAsset(pattern.previewRef)]);
      expect(pattern).toMatchObject({ id: expected.id, name: expected.name });
      expect(PNG.sync.read(card as Buffer)).toMatchObject({ width: expected.card[0], height: expected.card[1] });
      expect(PNG.sync.read(detail as Buffer)).toMatchObject({ width: expected.detail[0], height: expected.detail[1] });
      expect(pattern.intentionalSingleCells).toEqual(expect.arrayContaining(expected.intentionalSingleCells));
    }
    expect(await validatePublishedCatalog(publishedCatalog, readPublishedAsset)).toEqual([]);
  });

  test("rejects an undeclared one-cell color component", async () => {
    const catalog = {
      ...publishedCatalog,
      patterns: publishedCatalog.patterns.map((pattern: Record<string, unknown>) => pattern.id === "farewell-fortune-sign" ? {
        ...pattern,
        intentionalSingleCells: (pattern.intentionalSingleCells as unknown[]).slice(1),
      } : pattern),
    };

    expect((await validateCatalog(catalog, readPublishedAsset)).map((issue) => issue.path)).toContain("patterns[3].intentionalSingleCells");
  });

  test("builds a cloud-free twelve-entry upload manifest from the approved asset paths", async () => {
    const outputDirectory = await mkdtemp(resolve(tmpdir(), "gallery-upload-"));
    temporaryDirectories.push(outputDirectory);

    const manifest = await buildGalleryUploadManifest(publishedCatalog, readPublishedAsset, outputDirectory);
    const written = JSON.parse(await readFile(resolve(outputDirectory, "asset-upload-manifest.json"), "utf8"));

    expect(manifest).toEqual(written);
    expect(manifest.assets).toHaveLength(12);
    expect(new Set(manifest.assets.map((asset: { logicalKey: string }) => asset.logicalKey)).size).toBe(12);
    expect(manifest.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ logicalKey: "gallery/inside-cute-dog-sign/1.0.0/payload", path: "content/gallery/payloads/inside-cute-dog-sign-v1.json" }),
      expect.objectContaining({ logicalKey: "gallery/birthday-dog-cake-bouquet/1.0.0/detail", path: "content/gallery/previews/detail/birthday-dog-cake-bouquet-v1.png" }),
    ]));
    expect(JSON.stringify(manifest)).not.toMatch(/cloud:\/\//i);
    expect(manifest.assets.every((asset: { path: string }) => !asset.path.startsWith("/") && !asset.path.includes(".."))).toBe(true);
  });

  test("resolves every list, detail, and payload reference into the corresponding cloud file ID", async () => {
    const outputDirectory = await mkdtemp(resolve(tmpdir(), "gallery-import-"));
    temporaryDirectories.push(outputDirectory);
    const mapping = cloudFileMap(publishedCatalog);

    const resolvedCatalog = resolveCloudAssetRefs(publishedCatalog, mapping);
    const resolvedPattern = resolvedCatalog.patterns.find((pattern: { id: string }) => pattern.id === "inside-cute-dog-sign");
    await buildGalleryImport(publishedCatalog, readPublishedAsset, outputDirectory, mapping);
    const imports = (await readFile(resolve(outputDirectory, "patterns-import.json"), "utf8")).trimEnd().split("\n").map((line) => JSON.parse(line));

    expect(resolvedPattern).toMatchObject({
      coverRef: "cloud://test-space/inside-cute-dog-sign/card",
      previewRef: "cloud://test-space/inside-cute-dog-sign/detail",
      payload: expect.objectContaining({ fileRef: "cloud://test-space/inside-cute-dog-sign/payload" }),
    });
    expect(imports).toEqual(expect.arrayContaining([
      expect.objectContaining({
        content_id: "inside-cute-dog-sign",
        card_cover_ref: "cloud://test-space/inside-cute-dog-sign/card",
        detail_preview_ref: "cloud://test-space/inside-cute-dog-sign/detail",
        payload_file_ref: "cloud://test-space/inside-cute-dog-sign/payload",
      }),
    ]));
    expect(JSON.stringify(imports)).not.toContain("previews/card/");
    expect(JSON.stringify(imports)).not.toContain("previews/detail/");
    expect(JSON.stringify(imports)).not.toContain("payloads/");
  });

  test.each([
    ["missing logical keys", (mapping: Record<string, string>) => { delete mapping["gallery/inside-cute-dog-sign/1.0.0/payload"]; }, "Cloud file map does not match catalog assets."],
    ["extra logical keys", (mapping: Record<string, string>) => { mapping["gallery/extra/1.0.0/payload"] = "cloud://test-space/extra/payload"; }, "Cloud file map does not match catalog assets."],
    ["duplicate cloud IDs", (mapping: Record<string, string>) => { mapping["gallery/inside-cute-dog-sign/1.0.0/payload"] = mapping["gallery/inside-cute-dog-sign/1.0.0/card"]; }, "Cloud file map contains duplicate cloud file IDs."],
    ["blank cloud IDs", (mapping: Record<string, string>) => { mapping["gallery/inside-cute-dog-sign/1.0.0/payload"] = "   "; }, "Cloud file map contains blank cloud file IDs."],
    ["non-cloud references", (mapping: Record<string, string>) => { mapping["gallery/inside-cute-dog-sign/1.0.0/payload"] = "payloads/inside-cute-dog-sign-v1.json"; }, "Cloud file map contains non-cloud references."],
    ["cloud IDs with whitespace-only suffixes", (mapping: Record<string, string>) => { mapping["gallery/inside-cute-dog-sign/1.0.0/payload"] = "cloud://   "; }, "Cloud file map contains non-cloud references."],
  ])("rejects %s without revealing mapped values", (_name, change, message) => {
    const mapping = cloudFileMap(publishedCatalog);
    change(mapping);

    try {
      resolveCloudAssetRefs(publishedCatalog, mapping);
      throw new Error("Expected cloud file map resolution to fail.");
    } catch (error) {
      expect(error).toMatchObject({ message });
    }
  });

  test("keeps the real cloud file map ignored and the copyable example account-safe", async () => {
    const examplePath = "content/gallery/cloud-file-map.example.json";
    const realMapPath = "content/gallery/cloud-file-map.json";
    const example = JSON.parse(await readFile(resolve(repositoryRoot, examplePath), "utf8"));

    await expect(execFileAsync("git", ["check-ignore", "--quiet", realMapPath], { cwd: repositoryRoot })).resolves.toBeDefined();
    await expect(execFileAsync("git", ["check-ignore", "--quiet", examplePath], { cwd: repositoryRoot })).rejects.toMatchObject({ code: 1 });
    await expect(execFileAsync("git", ["ls-files", "--error-unmatch", realMapPath], { cwd: repositoryRoot })).rejects.toMatchObject({ code: 1 });
    expect(Object.keys(example).sort()).toEqual(Object.keys(cloudFileMap(publishedCatalog)).sort());
    expect(Object.values(example)).not.toContainEqual(expect.stringMatching(/^cloud:\/\//));
  });

  test("uses one immutable database identity per content ID and version", async () => {
    const outputDirectory = await mkdtemp(resolve(tmpdir(), "gallery-import-"));
    temporaryDirectories.push(outputDirectory);
    await buildGalleryImport(validCatalog, readFixtureAsset, outputDirectory);
    const first = JSON.parse((await readFile(resolve(outputDirectory, "patterns-import.json"), "utf8")).trim());
    const changed = { ...validCatalog, patterns: [{ ...validCatalog.patterns[0], name: "Conflicting name" }] };
    await buildGalleryImport(changed, readFixtureAsset, outputDirectory);
    const conflict = JSON.parse((await readFile(resolve(outputDirectory, "patterns-import.json"), "utf8")).trim());

    expect(conflict._id).toBe(first._id);
    expect(conflict.name).not.toBe(first.name);
  });
});
