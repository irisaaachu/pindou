import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  EXPECTED_COLLECTIONS,
  validateFoundationSchemas,
} from "./foundation-contract.mjs";

const databaseDirectory = resolve(process.cwd(), "uniCloud-aliyun/database");
const schemas = {};
const issues = [];

const officialPackages = [
  ["uniCloud-aliyun/cloudfunctions/uni-id-co", "uni-id-co"],
  ["uniCloud-aliyun/cloudfunctions/common/uni-id-common", "uni-id-common"],
  ["uniCloud-aliyun/cloudfunctions/common/uni-config-center", "uni-config-center"],
  ["uniCloud-aliyun/cloudfunctions/common/uni-open-bridge-common", "uni-open-bridge-common"],
  ["uniCloud-aliyun/cloudfunctions/common/uni-captcha", "uni-captcha"],
  ["uniCloud-aliyun/cloudfunctions/common/uni-cloud-s2s", "uni-cloud-s2s"],
];
const requiredProfileFiles = [
  "uniCloud-aliyun/cloudfunctions/pindou-profile/index.obj.js",
  "uniCloud-aliyun/cloudfunctions/pindou-profile/package.json",
  "uniCloud-aliyun/cloudfunctions/pindou-profile/profile-core.js",
];
const realConfigPath =
  "uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json";

async function exists(path) {
  try {
    await access(resolve(process.cwd(), path));
    return true;
  } catch {
    return false;
  }
}

for (const collection of EXPECTED_COLLECTIONS) {
  const path = resolve(databaseDirectory, `${collection}.schema.json`);
  schemas[collection] = JSON.parse(await readFile(path, "utf8"));
}

issues.push(...validateFoundationSchemas(schemas));

const availablePackages = new Set(officialPackages.map(([, name]) => name));
for (const [directory, expectedName] of officialPackages) {
  const packagePath = `${directory}/package.json`;
  if (!(await exists(packagePath))) {
    issues.push(`Missing official package: ${packagePath}`);
    continue;
  }
  const packageJson = JSON.parse(await readFile(resolve(process.cwd(), packagePath), "utf8"));
  if (packageJson.name !== expectedName) issues.push(`Unexpected package name: ${packagePath}`);
  for (const [name, value] of Object.entries(packageJson.dependencies ?? {})) {
    if (typeof value === "string" && value.startsWith("file:") && !availablePackages.has(name)) {
      issues.push(`Missing common dependency ${name} required by ${packagePath}`);
    }
  }
}

for (const path of requiredProfileFiles) {
  if (!(await exists(path))) issues.push(`Missing Pindou profile file: ${path}`);
}

const gitignore = (await readFile(resolve(process.cwd(), ".gitignore"), "utf8"))
  .split(/\r?\n/)
  .map((line) => line.trim());
if (!gitignore.includes(realConfigPath)) issues.push(`Secret path is not ignored: ${realConfigPath}`);
if (await exists(realConfigPath)) issues.push(`Ignored secret config must remain absent: ${realConfigPath}`);

if (issues.length > 0) {
  for (const issue of issues) console.error(issue);
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${EXPECTED_COLLECTIONS.length} Pindou schemas, ${officialPackages.length} official packages and ${requiredProfileFiles.length} profile files.`,
  );
}
