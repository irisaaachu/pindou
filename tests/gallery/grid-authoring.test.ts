import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import type { MardColorCode } from "../../scripts/gallery/grid-authoring.mjs";

import {
  collectColorIds,
  countBeads,
  createGrid,
  drawLine,
  drawRect,
  loadPalette,
  placeGlyph,
  setCell,
} from "../../scripts/gallery/grid-authoring.mjs";

const galleryDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../content/gallery");
const glyphRegistry = JSON.parse(await readFile(resolve(galleryDirectory, "glyphs/pindou-hanzi-12-v1.json"), "utf8"));
const requiredCharacters = [..."内有萌犬快递挡在门口脱离苦海发大财"];

describe("pilot grid authoring", () => {
  test("creates frozen row-major grids without changing prior output", () => {
    const empty = createGrid(3, 2);
    const filled = setCell(empty, 2, 1, "F12");

    expect(empty).toEqual({ width: 3, height: 2, cells: [null, null, null, null, null, null] });
    expect(filled.cells).toEqual([null, null, null, null, null, "F12"]);
    expect(Object.isFrozen(empty)).toBe(true);
    expect(Object.isFrozen(empty.cells)).toBe(true);
    const mutableCells = empty.cells as MardColorCode[];
    expect(() => { mutableCells[0] = "B6"; }).toThrow();
  });

  test("rejects cells outside the grid bounds", () => {
    const grid = createGrid(2, 2);

    expect(() => setCell(grid, -1, 0, "coral")).toThrow(/bounds/i);
    expect(() => setCell(grid, 0, 2, "coral")).toThrow(/bounds/i);
  });

  test("draws inclusive horizontal and vertical lines", () => {
    const horizontal = drawLine(createGrid(5, 3), 1, 1, 3, 1, "B6");
    const vertical = drawLine(createGrid(3, 5), 1, 1, 1, 3, "A26");

    expect(horizontal.cells).toEqual([
      null, null, null, null, null,
      null, "B6", "B6", "B6", null,
      null, null, null, null, null,
    ]);
    expect(vertical.cells).toEqual([
      null, null, null,
      null, "A26", null,
      null, "A26", null,
      null, "A26", null,
      null, null, null,
    ]);
  });

  test("fills rectangles and can restore transparent cells", () => {
    const filled = drawRect(createGrid(4, 3), 1, 1, 2, 2, "E2");
    const transparent = setCell(filled, 2, 2, null);

    expect(filled.cells).toEqual([
      null, null, null, null,
      null, "E2", "E2", null,
      null, "E2", "E2", null,
    ]);
    expect(transparent.cells[10]).toBeNull();
    expect(filled.cells[10]).toBe("E2");
  });

  test("rejects unknown palette colors", () => {
    expect(() => setCell(createGrid(1, 1), 0, 0, "not-a-mard-code" as MardColorCode)).toThrow(/color/i);
  });

  test("loads the pinned MARD palette", () => {
    expect(loadPalette()).toMatchObject({
      id: "mard-221",
      version: "2026.09-pinned",
      colors: expect.objectContaining({ A1: expect.any(String), M15: expect.any(String) }),
    });
  });

  test("rejects an unknown glyph", () => {
    expect(() => placeGlyph(createGrid(12, 12), glyphRegistry, "猫", 0, 0, "H7")).toThrow(/glyph/i);
  });

  test("places every required Hanzi glyph at its exact row-major offset", () => {
    const grid = requiredCharacters.reduce(
      (current, character, index) => placeGlyph(current, glyphRegistry, character, index * 12, 0, "H7"),
      createGrid(requiredCharacters.length * 12, 12),
    );
    const expected = Array(requiredCharacters.length * 12 * 12).fill(null);

    requiredCharacters.forEach((character, characterIndex) => {
      glyphRegistry.glyphs[character].forEach((row: string, y: number) => {
        [...row].forEach((bit, x) => {
          if (bit === "1") expected[y * grid.width + characterIndex * 12 + x] = "H7";
        });
      });
    });

    expect(grid.cells).toEqual(expected);
    expect(countBeads(grid)).toBe(expected.filter((cell) => cell !== null).length);
    expect(collectColorIds(grid)).toEqual(["H7"]);
  });
});
