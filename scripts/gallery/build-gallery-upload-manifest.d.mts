import type { GalleryAssetReader } from "./gallery-contract.mjs";

export interface GalleryUploadManifest {
  assets: Array<{ logicalKey: string; path: string }>;
}

export function buildGalleryUploadManifest(
  catalog: unknown,
  readAsset: GalleryAssetReader,
  destination: string,
): Promise<GalleryUploadManifest>;
