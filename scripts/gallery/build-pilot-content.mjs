import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createPilotPatterns } from "../../content/gallery/designs/pilot-patterns.mjs";

const defaultPayloadRoot = fileURLToPath(new URL("../../content/gallery/payloads", import.meta.url));

export async function buildPilotPayloads(outputRoot = defaultPayloadRoot) {
  await mkdir(outputRoot, { recursive: true });
  const patterns = createPilotPatterns();
  await Promise.all(patterns.map((pattern) => writeFile(
    `${outputRoot}/${pattern.contentId}-v1.json`,
    `${JSON.stringify(pattern, null, 2)}\n`,
    "utf8",
  )));
  return patterns;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildPilotPayloads();
}
