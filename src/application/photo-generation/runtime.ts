import { reactive } from "vue";
import { createInitialPhotoGenerationState, createPhotoGenerationController, type PhotoGenerationController, type PhotoGenerationControllerDependencies, type PhotoGenerationState } from "./controller";

export interface PhotoGenerationRuntime { state: PhotoGenerationState; controller: PhotoGenerationController }

export function createPhotoGenerationRuntime(dependencies: PhotoGenerationControllerDependencies): PhotoGenerationRuntime {
  const state = reactive(createInitialPhotoGenerationState()) as PhotoGenerationState;
  return { state, controller: createPhotoGenerationController(dependencies, state) };
}
