import type { GalleryAssetReader } from "./gallery-contract.mjs";

export function writeJsonLines(records: readonly unknown[]): string;

export function buildGalleryImport(
  catalog: unknown,
  readAsset: GalleryAssetReader,
  outputDirectory: string,
): Promise<void>;
