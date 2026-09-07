import type { GenerationEngine } from "../contracts/generation";
import { removeEdgeConnectedBackground } from "./background";
import { cleanupIsolatedCells } from "./cleanup";
import { constrainCrop } from "./crop";
import { ditherAndMap } from "./dither";
import { calculateGridSize } from "./grid-size";
import { recommendMode } from "./mode";
import { selectPalette } from "./palette-selection";
import { sampleRegions, type SampledCell, type SamplingStrategy } from "./sample";

export interface PhotoGenerationEngineDependencies { now(): number }

export function createPhotoGenerationEngine({ now }: PhotoGenerationEngineDependencies): GenerationEngine {
  return {
    async generate(request) {
      const startedAt = now();
      const crop = constrainCrop(request.crop, request.image);
      const dimensions = calculateGridSize(crop.width, crop.height, request.settings.shortSide);
      let samples = sampleRegions(request.image, crop, dimensions.width, dimensions.height, "realistic");
      const recommendedMode = recommendMode(samples);
      const mode: SamplingStrategy = request.settings.mode === "auto" ? recommendedMode : request.settings.mode;
      if (mode === "cartoon") samples = sampleRegions(request.image, crop, dimensions.width, dimensions.height, "cartoon");
      let occupied: Array<SampledCell | null> = samples.map((cell) => cell.alpha <= 8 ? null : cell);
      if (request.settings.removeBackground) occupied = removeEdgeConnectedBackground(samples, dimensions.width, dimensions.height)
        .map((cell) => cell && cell.alpha > 8 ? cell : null);
      const palette = selectPalette(occupied.filter((cell): cell is SampledCell => cell !== null), request.settings.colorLimit);
      let cells = ditherAndMap(occupied, dimensions.width, dimensions.height, palette, request.settings.dithering);
      if (request.settings.cleanupIsolated) cells = cleanupIsolatedCells(cells, dimensions.width, dimensions.height, palette);
      const beadCount = cells.filter((cell) => cell !== null).length;
      return {
        grid: {
          ...dimensions,
          palette: { id: "mard-221", version: "2026.09-pinned" },
          cells,
        },
        summary: {
          beadCount,
          colorCount: new Set(cells.filter((cell): cell is string => cell !== null)).size,
          physicalWidthMm: dimensions.width * 5,
          physicalHeightMm: dimensions.height * 5,
          recommendedMode,
          elapsedMs: Math.max(0, now() - startedAt),
        },
      };
    },
  };
}
