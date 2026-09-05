import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validatePublishedCatalog } from "./gallery-contract.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const contentDirectory = resolve(repositoryRoot, "content/gallery");

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
  const issues = await validatePublishedCatalog(catalog, readCatalogAsset);
  if (issues.length > 0) {
    process.stderr.write(`${JSON.stringify(issues, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write("Gallery catalog is valid.\n");
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
