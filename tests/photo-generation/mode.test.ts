import { describe, expect, test } from "vitest";
import { recommendMode, type SampledCell } from "../../src/domain/photo-generation";

const cell = (variance: number, edgeStrength: number, red = 100): SampledCell => ({ red, green: red, blue: red, alpha: 255, variance, edgeStrength });

describe("recommendMode", () => {
  test("recommends cartoon for flat regions and realistic for continuous gradients", () => {
    expect(recommendMode([cell(10, 45), cell(8, 50), cell(12, 40)])).toBe("cartoon");
    expect(recommendMode([cell(700, 8, 20), cell(900, 10, 100), cell(800, 9, 180)])).toBe("realistic");
  });
});
