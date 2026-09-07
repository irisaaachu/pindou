import type { CropTransform, PhotoInput } from "./types";

export interface SampledCell {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  variance: number;
  edgeStrength: number;
}

export type SamplingStrategy = "cartoon" | "realistic";

interface Pixel { red: number; green: number; blue: number; alpha: number }

export function sampleRegions(
  image: PhotoInput,
  crop: CropTransform,
  width: number,
  height: number,
  strategy: SamplingStrategy,
): SampledCell[] {
  if (![width, height].every((value) => Number.isInteger(value) && value > 0)) throw new Error("INVALID_GRID_SIZE");
  const cells: SampledCell[] = [];
  for (let gridY = 0; gridY < height; gridY += 1) {
    for (let gridX = 0; gridX < width; gridX += 1) {
      const startX = Math.floor(crop.x + (gridX * crop.width) / width);
      const endX = Math.max(startX + 1, Math.ceil(crop.x + ((gridX + 1) * crop.width) / width));
      const startY = Math.floor(crop.y + (gridY * crop.height) / height);
      const endY = Math.max(startY + 1, Math.ceil(crop.y + ((gridY + 1) * crop.height) / height));
      const pixels = collectPixels(image, startX, endX, startY, endY);
      cells.push(summarize(pixels, strategy));
    }
  }
  return cells;
}

function collectPixels(image: PhotoInput, startX: number, endX: number, startY: number, endY: number): Pixel[] {
  const pixels: Pixel[] = [];
  for (let y = Math.max(0, startY); y < Math.min(image.height, endY); y += 1) {
    for (let x = Math.max(0, startX); x < Math.min(image.width, endX); x += 1) {
      const offset = (y * image.width + x) * 4;
      pixels.push({ red: image.data[offset], green: image.data[offset + 1], blue: image.data[offset + 2], alpha: image.data[offset + 3] });
    }
  }
  if (pixels.length === 0) throw new Error("EMPTY_SAMPLE_REGION");
  return pixels;
}

function summarize(pixels: Pixel[], strategy: SamplingStrategy): SampledCell {
  const color = strategy === "cartoon" ? dominantColor(pixels) : meanColor(pixels);
  const luminances = pixels.map(luminance);
  const meanLuminance = luminances.reduce((sum, value) => sum + value, 0) / luminances.length;
  const variance = luminances.reduce((sum, value) => sum + (value - meanLuminance) ** 2, 0) / luminances.length;
  const edgeStrength = luminances.slice(1).reduce((sum, value, index) => sum + Math.abs(value - luminances[index]), 0)
    / Math.max(1, luminances.length - 1);
  return { ...color, variance, edgeStrength };
}

function meanColor(pixels: Pixel[]): Pixel {
  const sums = pixels.reduce((total, pixel) => ({
    red: total.red + srgbToLinear(pixel.red),
    green: total.green + srgbToLinear(pixel.green),
    blue: total.blue + srgbToLinear(pixel.blue),
    alpha: total.alpha + pixel.alpha,
  }), { red: 0, green: 0, blue: 0, alpha: 0 });
  return {
    red: linearToSrgb(sums.red / pixels.length),
    green: linearToSrgb(sums.green / pixels.length),
    blue: linearToSrgb(sums.blue / pixels.length),
    alpha: Math.round(sums.alpha / pixels.length),
  };
}

function srgbToLinear(value: number): number {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number): number {
  const channel = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, channel)) * 255);
}

function dominantColor(pixels: Pixel[]): Pixel {
  const buckets = new Map<string, Pixel[]>();
  for (const pixel of pixels) {
    const key = `${pixel.red >> 5},${pixel.green >> 5},${pixel.blue >> 5},${pixel.alpha >> 5}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(pixel);
    buckets.set(key, bucket);
  }
  let winner: Pixel[] = [];
  for (const bucket of buckets.values()) if (bucket.length > winner.length) winner = bucket;
  return meanColor(winner);
}

function luminance(pixel: Pixel): number {
  return 0.2126 * pixel.red + 0.7152 * pixel.green + 0.0722 * pixel.blue;
}
