import { ciede2000 } from "./color-space";
import type { MardLabColor } from "./mard-palette";

export function cleanupIsolatedCells(codes: readonly (string | null)[], width: number, height: number, palette: readonly MardLabColor[]): Array<string | null> {
  if (codes.length !== width * height) throw new Error("INVALID_GRID_DATA");
  const colors = new Map(palette.map((color) => [color.code, color]));
  return codes.map((code, index) => {
    if (!code) return null;
    const neighbors = neighborIndexes(index, width, height).map((neighbor) => codes[neighbor]).filter((value): value is string => value !== null);
    if (neighbors.includes(code) || neighbors.length === 0) return code;
    const currentColor = colors.get(code);
    if (!currentColor) return code;
    const candidates = [...new Set(neighbors)].map((neighbor) => colors.get(neighbor)).filter((color): color is MardLabColor => color !== undefined);
    const replacement = candidates.sort((first, second) => ciede2000(currentColor, first) - ciede2000(currentColor, second) || first.code.localeCompare(second.code))[0];
    if (!replacement || ciede2000(currentColor, replacement) > 12) return code;
    return replacement.code;
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
