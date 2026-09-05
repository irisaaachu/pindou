import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const defaultPalettePath = fileURLToPath(new URL("../../content/gallery/palettes/mard-221-v2026.09.json", import.meta.url));
const defaultPalette = loadPalette();
const colorIds = new Set(Object.keys(defaultPalette.colors));

export function loadPalette(filePath = defaultPalettePath) {
  const palette = JSON.parse(readFileSync(filePath, "utf8"));
  if (!isRecord(palette) || !isRecord(palette.colors)) throw new Error("Palette must define colors.");
  return freezePalette(palette);
}

export function createGrid(width, height) {
  if (!isPositiveInteger(width) || !isPositiveInteger(height)) throw new Error("Grid dimensions must be positive integers.");
  return freezeGrid(width, height, Array(width * height).fill(null));
}

export function setCell(grid, x, y, colorId) {
  assertGrid(grid);
  assertPoint(grid, x, y);
  assertColor(colorId);
  const cells = [...grid.cells];
  cells[y * grid.width + x] = colorId;
  return freezeGrid(grid.width, grid.height, cells);
}

export function drawLine(grid, startX, startY, endX, endY, colorId) {
  assertGrid(grid);
  assertPoint(grid, startX, startY);
  assertPoint(grid, endX, endY);
  assertColor(colorId);
  if (startX !== endX && startY !== endY) throw new Error("Lines must be horizontal or vertical.");
  const cells = [...grid.cells];
  const stepX = Math.sign(endX - startX);
  const stepY = Math.sign(endY - startY);
  for (let x = startX, y = startY; ; x += stepX, y += stepY) {
    cells[y * grid.width + x] = colorId;
    if (x === endX && y === endY) break;
  }
  return freezeGrid(grid.width, grid.height, cells);
}

export function drawRect(grid, x, y, width, height, colorId) {
  assertGrid(grid);
  if (!isPositiveInteger(width) || !isPositiveInteger(height)) throw new Error("Rectangle dimensions must be positive integers.");
  assertPoint(grid, x, y);
  assertPoint(grid, x + width - 1, y + height - 1);
  assertColor(colorId);
  const cells = [...grid.cells];
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) cells[row * grid.width + column] = colorId;
  }
  return freezeGrid(grid.width, grid.height, cells);
}

export function placeGlyph(grid, glyphRegistry, glyphId, x, y, colorId) {
  assertGrid(grid);
  assertColor(colorId);
  if (!isRecord(glyphRegistry) || !isRecord(glyphRegistry.glyphs) || !Array.isArray(glyphRegistry.glyphs[glyphId])) throw new Error(`Unknown glyph: ${glyphId}.`);
  const glyph = glyphRegistry.glyphs[glyphId];
  const glyphWidth = glyphRegistry.width;
  const glyphHeight = glyphRegistry.height;
  if (!isPositiveInteger(glyphWidth) || !isPositiveInteger(glyphHeight) || glyph.length !== glyphHeight || glyph.some((row) => typeof row !== "string" || !new RegExp(`^[01]{${glyphWidth}}$`).test(row))) throw new Error(`Glyph is invalid: ${glyphId}.`);
  assertPoint(grid, x, y);
  assertPoint(grid, x + glyphWidth - 1, y + glyphHeight - 1);
  const cells = [...grid.cells];
  glyph.forEach((row, glyphY) => {
    [...row].forEach((bit, glyphX) => {
      if (bit === "1") cells[(y + glyphY) * grid.width + x + glyphX] = colorId;
    });
  });
  return freezeGrid(grid.width, grid.height, cells);
}

export function countBeads(grid) {
  assertGrid(grid);
  return grid.cells.filter((cell) => cell !== null).length;
}

export function collectColorIds(grid) {
  assertGrid(grid);
  return [...new Set(grid.cells.filter((cell) => cell !== null))].sort();
}

function assertGrid(grid) {
  if (!isRecord(grid) || !isPositiveInteger(grid.width) || !isPositiveInteger(grid.height) || !Array.isArray(grid.cells) || grid.cells.length !== grid.width * grid.height) throw new Error("Grid is invalid.");
}

function assertPoint(grid, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= grid.width || y >= grid.height) throw new Error("Cell is outside grid bounds.");
}

function assertColor(colorId) {
  if (colorId !== null && (!isNonEmptyString(colorId) || !colorIds.has(colorId))) throw new Error(`Unknown palette color: ${colorId}.`);
}

function freezeGrid(width, height, cells) {
  return Object.freeze({ width, height, cells: Object.freeze(cells) });
}

function freezePalette(palette) {
  return Object.freeze({ ...palette, colors: Object.freeze({ ...palette.colors }) });
}

function isPositiveInteger(value) { return Number.isInteger(value) && value > 0; }
function isNonEmptyString(value) { return typeof value === "string" && value.length > 0; }
function isRecord(value) { return typeof value === "object" && value !== null && !Array.isArray(value); }
