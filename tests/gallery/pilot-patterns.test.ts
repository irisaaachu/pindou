import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import { buildPilotPayloads } from "../../scripts/gallery/build-pilot-content.mjs";
import { loadPalette } from "../../scripts/gallery/grid-authoring.mjs";

const payloadDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../content/gallery/payloads");
const temporaryDirectories: string[] = [];

type ExpectedPattern = {
  id: string;
  dimensions: [number, number];
  regions: Array<{ id: string; defaultText: string; x: number; y: number }>;
  intentionalBackground?: { x: number; y: number };
  cornerCells?: Array<[number, number]>;
  beadCount: number;
};

const expectedPatterns: ExpectedPattern[] = [
  {
    id: "inside-cute-dog-sign",
    dimensions: [58, 29],
    regions: [{ id: "message", defaultText: "内有萌犬", x: 27, y: 3 }],
    intentionalBackground: { x: 3, y: 3 },
    beadCount: 1346,
  },
  {
    id: "delivery-block-door-sign",
    dimensions: [58, 29],
    regions: [{ id: "message", defaultText: "快递挡在门口", x: 7, y: 2 }],
    intentionalBackground: { x: 1, y: 1 },
    beadCount: 1512,
  },
  {
    id: "birthday-dog-cake-bouquet",
    dimensions: [29, 29],
    regions: [],
    cornerCells: [[1, 1], [27, 1], [1, 27], [27, 27]],
    beadCount: 725,
  },
  {
    id: "farewell-fortune-sign",
    dimensions: [58, 29],
    regions: [
      { id: "farewell", defaultText: "脱离苦海", x: 5, y: 3 },
      { id: "fortune", defaultText: "发大财", x: 11, y: 16 },
    ],
    intentionalBackground: { x: 3, y: 3 },
    beadCount: 1346,
  },
];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("pilot gallery patterns", () => {
  test("generates the four original payload shapes with their intended text regions", async () => {
    const outputDirectory = await mkdtemp(resolve(tmpdir(), "pilot-payloads-"));
    temporaryDirectories.push(outputDirectory);

    await buildPilotPayloads(outputDirectory);

    for (const expected of expectedPatterns) {
      const payload = JSON.parse(await readFile(resolve(outputDirectory, `${expected.id}-v1.json`), "utf8"));
      const palette = loadPalette();

      expect(payload).toMatchObject({
        format: "pindou-gallery-pattern",
        formatVersion: 1,
        contentId: expected.id,
        contentVersion: "1.0.0",
        width: expected.dimensions[0],
        height: expected.dimensions[1],
        direction: "normal",
      });
      expect(payload.cells).toHaveLength(payload.width * payload.height);
      expect(payload.cells.some((cell: string | null) => cell !== null)).toBe(true);
      expect(payload.cells.filter((cell: string | null) => cell !== null)).toEqual(expect.arrayContaining([expect.any(String)]));
      expect(payload.palette).toEqual({ id: "mard-221", version: "2026.09-pinned" });
      expect(payload.cells.filter(Boolean).every((code: string) => code in palette.colors)).toBe(true);
      expect(new Set(payload.cells.filter(Boolean)).size).toBeLessThanOrEqual(11);
      expect(payload.editableTextRegions.every(
        (region: { colorId: string }) => region.colorId in palette.colors,
      )).toBe(true);
      expect(payload.editableTextRegions.map((region: { id: string; defaultText: string; x: number; y: number }) => ({ id: region.id, defaultText: region.defaultText, x: region.x, y: region.y }))).toEqual(expected.regions);
      expect(payload.editableTextRegions.every((region: { x: number; y: number }) => region.x >= 0 && region.x < payload.width && region.y >= 0 && region.y < payload.height)).toBe(true);
      expect(payload.cells.filter(Boolean)).toHaveLength(expected.beadCount);

      if (expected.cornerCells) {
        for (const [x, y] of expected.cornerCells) expect(payload.cells[y * payload.width + x]).toBeNull();
      }
      if (expected.intentionalBackground) {
        const { x, y } = expected.intentionalBackground;
        expect(payload.cells[y * payload.width + x]).not.toBeNull();
      }
    }
  });

  test("rebuilds byte-identical LF payloads that match the committed files", async () => {
    const firstDirectory = await mkdtemp(resolve(tmpdir(), "pilot-payloads-"));
    const secondDirectory = await mkdtemp(resolve(tmpdir(), "pilot-payloads-"));
    temporaryDirectories.push(firstDirectory, secondDirectory);

    await buildPilotPayloads(firstDirectory);
    await buildPilotPayloads(secondDirectory);

    for (const expected of expectedPatterns) {
      const filename = `${expected.id}-v1.json`;
      const [first, second, committed] = await Promise.all([
        readFile(resolve(firstDirectory, filename)),
        readFile(resolve(secondDirectory, filename)),
        readFile(resolve(payloadDirectory, filename)),
      ]);

      expect(first.equals(second)).toBe(true);
      expect(first.equals(committed)).toBe(true);
      expect(first.toString("utf8")).toMatch(/\n$/);
      expect(first.toString("utf8")).not.toContain("\r\n");
    }
  });
});
