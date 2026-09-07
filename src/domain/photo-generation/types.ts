import {
  MVP_BEAD_SIZE_MM,
  type PaletteReference,
  type ProjectCell,
} from "../project/types";

export type ShortSidePreset = 29 | 58 | 87;
export type ColorLimit = 12 | 24 | 36;
export type GenerationMode = "auto" | "cartoon" | "realistic";

export const PHOTO_BEAD_SIZE_MM = MVP_BEAD_SIZE_MM;

export interface PhotoInput {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  source: "camera" | "album";
}

export interface CropTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  translateX: number;
  translateY: number;
  ratioMode: "auto" | "square" | "original";
}

export interface GenerationSettings {
  shortSide: ShortSidePreset;
  colorLimit: ColorLimit;
  mode: GenerationMode;
  removeBackground: boolean;
  dithering: boolean;
  cleanupIsolated: boolean;
}

export interface BeadGrid {
  width: number;
  height: number;
  palette: PaletteReference & {
    id: "mard-221";
    version: "2026.09-pinned";
  };
  cells: ProjectCell[];
}

export interface GenerationSummary {
  beadCount: number;
  colorCount: number;
  physicalWidthMm: number;
  physicalHeightMm: number;
  recommendedMode: Exclude<GenerationMode, "auto">;
  elapsedMs: number;
}

export interface PhotoGenerationResult {
  grid: BeadGrid;
  summary: GenerationSummary;
}
