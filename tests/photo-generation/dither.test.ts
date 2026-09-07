import { expect, test } from "vitest";
import { ditherAndMap, getMardLabPalette, type SampledCell } from "../../src/domain/photo-generation";

const sample = (value: number): SampledCell => ({ red: value, green: value, blue: value, alpha: 255, variance: 0, edgeStrength: 0 });

test("maps directly when disabled and deterministically within the selected palette when enabled", () => {
  const palette = [getMardLabPalette()[0], getMardLabPalette().find(({ code }) => code === "H2")!];
  const cells = [sample(40), sample(120), sample(180), sample(240)];
  const direct = ditherAndMap(cells, 2, 2, palette, false);
  const first = ditherAndMap(cells, 2, 2, palette, true);
  expect(direct).toHaveLength(4);
  expect(ditherAndMap(cells, 2, 2, palette, true)).toEqual(first);
  expect(first.every((code) => palette.some((color) => color.code === code))).toBe(true);
});
