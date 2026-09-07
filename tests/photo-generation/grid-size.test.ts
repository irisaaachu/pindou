import { describe, expect, test } from "vitest";

import { calculateGridSize } from "../../src/domain/photo-generation";

describe("calculateGridSize", () => {
  test("preserves a landscape crop aspect ratio at the selected short side", () => {
    expect(calculateGridSize(1600, 900, 58)).toEqual({ width: 103, height: 58 });
  });

  test("preserves a portrait crop aspect ratio at the selected short side", () => {
    expect(calculateGridSize(900, 1600, 29)).toEqual({ width: 29, height: 52 });
  });

  test("rejects a crop with a zero dimension", () => {
    expect(() => calculateGridSize(0, 900, 58)).toThrow("INVALID_CROP_SIZE");
  });

  test.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects an invalid crop dimension of %s",
    (dimension) => {
      expect(() => calculateGridSize(dimension, 900, 58)).toThrow("INVALID_CROP_SIZE");
      expect(() => calculateGridSize(900, dimension, 58)).toThrow("INVALID_CROP_SIZE");
    },
  );

  test("rejects a short side outside the supported presets", () => {
    expect(() => calculateGridSize(900, 900, 30 as 29)).toThrow("INVALID_SHORT_SIDE");
  });
});
