import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createPilotPatterns } from "../../content/gallery/designs/pilot-patterns.mjs";
import { loadPalette } from "./grid-authoring.mjs";
import { renderPatternPng } from "./render-pattern-png.mjs";

const defaultPayloadRoot = fileURLToPath(new URL("../../content/gallery/payloads", import.meta.url));
const defaultPreviewRoot = fileURLToPath(new URL("../../content/gallery/previews", import.meta.url));

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

export async function buildPilotContent({ payloadRoot = defaultPayloadRoot, previewRoot = defaultPreviewRoot } = {}) {
  const patterns = await buildPilotPayloads(payloadRoot);
  const palette = loadPalette();
  await Promise.all([mkdir(`${previewRoot}/card`, { recursive: true }), mkdir(`${previewRoot}/detail`, { recursive: true })]);

  for (const pattern of patterns) {
    await writeFile(`${previewRoot}/card/${pattern.contentId}-v1.png`, renderPatternPng(pattern, palette, {
      pixelsPerCell: 8,
      showCoordinates: false,
      majorGuideEvery: 10,
      pegboardSize: 29,
    }));
    await writeFile(`${previewRoot}/detail/${pattern.contentId}-v1.png`, renderPatternPng(pattern, palette, {
      pixelsPerCell: 32,
      showCoordinates: true,
      majorGuideEvery: 10,
      pegboardSize: 29,
    }));
  }
  return patterns;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--payloads-only")) await buildPilotPayloads();
  else await buildPilotContent();
}
