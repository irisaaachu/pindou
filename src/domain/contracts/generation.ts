import type {
  CropTransform,
  GenerationSettings,
  PhotoGenerationResult,
  PhotoInput,
} from "../photo-generation";

export interface GenerationRequest {
  image: PhotoInput;
  crop: CropTransform;
  settings: GenerationSettings;
}

export interface GenerationEngine {
  generate(request: GenerationRequest): Promise<PhotoGenerationResult>;
}
