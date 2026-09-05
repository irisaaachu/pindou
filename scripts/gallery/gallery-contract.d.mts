export interface ValidationIssue {
  path: string;
  message: string;
}

export type GalleryAssetReader = (fileRef: string) => Promise<string | Buffer | null>;

export function validateCatalog(catalog: unknown, readAsset: GalleryAssetReader): Promise<ValidationIssue[]>;
export function validatePublishedCatalog(catalog: unknown, readAsset: GalleryAssetReader): Promise<ValidationIssue[]>;
export function compareSemanticVersions(left: string, right: string): number;
export function toCategoryImport(category: Record<string, unknown>): Record<string, unknown>;
export function toPatternImport(
  pattern: Record<string, unknown>,
  editableTextRegions: readonly Record<string, unknown>[],
): Record<string, unknown>;
