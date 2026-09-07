import type { CropTransform } from "./types";

export interface ImageDimensions {
  width: number;
  height: number;
}

export function suggestCrop(image: ImageDimensions, ratioMode: CropTransform["ratioMode"]): CropTransform {
  assertImage(image);
  const side = Math.min(image.width, image.height);
  const square = ratioMode === "square";
  const width = square ? side : image.width;
  const height = square ? side : image.height;
  return {
    x: (image.width - width) / 2,
    y: (image.height - height) / 2,
    width,
    height,
    scale: 1,
    translateX: 0,
    translateY: 0,
    ratioMode,
  };
}

export function constrainCrop(crop: CropTransform, image: ImageDimensions): CropTransform {
  assertImage(image);
  if (![crop.x, crop.y, crop.width, crop.height, crop.scale, crop.translateX, crop.translateY].every(Number.isFinite)
    || crop.width < 1 || crop.height < 1 || crop.scale <= 0) {
    throw new Error("INVALID_CROP_SIZE");
  }
  const width = Math.min(crop.width, image.width);
  const height = Math.min(crop.height, image.height);
  return {
    ...crop,
    x: Math.min(Math.max(0, crop.x), image.width - width),
    y: Math.min(Math.max(0, crop.y), image.height - height),
    width,
    height,
  };
}

function assertImage(image: ImageDimensions): void {
  if (![image.width, image.height].every((value) => Number.isFinite(value) && value >= 1)) {
    throw new Error("INVALID_IMAGE_SIZE");
  }
}
