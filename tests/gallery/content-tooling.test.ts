import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import { buildGalleryImport } from "../../scripts/gallery/build-gallery-import.mjs";
import { compareSemanticVersions, validateCatalog } from "../../scripts/gallery/gallery-contract.mjs";

const fixtureDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/gallery");
const repositoryRoot = resolve(fixtureDirectory, "../../..");
const galleryContentDirectory = resolve(repositoryRoot, "content/gallery");
const validCatalog = JSON.parse(await readFile(resolve(fixtureDirectory, "valid-catalog.json"), "utf8"));
const invalidHashCatalog = JSON.parse(await readFile(resolve(fixtureDirectory, "invalid-hash-catalog.json"), "utf8"));
const publishedCatalog = JSON.parse(await readFile(resolve(galleryContentDirectory, "catalog.json"), "utf8"));
const temporaryDirectories: string[] = [];

async function readFixtureAsset(fileRef: string): Promise<string | null> {
  try {
    return await readFile(resolve(fixtureDirectory, fileRef), "utf8");
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

  test("writes eight category objects as JSONL and an empty pattern file", async () => {
    const outputDirectory = await mkdtemp(resolve(tmpdir(), "gallery-import-"));
    temporaryDirectories.push(outputDirectory);
    const obsoleteCategories = resolve(outputDirectory, "categories.json");
    const obsoletePatterns = resolve(outputDirectory, "patterns.json");
    await Promise.all([writeFile(obsoleteCategories, "obsolete", "utf8"), writeFile(obsoletePatterns, "obsolete", "utf8")]);

    await buildGalleryImport(publishedCatalog, readFixtureAsset, outputDirectory);
    const categories = await readFile(resolve(outputDirectory, "categories-import.json"), "utf8");
    const patterns = await readFile(resolve(outputDirectory, "patterns-import.json"), "utf8");
    const categoryLines = categories.trimEnd().split("\n");

    expect(categoryLines).toHaveLength(8);
    expect(categoryLines.map((line) => JSON.parse(line))).toEqual(expect.arrayContaining([
      expect.objectContaining({ _id: "gallery-category:usage-gift@1.0.0", content_id: "usage-gift", short_label: "礼物" }),
    ]));
    expect(() => JSON.parse(categories)).toThrow();
    expect(Buffer.byteLength(patterns, "utf8")).toBe(0);
    await expect(readFile(obsoleteCategories, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(obsoletePatterns, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
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
