import type { ShortSidePreset } from "./types";

const SHORT_SIDE_PRESETS: readonly ShortSidePreset[] = [29, 58, 87];

export function calculateGridSize(
  cropWidth: number,
  cropHeight: number,
  shortSide: ShortSidePreset,
): { width: number; height: number } {
  if (!Number.isFinite(cropWidth) || !Number.isFinite(cropHeight)
    || cropWidth <= 0 || cropHeight <= 0) {
    throw new Error("INVALID_CROP_SIZE");
  }

  if (!SHORT_SIDE_PRESETS.includes(shortSide)) {
    throw new Error("INVALID_SHORT_SIDE");
  }

  if (cropWidth >= cropHeight) {
    return {
      width: Math.max(1, Math.round(shortSide * cropWidth / cropHeight)),
      height: shortSide,
    };
  }

  return {
    width: shortSide,
    height: Math.max(1, Math.round(shortSide * cropHeight / cropWidth)),
  };
}
