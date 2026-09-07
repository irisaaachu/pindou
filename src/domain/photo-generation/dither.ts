import type { MardLabColor } from "./mard-palette";
import { nearestMardColor } from "./palette-selection";
import type { SampledCell } from "./sample";

export function ditherAndMap(cells: readonly (SampledCell | null)[], width: number, height: number, palette: readonly MardLabColor[], enabled: boolean): Array<string | null> {
  if (cells.length !== width * height) throw new Error("INVALID_GRID_DATA");
  const working = cells.map((cell) => cell ? [cell.red, cell.green, cell.blue] : null);
  const result: Array<string | null> = Array(cells.length).fill(null);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const index = y * width + x, pixel = working[index];
    if (!pixel) continue;
    const color = nearestMardColor({ red: clamp(pixel[0]), green: clamp(pixel[1]), blue: clamp(pixel[2]) }, palette);
    result[index] = color.code;
    if (!enabled) continue;
    const error = [pixel[0] - color.red, pixel[1] - color.green, pixel[2] - color.blue];
    diffuse(working, width, height, x + 1, y, error, 7 / 16);
    diffuse(working, width, height, x - 1, y + 1, error, 3 / 16);
    diffuse(working, width, height, x, y + 1, error, 5 / 16);
    diffuse(working, width, height, x + 1, y + 1, error, 1 / 16);
  }
  return result;
}

function diffuse(data: Array<number[] | null>, width: number, height: number, x: number, y: number, error: number[], factor: number): void {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const target = data[y * width + x];
  if (target) for (let channel = 0; channel < 3; channel += 1) target[channel] += error[channel] * factor;
}
const clamp = (value: number) => Math.max(0, Math.min(255, value));
