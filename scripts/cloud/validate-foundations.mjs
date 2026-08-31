import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  EXPECTED_COLLECTIONS,
  validateFoundationSchemas,
} from "./foundation-contract.mjs";

const databaseDirectory = resolve(process.cwd(), "uniCloud-aliyun/database");
const schemas = {};

for (const collection of EXPECTED_COLLECTIONS) {
  const path = resolve(databaseDirectory, `${collection}.schema.json`);
  schemas[collection] = JSON.parse(await readFile(path, "utf8"));
}

const issues = validateFoundationSchemas(schemas);
if (issues.length > 0) {
  for (const issue of issues) console.error(issue);
  process.exitCode = 1;
} else {
  console.log(`Validated ${EXPECTED_COLLECTIONS.length} uniCloud collection schemas.`);
}
