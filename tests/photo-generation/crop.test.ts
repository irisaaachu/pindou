import { describe, expect, test } from "vitest";
import { constrainCrop, suggestCrop } from "../../src/domain/photo-generation/crop";

const image = { width: 1600, height: 900 };

describe("photo crop", () => {
  test("centers a square crop", () => {
    expect(suggestCrop(image, "square")).toMatchObject({ x: 350, y: 0, width: 900, height: 900 });
  });

  test("keeps the original frame for automatic and original ratios", () => {
    expect(suggestCrop(image, "auto")).toMatchObject({ x: 0, y: 0, width: 1600, height: 900 });
    expect(suggestCrop(image, "original")).toMatchObject({ x: 0, y: 0, width: 1600, height: 900 });
  });

  test("clamps pan and oversized dimensions to image bounds", () => {
    expect(constrainCrop({ ...suggestCrop(image, "square"), x: -20, y: 10 }, image)).toMatchObject({ x: 0, y: 0 });
    expect(constrainCrop({ ...suggestCrop(image, "original"), width: 2000, height: 1000 }, image)).toMatchObject({ width: 1600, height: 900 });
  });

  test("rejects a crop smaller than one source pixel", () => {
    expect(() => constrainCrop({ ...suggestCrop(image, "square"), width: 0.5 }, image)).toThrow("INVALID_CROP_SIZE");
  });
});
