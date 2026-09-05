import type { GalleryAssetReader } from "./gallery-contract.mjs";

export function writeJsonLines(records: readonly unknown[]): string;

export function resolveCloudAssetRefs<T>(catalog: T, mapping: unknown): T;

export function buildGalleryImport(
  catalog: unknown,
  readAsset: GalleryAssetReader,
  outputDirectory: string,
  cloudFileMap?: unknown,
): Promise<void>;
