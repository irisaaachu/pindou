import { PhotoMediaError, type PhotoMediaAdapter, type PhotoSource } from "../../adapters/photo-generation";
import type { GenerationEngine } from "../../domain/contracts";
import { constrainCrop, suggestCrop, type CropTransform, type GenerationSettings, type PhotoGenerationResult, type PhotoInput } from "../../domain/photo-generation";

export type PreviewMode = "original" | "round" | "square";
export type PhotoGenerationView =
  | { status: "idle" }
  | { status: "cropping"; image: PhotoInput; crop: CropTransform }
  | { status: "generating"; image: PhotoInput; crop: CropTransform; previousResult?: PhotoGenerationResult }
  | { status: "ready"; image: PhotoInput; crop: CropTransform; result: PhotoGenerationResult }
  | { status: "failure"; error: string; image?: PhotoInput; crop?: CropTransform; previousResult?: PhotoGenerationResult };

export interface PhotoGenerationState {
  view: PhotoGenerationView;
  settings: GenerationSettings;
  previewMode: PreviewMode;
  hasPendingSettings: boolean;
}

export interface PhotoGenerationControllerDependencies { media: PhotoMediaAdapter; engine: GenerationEngine }

export interface PhotoGenerationController {
  choosePhoto(source: PhotoSource): Promise<void>;
  updateCrop(crop: CropTransform): void;
  confirmCrop(): Promise<void>;
  updateSettings(settings: Partial<GenerationSettings>): void;
  regenerate(): Promise<void>;
  setPreviewMode(mode: PreviewMode): void;
  replacePhoto(source: PhotoSource): Promise<void>;
  dispose(): void;
}

export function createInitialPhotoGenerationState(): PhotoGenerationState {
  return { view: { status: "idle" }, settings: { shortSide: 58, colorLimit: 24, mode: "auto", removeBackground: true, dithering: false, cleanupIsolated: true }, previewMode: "round", hasPendingSettings: false };
}

export function createPhotoGenerationController(dependencies: PhotoGenerationControllerDependencies, state: PhotoGenerationState): PhotoGenerationController {
  let job = 0;
  let mediaJob = 0;

  async function choosePhoto(source: PhotoSource): Promise<void> {
    const identity = ++mediaJob;
    try {
      const selection = await dependencies.media.choose(source);
      const image = await dependencies.media.decode(selection);
      if (identity !== mediaJob) return;
      job += 1;
      state.hasPendingSettings = false;
      state.view = { status: "cropping", image, crop: suggestCrop(image, "auto") };
    } catch (error) {
      if (identity !== mediaJob || error instanceof PhotoMediaError && error.code === "CANCELLED") return;
      state.view = { status: "failure", error: error instanceof PhotoMediaError ? error.code : "UNSUPPORTED_IMAGE" };
    }
  }

  function updateCrop(crop: CropTransform): void {
    if (state.view.status !== "cropping" && state.view.status !== "ready") return;
    state.view = { status: "cropping", image: state.view.image, crop: constrainCrop(crop, state.view.image) };
  }

  async function generate(): Promise<void> {
    const current = state.view;
    if (current.status !== "cropping" && current.status !== "generating" && current.status !== "ready" && current.status !== "failure") return;
    if (current.status === "generating" && !state.hasPendingSettings) return;
    if (current.status === "failure" && (!current.image || !current.crop)) return;
    const image = current.status === "failure" ? current.image! : current.image;
    const crop = current.status === "failure" ? current.crop! : current.crop;
    const previousResult = current.status === "ready" ? current.result : current.status === "failure" || current.status === "generating" ? current.previousResult : undefined;
    const wasPending = state.hasPendingSettings;
    const identity = ++job;
    state.hasPendingSettings = false;
    state.view = previousResult === undefined ? { status: "generating", image, crop } : { status: "generating", image, crop, previousResult };
    try {
      const result = await dependencies.engine.generate({ image, crop, settings: { ...state.settings } });
      if (identity !== job) return;
      state.hasPendingSettings = false;
      state.view = { status: "ready", image, crop, result };
    } catch {
      if (identity !== job) return;
      state.hasPendingSettings = wasPending;
      state.view = previousResult === undefined
        ? { status: "failure", error: "GENERATION_FAILED", image, crop }
        : { status: "failure", error: "GENERATION_FAILED", image, crop, previousResult };
    }
  }

  function updateSettings(settings: Partial<GenerationSettings>): void {
    state.settings = { ...state.settings, ...settings };
    if (state.view.status === "generating") {
      const current = state.view;
      job += 1;
      state.view = current.previousResult
        ? { status: "ready", image: current.image, crop: current.crop, result: current.previousResult }
        : { status: "cropping", image: current.image, crop: current.crop };
    }
    if (state.view.status === "ready" || state.view.status === "cropping") state.hasPendingSettings = true;
  }

  async function replacePhoto(source: PhotoSource): Promise<void> {
    await choosePhoto(source);
  }

  function dispose(): void {
    job += 1;
    mediaJob += 1;
    dependencies.media.release();
    state.view = { status: "idle" };
    state.hasPendingSettings = false;
  }

  return { choosePhoto, updateCrop, confirmCrop: generate, updateSettings, regenerate: generate, setPreviewMode: (mode) => { state.previewMode = mode; }, replacePhoto, dispose };
}
