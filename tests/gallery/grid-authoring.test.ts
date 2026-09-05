import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

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
    const filled = setCell(empty, 2, 1, "coral");

    expect(empty).toEqual({ width: 3, height: 2, cells: [null, null, null, null, null, null] });
    expect(filled.cells).toEqual([null, null, null, null, null, "coral"]);
    expect(Object.isFrozen(empty)).toBe(true);
    expect(Object.isFrozen(empty.cells)).toBe(true);
    expect(() => { empty.cells[0] = "mint"; }).toThrow();
  });

  test("rejects cells outside the grid bounds", () => {
    const grid = createGrid(2, 2);

    expect(() => setCell(grid, -1, 0, "coral")).toThrow(/bounds/i);
    expect(() => setCell(grid, 0, 2, "coral")).toThrow(/bounds/i);
  });

  test("draws inclusive horizontal and vertical lines", () => {
    const horizontal = drawLine(createGrid(5, 3), 1, 1, 3, 1, "mint");
    const vertical = drawLine(createGrid(3, 5), 1, 1, 1, 3, "gold");

    expect(horizontal.cells).toEqual([
      null, null, null, null, null,
      null, "mint", "mint", "mint", null,
      null, null, null, null, null,
    ]);
    expect(vertical.cells).toEqual([
      null, null, null,
      null, "gold", null,
      null, "gold", null,
      null, "gold", null,
      null, null, null,
    ]);
  });

  test("fills rectangles and can restore transparent cells", () => {
    const filled = drawRect(createGrid(4, 3), 1, 1, 2, 2, "blush");
    const transparent = setCell(filled, 2, 2, null);

    expect(filled.cells).toEqual([
      null, null, null, null,
      null, "blush", "blush", null,
      null, "blush", "blush", null,
    ]);
    expect(transparent.cells[10]).toBeNull();
    expect(filled.cells[10]).toBe("blush");
  });

  test("rejects unknown palette colors", () => {
    expect(() => setCell(createGrid(1, 1), 0, 0, "not-a-pilot-color")).toThrow(/color/i);
  });

  test("loads the stable pilot palette", () => {
    expect(loadPalette()).toMatchObject({
      id: "pindou-soft-original",
      version: "1.0.0",
      colors: expect.objectContaining({ cream: expect.any(String), charcoal: expect.any(String) }),
    });
  });

  test("rejects an unknown glyph", () => {
    expect(() => placeGlyph(createGrid(12, 12), glyphRegistry, "猫", 0, 0, "charcoal")).toThrow(/glyph/i);
  });

  test("places every required Hanzi glyph at its exact row-major offset", () => {
    const grid = requiredCharacters.reduce(
      (current, character, index) => placeGlyph(current, glyphRegistry, character, index * 12, 0, "charcoal"),
      createGrid(requiredCharacters.length * 12, 12),
    );
    const expected = Array(requiredCharacters.length * 12 * 12).fill(null);

    requiredCharacters.forEach((character, characterIndex) => {
      glyphRegistry.glyphs[character].forEach((row: string, y: number) => {
        [...row].forEach((bit, x) => {
          if (bit === "1") expected[y * grid.width + characterIndex * 12 + x] = "charcoal";
        });
      });
    });

    expect(grid.cells).toEqual(expected);
    expect(countBeads(grid)).toBe(expected.filter((cell) => cell !== null).length);
    expect(collectColorIds(grid)).toEqual(["charcoal"]);
  });
});
