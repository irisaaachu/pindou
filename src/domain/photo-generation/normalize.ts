import type { PhotoInput } from "./types";

export type ImageOrientation = 1 | 3 | 6 | 8;

export interface NormalizedDimensions {
  width: number;
  height: number;
}

export function normalizeDimensions(width: number, height: number, maxSide: number): NormalizedDimensions {
  if (![width, height, maxSide].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("INVALID_IMAGE_SIZE");
  }
  const longestSide = Math.max(width, height);
  if (longestSide <= maxSide) return { width, height };

  const scale = maxSide / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function applyOrientation(input: PhotoInput, orientation: ImageOrientation): PhotoInput {
  if (input.data.length !== input.width * input.height * 4) {
    throw new Error("INVALID_PIXEL_DATA");
  }

  const swapsDimensions = orientation === 6 || orientation === 8;
  const width = swapsDimensions ? input.height : input.width;
  const height = swapsDimensions ? input.width : input.height;
  const data = new Uint8ClampedArray(input.data.length);

  for (let sourceY = 0; sourceY < input.height; sourceY += 1) {
    for (let sourceX = 0; sourceX < input.width; sourceX += 1) {
      const [destinationX, destinationY] = orientedCoordinate(
        sourceX,
        sourceY,
        input.width,
        input.height,
        orientation,
      );
      const sourceOffset = (sourceY * input.width + sourceX) * 4;
      const destinationOffset = (destinationY * width + destinationX) * 4;
      data.set(input.data.subarray(sourceOffset, sourceOffset + 4), destinationOffset);
    }
  }

  return { ...input, width, height, data };
}

function orientedCoordinate(
  x: number,
  y: number,
  width: number,
  height: number,
  orientation: ImageOrientation,
): [number, number] {
  switch (orientation) {
    case 3:
      return [width - x - 1, height - y - 1];
    case 6:
      return [height - y - 1, x];
    case 8:
      return [y, width - x - 1];
    default:
      return [x, y];
  }
}
