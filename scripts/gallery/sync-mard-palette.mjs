import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const allowedSeries = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "M"]);
const defaultSourcePath = fileURLToPath(new URL("../../content/gallery/palettes/sources/mard-291-29229889.csv", import.meta.url));
const outputPath = fileURLToPath(new URL("../../content/gallery/palettes/mard-221-v2026.09.json", import.meta.url));

export function syncMardPalette(csvText) {
  if (typeof csvText !== "string") throw new Error("MARD CSV must be text.");
  const colors = {};
  const codes = new Set();

  for (const [index, line] of csvText.trim().split(/\r?\n/).entries()) {
    const fields = line.split(",");
    if (fields.length !== 6) throw new Error(`MARD row ${index + 1} must have six fields.`);
    const [code, name, red, green, blue, contributor] = fields.map((field) => field.trim());
    if (!/^[A-Z]+\d+$/.test(code) || !name || !contributor) throw new Error(`MARD row ${index + 1} is malformed.`);
    if (codes.has(code)) throw new Error(`Duplicate MARD code: ${code}.`);
    codes.add(code);
    const rgb = [red, green, blue].map((value) => Number(value));
    if (rgb.some((value, rgbIndex) => !/^\d+$/.test([red, green, blue][rgbIndex]) || value < 0 || value > 255)) throw new Error(`MARD row ${index + 1} has invalid RGB.`);
    const series = code.match(/^[A-Z]+/)[0];
    if (allowedSeries.has(series)) colors[code] = `#${rgb.map((value) => value.toString(16).padStart(2, "0").toUpperCase()).join("")}`;
  }

  return freezePalette({
    id: "mard-221",
    version: "2026.09-pinned",
    source: {
      repository: "https://github.com/maxcleme/beadcolors",
      commit: "29229889daab404fb30531d4bb785fd73f7f58e3",
      path: "raw/mard.csv",
      license: "MIT",
    },
    colors: Object.fromEntries(Object.entries(colors).sort(([left], [right]) => left.localeCompare(right, "en", { numeric: true }))),
  });
}

function freezePalette(palette) {
  return Object.freeze({ ...palette, source: Object.freeze({ ...palette.source }), colors: Object.freeze({ ...palette.colors }) });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 4) throw new Error("Usage: node scripts/gallery/sync-mard-palette.mjs [csv-path] [output-path]");
  const sourcePath = process.argv[2] ?? defaultSourcePath;
  const destinationPath = process.argv[3] ?? outputPath;
  const palette = syncMardPalette(readFileSync(sourcePath, "utf8"));
  if (Object.keys(palette.colors).length !== 221) throw new Error("MARD palette must contain exactly 221 colors before writing.");
  writeFileSync(destinationPath, `${JSON.stringify(palette, null, 2)}\n`, "utf8");
}
