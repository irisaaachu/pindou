import { ciede2000 } from "./color-space";
import type { MardLabColor } from "./mard-palette";

export function cleanupIsolatedCells(codes: readonly (string | null)[], width: number, height: number, palette: readonly MardLabColor[]): Array<string | null> {
  if (codes.length !== width * height) throw new Error("INVALID_GRID_DATA");
  const colors = new Map(palette.map((color) => [color.code, color]));
  return codes.map((code, index) => {
    if (!code) return null;
    const neighbors = neighborIndexes(index, width, height).map((neighbor) => codes[neighbor]).filter((value): value is string => value !== null);
    if (neighbors.includes(code) || neighbors.length === 0) return code;
    const counts = new Map<string, number>();
    for (const neighbor of neighbors) counts.set(neighbor, (counts.get(neighbor) ?? 0) + 1);
    const replacement = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    const currentColor = colors.get(code), replacementColor = colors.get(replacement);
    if (!currentColor || !replacementColor || ciede2000(currentColor, replacementColor) > 12) return code;
    return replacement;
  });
}

function neighborIndexes(index: number, width: number, height: number): number[] {
  const x = index % width, y = Math.floor(index / width), result: number[] = [];
  if (x > 0) result.push(index - 1);
  if (x + 1 < width) result.push(index + 1);
  if (y > 0) result.push(index - width);
  if (y + 1 < height) result.push(index + width);
  return result;
}
