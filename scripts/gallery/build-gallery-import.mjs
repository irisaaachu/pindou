import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { compareSemanticVersions, toCategoryImport, toPatternImport, validateCatalog } from "./gallery-contract.mjs";

export async function buildGalleryImport(catalog, readAsset, outputDirectory) {
  const issues = await validateCatalog(catalog, readAsset);
  if (issues.length > 0) throw new Error(`Gallery catalog is invalid:\n${issues.map(({ path, message }) => `${path}: ${message}`).join("\n")}`);
  const categories = catalog.categories.slice().sort((left, right) => left.order - right.order || left.id.localeCompare(right.id)).map(toCategoryImport);
  const patterns = catalog.patterns.slice().sort((left, right) => left.id.localeCompare(right.id) || compareSemanticVersions(left.version, right.version)).map(toPatternImport);
  await mkdir(outputDirectory, { recursive: true });
  const categoryPath = resolve(outputDirectory, "categories.json");
  const patternPath = resolve(outputDirectory, "patterns.json");
  await Promise.all([rm(categoryPath, { force: true }), rm(patternPath, { force: true })]);
  await Promise.all([
    writeFile(categoryPath, `${JSON.stringify(categories, null, 2)}\n`, "utf8"),
    writeFile(patternPath, `${JSON.stringify(patterns, null, 2)}\n`, "utf8"),
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
  await buildGalleryImport(catalog, readCatalogAsset, outputDirectory);
  process.stdout.write("Gallery import bundle created.\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
