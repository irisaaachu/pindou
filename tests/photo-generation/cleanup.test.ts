import { expect, test } from "vitest";
import { ciede2000, cleanupIsolatedCells, getMardLabPalette } from "../../src/domain/photo-generation";

test("replaces only low-contrast one-cell islands", () => {
  const palette = getMardLabPalette();
  const base = palette[0];
  const near = palette.filter(({ code }) => code !== base.code).reduce((best, color) => ciede2000(color, base) < ciede2000(best, base) ? color : best);
  const far = palette.find(({ code }) => code === "H2")!;
  const low = cleanupIsolatedCells([base.code, base.code, base.code, base.code, near.code, base.code, base.code, base.code, base.code], 3, 3, palette);
  expect(low[4]).toBe(base.code);
  const high = cleanupIsolatedCells([base.code, base.code, base.code, base.code, far.code, base.code, base.code, base.code, base.code], 3, 3, palette);
  expect(high[4]).toBe(far.code);
  expect(cleanupIsolatedCells([null, base.code], 2, 1, palette)[0]).toBeNull();
  expect(cleanupIsolatedCells([near.code, near.code, base.code], 3, 1, palette).slice(0, 2)).toEqual([near.code, near.code]);

  const mixed = cleanupIsolatedCells([far.code, far.code, base.code, far.code, near.code, far.code, base.code, base.code, base.code], 3, 3, palette);
  expect(mixed[4]).toBe(base.code);
});
