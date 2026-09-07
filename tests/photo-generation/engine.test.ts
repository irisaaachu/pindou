import { describe, expect, test } from "vitest";
import { createPhotoGenerationEngine, suggestCrop, type ColorLimit, type GenerationSettings, type ShortSidePreset } from "../../src/domain/photo-generation";
import { createFourColorCartoonPhotoInput } from "../fixtures/photo-generation/fixtures";

const defaults: GenerationSettings = { shortSide: 29, colorLimit: 24, mode: "auto", removeBackground: false, dithering: false, cleanupIsolated: false };

describe("photo generation engine", () => {
  test.each([29, 58, 87] as ShortSidePreset[])("generates preset %s deterministically", async (shortSide) => {
    const image = createFourColorCartoonPhotoInput();
    let time = 0;
    const engine = createPhotoGenerationEngine({ now: () => time++ });
    const request = { image, crop: suggestCrop(image, "original"), settings: { ...defaults, shortSide } };
    const original = Array.from(image.data);
    const first = await engine.generate(request);
    const second = await engine.generate(request);
    expect(second.grid).toEqual(first.grid);
    expect(Math.min(first.grid.width, first.grid.height)).toBe(shortSide);
    expect(first.grid.palette).toEqual({ id: "mard-221", version: "2026.09-pinned" });
    expect(first.summary).toMatchObject({ physicalWidthMm: first.grid.width * 5, physicalHeightMm: first.grid.height * 5 });
    expect(Array.from(image.data)).toEqual(original);
  });

  test.each([12, 24, 36] as ColorLimit[])("honors color limit %s and advanced switches", async (colorLimit) => {
    const image = createFourColorCartoonPhotoInput();
    const engine = createPhotoGenerationEngine({ now: () => 0 });
    const result = await engine.generate({ image, crop: suggestCrop(image, "square"), settings: { ...defaults, colorLimit, mode: "cartoon", removeBackground: true, dithering: true, cleanupIsolated: true } });
    const occupied = result.grid.cells.filter((code): code is string => code !== null);
    expect(new Set(occupied).size).toBeLessThanOrEqual(colorLimit);
    expect(result.summary.beadCount).toBe(occupied.length);
    expect(["cartoon", "realistic"]).toContain(result.summary.recommendedMode);
  });
});
