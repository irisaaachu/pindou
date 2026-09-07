import registry from "../../../content/gallery/palettes/mard-221-v2026.09.json";
import { rgbToLab, type LabColor } from "./color-space";

export interface MardLabColor extends LabColor { code: string; hex: string; red: number; green: number; blue: number }

const palette = Object.freeze(Object.entries(registry.colors).map(([code, hex]) => {
  const red = parseInt(hex.slice(1, 3), 16), green = parseInt(hex.slice(3, 5), 16), blue = parseInt(hex.slice(5, 7), 16);
  return Object.freeze({ code, hex, red, green, blue, ...rgbToLab(red, green, blue) });
}));

export function getMardLabPalette(): readonly MardLabColor[] { return palette; }
