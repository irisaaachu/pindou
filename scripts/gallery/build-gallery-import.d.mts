import type { GalleryAssetReader } from "./gallery-contract.mjs";

export function buildGalleryImport(
  catalog: unknown,
  readAsset: GalleryAssetReader,
  outputDirectory: string,
): Promise<void>;
