import { ciede2000, rgbToLab } from "./color-space";
import type { SampledCell } from "./sample";

export function removeEdgeConnectedBackground(cells: readonly SampledCell[], width: number, height: number): Array<SampledCell | null> {
  if (cells.length !== width * height) throw new Error("INVALID_GRID_DATA");
  const edge = cells.filter((_, index) => index < width || index >= width * (height - 1) || index % width === 0 || index % width === width - 1);
  const reference = edge.reduce((sum, cell) => ({ red: sum.red + cell.red, green: sum.green + cell.green, blue: sum.blue + cell.blue }), { red: 0, green: 0, blue: 0 });
  const referenceLab = rgbToLab(reference.red / edge.length, reference.green / edge.length, reference.blue / edge.length);
  const removable = (index: number) => cells[index].variance < 400 && ciede2000(rgbToLab(cells[index].red, cells[index].green, cells[index].blue), referenceLab) <= 12;
  const removed = new Set<number>();
  const queue: number[] = [];
  for (let index = 0; index < cells.length; index += 1) {
    const isEdge = index < width || index >= width * (height - 1) || index % width === 0 || index % width === width - 1;
    if (isEdge && removable(index)) { removed.add(index); queue.push(index); }
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor], x = index % width, y = Math.floor(index / width);
    for (const next of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const [nx, ny] = next;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const candidate = ny * width + nx;
      if (!removed.has(candidate) && removable(candidate)) { removed.add(candidate); queue.push(candidate); }
    }
  }
  return cells.map((cell, index) => removed.has(index) ? null : cell);
}
