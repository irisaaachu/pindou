import { describe, expect, test } from "vitest";
import { getMardLabPalette, nearestMardColor, selectPalette, type SampledCell } from "../../src/domain/photo-generation";

const sample = (red: number, green: number, blue: number): SampledCell => ({ red, green, blue, alpha: 255, variance: 0, edgeStrength: 0 });

describe("MARD palette selection", () => {
  test("uses min(limit, distinct useful colors) and remains deterministic", () => {
    const samples = [sample(250, 0, 0), sample(250, 0, 0), sample(0, 250, 0), sample(0, 0, 250)];
    const first = selectPalette(samples, 12);
    expect(first).toHaveLength(3);
    expect(selectPalette(samples, 12)).toEqual(first);
    expect(first.every((entry) => getMardLabPalette().some(({ code }) => code === entry.code))).toBe(true);
  });

  test("selects the requested limit and maps to a selected entry", () => {
    const samples = Array.from({ length: 20 }, (_, index) => sample(index * 12, 255 - index * 10, index * 7));
    const selected = selectPalette(samples, 12);
    expect(selected).toHaveLength(12);
    expect(selected).toContainEqual(nearestMardColor(samples[0], selected));
  });
});
