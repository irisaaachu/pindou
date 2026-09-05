import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { loadPalette } from "../../scripts/gallery/grid-authoring.mjs";
import { syncMardPalette } from "../../scripts/gallery/sync-mard-palette.mjs";

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = resolve(rootDirectory, "content/gallery/palettes/sources/mard-291-29229889.csv");
const registryPath = resolve(rootDirectory, "content/gallery/palettes/mard-221-v2026.09.json");

describe("MARD 221 palette", () => {
  test("loads the pinned 221-color registry with its source identity", () => {
    const palette = loadPalette();

    expect(palette).toMatchObject({
      id: "mard-221",
      version: "2026.09-pinned",
      source: {
        repository: "https://github.com/maxcleme/beadcolors",
        commit: "29229889daab404fb30531d4bb785fd73f7f58e3",
        path: "raw/mard.csv",
        license: "MIT",
      },
    });
    expect(Object.keys(palette.colors)).toHaveLength(221);
    expect(Object.keys(palette.colors).every((code) => /^[ABCDEFGHM]\d+$/.test(code))).toBe(true);
    expect(new Set(Object.keys(palette.colors)).size).toBe(221);
  });

  test("derives allowed MARD codes with normalized RGB values", () => {
    const palette = syncMardPalette("A2,Amber,1,2,3,Asher\nP1,Extended,4,5,6,Asher\nM10,Mauve,255,16,0,Asher\n");

    expect(palette.colors).toEqual({ A2: "#010203", M10: "#FF1000" });
  });

  test("rejects duplicate codes and malformed RGB values", () => {
    expect(() => syncMardPalette("A2,Amber,1,2,3,Asher\nA2,Again,4,5,6,Asher\n")).toThrow(/duplicate/i);
    expect(() => syncMardPalette("A2,Amber,256,2,3,Asher\n")).toThrow(/rgb/i);
  });

  test("reproduces the committed registry from the complete pinned source", async () => {
    const [source, registry] = await Promise.all([readFile(sourcePath), readFile(registryPath)]);
    const derived = Buffer.from(`${JSON.stringify(syncMardPalette(source.toString("utf8")), null, 2)}\n`);

    expect(createHash("sha256").update(source).digest("hex")).toBe("623d229ace064a7ace700489ed98fa35e512300a574d9df2d94c7d01d5114dfa");
    expect(source.toString("utf8").trim().split("\n")).toHaveLength(291);
    expect(Object.keys(syncMardPalette(source.toString("utf8")).colors)).toHaveLength(221);
    expect(derived).toEqual(registry);
    expect(createHash("sha256").update(registry).digest("hex")).toBe("a2967312ba1a8e091217cb10293425fe4528927ed519dfd7861ca9ace3a2d85a");
  });
});
