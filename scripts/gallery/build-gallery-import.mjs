import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { compareSemanticVersions, toCategoryImport, toPatternImport, validateCatalog } from "./gallery-contract.mjs";

export function writeJsonLines(records) {
  return records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");
}

export function resolveCloudAssetRefs(catalog, mapping) {
  if (!isRecord(mapping)) throw new Error("Cloud file map does not match catalog assets.");
  const expectedKeys = catalog.patterns.flatMap((pattern) => [
    `gallery/${pattern.id}/${pattern.version}/payload`,
    `gallery/${pattern.id}/${pattern.version}/card`,
    `gallery/${pattern.id}/${pattern.version}/detail`,
  ]);
  const mappingKeys = Object.keys(mapping);
  if (mappingKeys.length !== expectedKeys.length || mappingKeys.some((key) => !expectedKeys.includes(key))) {
    throw new Error("Cloud file map does not match catalog assets.");
  }
  const values = Object.values(mapping);
  if (values.some((value) => typeof value !== "string" || value.trim() === "")) {
    throw new Error("Cloud file map contains blank cloud file IDs.");
  }
  if (values.some((value) => !value.startsWith("cloud://") || value.slice("cloud://".length).trim() === "")) {
    throw new Error("Cloud file map contains non-cloud references.");
  }
  if (new Set(values).size !== values.length) throw new Error("Cloud file map contains duplicate cloud file IDs.");

  return {
    ...catalog,
    patterns: catalog.patterns.map((pattern) => ({
      ...pattern,
      coverRef: mapping[`gallery/${pattern.id}/${pattern.version}/card`],
      previewRef: mapping[`gallery/${pattern.id}/${pattern.version}/detail`],
      payload: {
        ...pattern.payload,
        fileRef: mapping[`gallery/${pattern.id}/${pattern.version}/payload`],
      },
    })),
  };
}

export async function buildGalleryImport(catalog, readAsset, outputDirectory, cloudFileMap) {
  const issues = await validateCatalog(catalog, readAsset);
  if (issues.length > 0) throw new Error(`Gallery catalog is invalid:\n${issues.map(({ path, message }) => `${path}: ${message}`).join("\n")}`);
  const categories = catalog.categories.slice().sort((left, right) => left.order - right.order || left.id.localeCompare(right.id)).map((item) => ({ _id: `gallery-category:${item.id}@${item.version}`, ...toCategoryImport(item) }));
  const importCatalog = cloudFileMap === undefined ? catalog : resolveCloudAssetRefs(catalog, cloudFileMap);
  const patterns = importCatalog.patterns.slice().sort((left, right) => left.id.localeCompare(right.id) || compareSemanticVersions(left.version, right.version)).map((item) => ({ _id: `gallery-pattern:${item.id}@${item.version}`, ...toPatternImport(item) }));
  await mkdir(outputDirectory, { recursive: true });
  const obsoleteCategoryPath = resolve(outputDirectory, "categories.json");
  const obsoletePatternPath = resolve(outputDirectory, "patterns.json");
  const categoryPath = resolve(outputDirectory, "categories-import.json");
  const patternPath = resolve(outputDirectory, "patterns-import.json");
  await Promise.all([rm(obsoleteCategoryPath, { force: true }), rm(obsoletePatternPath, { force: true })]);
  await Promise.all([
    writeFile(categoryPath, writeJsonLines(categories), "utf8"),
    writeFile(patternPath, writeJsonLines(patterns), "utf8"),
  ]);
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const contentDirectory = resolve(repositoryRoot, "content/gallery");
const outputDirectory = resolve(repositoryRoot, "generated/gallery-import");

async function readCatalogAsset(fileRef) {
  const assetPath = resolve(contentDirectory, fileRef);
  if (relative(contentDirectory, assetPath).startsWith("..")) return null;
  try {
    return await readFile(assetPath, "utf8");
  } catch {
    return null;
  }
}

async function main() {
  const catalog = JSON.parse(await readFile(resolve(contentDirectory, "catalog.json"), "utf8"));
  const cloudFileMap = await readCloudFileMap(process.argv.slice(2));
  await buildGalleryImport(catalog, readCatalogAsset, outputDirectory, cloudFileMap);
  process.stdout.write("Gallery import bundle created.\n");
}

async function readCloudFileMap(arguments_) {
  if (arguments_.length === 0) return undefined;
  if (arguments_.length !== 2 || arguments_[0] !== "--cloud-file-map") {
    throw new Error("Usage: node scripts/gallery/build-gallery-import.mjs [--cloud-file-map <path>].");
  }
  try {
    return JSON.parse(await readFile(arguments_[1], "utf8"));
  } catch {
    throw new Error("Unable to read cloud file map.");
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
