import { describe, expect, test } from "vitest";
import { ciede2000, getMardLabPalette, rgbToLab } from "../../src/domain/photo-generation";

describe("perceptual color", () => {
  test.each([
    [{ l: 50, a: 2.6772, b: -79.7751 }, { l: 50, a: 0, b: -82.7485 }, 2.0425],
    [{ l: 50, a: 3.1571, b: -77.2803 }, { l: 50, a: 0, b: -82.7485 }, 2.8615],
    [{ l: 50, a: 2.8361, b: -74.02 }, { l: 50, a: 0, b: -82.7485 }, 3.4412],
  ])("matches published CIEDE2000 vectors", (first, second, expected) => {
    expect(ciede2000(first, second)).toBeCloseTo(expected, 4);
  });

  test("maps white and black to D65 Lab", () => {
    expect(rgbToLab(255, 255, 255)).toMatchObject({ l: expect.closeTo(100, 4), a: expect.closeTo(0, 3), b: expect.closeTo(0, 3) });
    expect(rgbToLab(0, 0, 0).l).toBeCloseTo(0, 4);
  });

  test("caches and freezes exactly 221 unique MARD colors", () => {
    const first = getMardLabPalette();
    expect(getMardLabPalette()).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first).toHaveLength(221);
    expect(new Set(first.map(({ code }) => code)).size).toBe(221);
  });
});
