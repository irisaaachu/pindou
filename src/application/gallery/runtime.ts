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
import type { PindouProjectV1 } from "../../domain/project";

export interface GalleryRuntimeDependencies {
  controllerDependencies: Parameters<typeof createGalleryController>[0];
}

export interface GalleryRuntimeHandoff {
  project: PindouProjectV1 | null;
}

export interface GalleryRuntime {
  state: GalleryControllerState;
  controller: GalleryController;
  handoff: GalleryRuntimeHandoff;
  useCurrentDetail(): ReturnType<GalleryController["useCurrentDetail"]>;
}

export function createGalleryRuntime(dependencies: GalleryRuntimeDependencies): GalleryRuntime {
  const state = reactive<GalleryControllerState>({
    list: { status: "idle" },
    detail: { status: "idle" },
    categories: { status: "idle" },
  });
  const controller = createGalleryController(dependencies.controllerDependencies, state);
  const handoff: GalleryRuntimeHandoff = reactive({ project: null });

  async function useCurrentDetail(): ReturnType<GalleryController["useCurrentDetail"]> {
    const result = await controller.useCurrentDetail();
    if (result.ok) handoff.project = result.data;
    return result;
  }

  return { state, controller, handoff, useCurrentDetail };
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
