import type { PhotoInput } from "../../../src/domain/photo-generation";

export function createGradientPhotoInput(): PhotoInput {
  return photo(4, 4, [
    0, 0, 0, 255, 64, 64, 64, 255, 128, 128, 128, 255, 192, 192, 192, 255,
    16, 16, 16, 255, 80, 80, 80, 255, 144, 144, 144, 255, 208, 208, 208, 255,
    32, 32, 32, 255, 96, 96, 96, 255, 160, 160, 160, 255, 224, 224, 224, 255,
    48, 48, 48, 255, 112, 112, 112, 255, 176, 176, 176, 255, 240, 240, 240, 255,
  ]);
}

export function createFourColorCartoonPhotoInput(): PhotoInput {
  return photo(4, 4, [
    255, 0, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255,
    255, 0, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255,
    0, 0, 255, 255, 0, 0, 255, 255, 255, 255, 0, 255, 255, 255, 0, 255,
    0, 0, 255, 255, 0, 0, 255, 255, 255, 255, 0, 255, 255, 255, 0, 255,
  ]);
}

export function createTransparentBorderPhotoInput(): PhotoInput {
  return photo(4, 4, [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 255, 128, 0, 255, 255, 128, 0, 255, 0, 0, 0, 0,
    0, 0, 0, 0, 255, 128, 0, 255, 255, 128, 0, 255, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
}

export function createSolidEdgeBackgroundPhotoInput(): PhotoInput {
  return photo(4, 4, [
    240, 240, 240, 255, 240, 240, 240, 255, 240, 240, 240, 255, 240, 240, 240, 255,
    240, 240, 240, 255, 40, 100, 220, 255, 40, 100, 220, 255, 240, 240, 240, 255,
    240, 240, 240, 255, 40, 100, 220, 255, 40, 100, 220, 255, 240, 240, 240, 255,
    240, 240, 240, 255, 240, 240, 240, 255, 240, 240, 240, 255, 240, 240, 240, 255,
  ]);
}

export function createOrientationMarkerPhotoInput(): PhotoInput {
  return photo(3, 2, [
    255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255,
    0, 255, 255, 255, 255, 0, 255, 255, 255, 255, 0, 255,
  ]);
}

function photo(width: number, height: number, data: number[]): PhotoInput {
  return { width, height, data: new Uint8ClampedArray(data), source: "album" };
}
