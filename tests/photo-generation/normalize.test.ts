import { describe, expect, test } from "vitest";

import { applyOrientation, normalizeDimensions } from "../../src/domain/photo-generation/normalize";
import { createOrientationMarkerPhotoInput } from "../fixtures/photo-generation/fixtures";

const red = [255, 0, 0, 255];
const green = [0, 255, 0, 255];
const blue = [0, 0, 255, 255];
const cyan = [0, 255, 255, 255];
const magenta = [255, 0, 255, 255];
const yellow = [255, 255, 0, 255];

describe("normalizeDimensions", () => {
  test("constrains a landscape image to a 2048-pixel longest side", () => {
    expect(normalizeDimensions(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
  });

  test("constrains a portrait image to a 2048-pixel longest side", () => {
    expect(normalizeDimensions(3024, 4032, 2048)).toEqual({ width: 1536, height: 2048 });
  });

  test("does not enlarge an image already inside the limit", () => {
    expect(normalizeDimensions(900, 1200, 2048)).toEqual({ width: 900, height: 1200 });
  });
});

describe("applyOrientation", () => {
  test("keeps orientation 1 pixels and dimensions unchanged", () => {
    const result = applyOrientation(createOrientationMarkerPhotoInput(), 1);

    expect({ width: result.width, height: result.height }).toEqual({ width: 3, height: 2 });
    expect(Array.from(result.data)).toEqual([
      ...red, ...green, ...blue,
      ...cyan, ...magenta, ...yellow,
    ]);
  });

  test("rotates orientation 3 by 180 degrees", () => {
    const result = applyOrientation(createOrientationMarkerPhotoInput(), 3);

    expect({ width: result.width, height: result.height }).toEqual({ width: 3, height: 2 });
    expect(Array.from(result.data)).toEqual([
      ...yellow, ...magenta, ...cyan,
      ...blue, ...green, ...red,
    ]);
  });

  test("rotates orientation 6 clockwise and swaps dimensions", () => {
    const result = applyOrientation(createOrientationMarkerPhotoInput(), 6);

    expect({ width: result.width, height: result.height }).toEqual({ width: 2, height: 3 });
    expect(Array.from(result.data)).toEqual([
      ...cyan, ...red,
      ...magenta, ...green,
      ...yellow, ...blue,
    ]);
  });

  test("rotates orientation 8 counterclockwise and swaps dimensions", () => {
    const result = applyOrientation(createOrientationMarkerPhotoInput(), 8);

    expect({ width: result.width, height: result.height }).toEqual({ width: 2, height: 3 });
    expect(Array.from(result.data)).toEqual([
      ...blue, ...yellow,
      ...green, ...magenta,
      ...red, ...cyan,
    ]);
  });
});
