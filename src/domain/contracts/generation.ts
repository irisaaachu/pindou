import type {
  PaletteReference,
  PhotoGenerationSettings,
  ProjectCell,
} from "../project";

export interface DecodedImagePixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface GenerationRequest {
  image: DecodedImagePixels;
  targetWidth: number;
  targetHeight: number;
  palette: PaletteReference;
  settings: PhotoGenerationSettings;
}

export interface GenerationResult {
  width: number;
  height: number;
  cells: ProjectCell[];
}

export interface GenerationEngine {
  generate(request: GenerationRequest): Promise<GenerationResult>;
}
