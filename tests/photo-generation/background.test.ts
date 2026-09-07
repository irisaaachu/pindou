import { expect, test } from "vitest";
import { removeEdgeConnectedBackground, type SampledCell } from "../../src/domain/photo-generation";

const cell = (red: number, variance = 0): SampledCell => ({ red, green: red, blue: red, alpha: 255, variance, edgeStrength: 0 });

test("removes only low-variance edge-connected background", () => {
  const cells = Array.from({ length: 25 }, () => cell(250));
  for (const index of [6, 7, 8, 11, 13, 16, 17, 18]) cells[index] = cell(30);
  cells[12] = cell(250);
  cells[2] = cell(250, 1000);
  const result = removeEdgeConnectedBackground(cells, 5, 5);
  expect(result[0]).toBeNull();
  expect(result[12]).not.toBeNull();
  expect(result[2]).not.toBeNull();
});
