import { describe, expect, test } from "vitest";
import { sampleRegions } from "../../src/domain/photo-generation/sample";
import type { PhotoInput } from "../../src/domain/photo-generation";

function image(pixels: number[][]): PhotoInput {
  return { width: 4, height: 4, source: "album", data: new Uint8ClampedArray(pixels.flat()) };
}

const crop = { x: 0, y: 0, width: 4, height: 4, scale: 1, translateX: 0, translateY: 0, ratioMode: "original" as const };

describe("sampleRegions", () => {
  test("realistic sampling averages every source pixel in each region", () => {
    const input = image(Array.from({ length: 16 }, (_, index) => [index * 10, index * 10, index * 10, 255]));
    const result = sampleRegions(input, crop, 2, 2, "realistic");
    expect(result.map(({ red }) => red)).toEqual([25, 45, 105, 125]);
  });

  test("cartoon sampling selects the deterministic dominant color bucket", () => {
    const red = [240, 10, 10, 255];
    const blue = [10, 10, 240, 255];
    const input = image([
      red, red, blue, blue,
      red, blue, blue, blue,
      red, red, red, red,
      red, red, red, red,
    ]);
    const result = sampleRegions(input, crop, 2, 2, "cartoon");
    expect(result[0]).toMatchObject({ red: 240, green: 10, blue: 10 });
    expect(result[1]).toMatchObject({ red: 10, green: 10, blue: 240 });
  });
});
