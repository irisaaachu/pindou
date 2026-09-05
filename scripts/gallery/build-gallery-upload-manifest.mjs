import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validatePublishedCatalog } from "./gallery-contract.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const contentDirectory = resolve(repositoryRoot, "content/gallery");
const outputDirectory = resolve(repositoryRoot, "generated/gallery-import");

export async function buildGalleryUploadManifest(catalog, readAsset, destination) {
  const issues = await validatePublishedCatalog(catalog, readAsset);
  if (issues.length > 0) throw new Error(`Gallery catalog is invalid:\n${issues.map(({ path, message }) => `${path}: ${message}`).join("\n")}`);
  const assets = catalog.patterns.flatMap((pattern) => [
    { logicalKey: `gallery/${pattern.id}/${pattern.version}/payload`, path: `content/gallery/${pattern.payload.fileRef}` },
    { logicalKey: `gallery/${pattern.id}/${pattern.version}/card`, path: `content/gallery/${pattern.coverRef}` },
    { logicalKey: `gallery/${pattern.id}/${pattern.version}/detail`, path: `content/gallery/${pattern.previewRef}` },
  ]);
  const manifest = { assets };
  await mkdir(destination, { recursive: true });
  await writeFile(resolve(destination, "asset-upload-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

async function readCatalogAsset(fileRef) {
  const assetPath = resolve(contentDirectory, fileRef);
  if (relative(contentDirectory, assetPath).startsWith("..")) return null;
  try {
    return await readFile(assetPath);
  } catch {
    return null;
  }
}

async function main() {
  const catalog = JSON.parse(await readFile(resolve(contentDirectory, "catalog.json"), "utf8"));
  await buildGalleryUploadManifest(catalog, readCatalogAsset, outputDirectory);
  process.stdout.write("Gallery upload manifest created.\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
