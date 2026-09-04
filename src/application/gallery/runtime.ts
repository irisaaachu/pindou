import { reactive } from "vue";

import {
  createCachedPayloadSource,
  createGalleryCloudDependencies,
  createUniCloudGalleryPayloadSource,
  createUniCloudGalleryRepository,
  createUniPayloadCache,
} from "../../adapters/gallery";
import type { GalleryCopyDependencies } from "../../domain/gallery";
import {
  createGalleryController,
  type GalleryController,
  type GalleryControllerState,
} from "./controller";

export interface GalleryRuntimeDependencies {
  controllerDependencies: Parameters<typeof createGalleryController>[0];
}

export interface GalleryRuntime {
  state: GalleryControllerState;
  controller: GalleryController;
}

export function createGalleryRuntime(dependencies: GalleryRuntimeDependencies): GalleryRuntime {
  const state = reactive<GalleryControllerState>({ list: { status: "idle" }, detail: { status: "idle" } });
  return { state, controller: createGalleryController(dependencies.controllerDependencies, state) };
}

function defaultCopyDependencies(): GalleryCopyDependencies {
  return {
    createId: () => `gallery-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    nowIso: () => new Date().toISOString(),
  };
}

export function createProductionGalleryRuntime(projects: Parameters<typeof createGalleryController>[0]["projects"]): GalleryRuntime {
  const platform = createGalleryCloudDependencies();
  const repository = createUniCloudGalleryRepository(platform);
  const source = createCachedPayloadSource(
    createUniCloudGalleryPayloadSource(platform),
    createUniPayloadCache(),
  );
  return createGalleryRuntime({
    controllerDependencies: { repository, payloadSource: source, projects, copyDependencies: defaultCopyDependencies() },
  });
}
