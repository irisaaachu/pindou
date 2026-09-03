import type { PaletteReference, ProjectCell, ProjectDirection } from "../project";

export type GalleryDifficulty = "beginner" | "standard" | "advanced";
export type GallerySizeClass = "small" | "medium" | "large";
export type GalleryOrder = "featured" | "newest";

export interface GalleryTagSet {
  usage: string[];
  themes: string[];
  features: string[];
}

export interface GalleryCategory {
  id: string;
  version: string;
  slug: string;
  name: string;
  shortLabel: string;
  quickEntry: boolean;
  order: number;
  coverRef?: string;
}

export interface GalleryEditableTextRegion {
  id: string;
  defaultText: string;
  x: number;
  y: number;
  fontId: string;
  size: number;
  colorId: string;
  maxLength: number;
}

export interface GalleryPatternSummary {
  id: string;
  version: string;
  name: string;
  coverRef: string;
  width: number;
  height: number;
  difficulty: GalleryDifficulty;
  sizeClass: GallerySizeClass;
  tags: GalleryTagSet;
  hasEditableText: boolean;
  publishedAt: string;
}

export interface GalleryPayloadDescriptor {
  fileRef: string;
  formatVersion: 1;
  byteSize: number;
  sha256: string;
}

export type GalleryErrorCode =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "ASSET_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "UNSUPPORTED_VERSION"
  | "PAYLOAD_INTEGRITY_FAILED"
  | "INTERNAL_ERROR";

export type GalleryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: GalleryErrorCode } };

export interface GalleryPatternDetail extends GalleryPatternSummary {
  description: string;
  previewRef: string;
  physicalWidthMm: number;
  physicalHeightMm: number;
  palette: PaletteReference;
  direction: ProjectDirection;
  colorCount: number;
  beadCount: number;
  editableTextRegions: GalleryEditableTextRegion[];
  creator: string;
  sourceType: "original" | "commissioned" | "licensed";
  sourceReference?: string;
  payload: GalleryPayloadDescriptor;
}

export interface GalleryPatternPayloadV1 {
  format: "pindou-gallery-pattern";
  formatVersion: 1;
  contentId: string;
  contentVersion: string;
  width: number;
  height: number;
  palette: PaletteReference;
  cells: ProjectCell[];
  direction: ProjectDirection;
  editableTextRegions: GalleryEditableTextRegion[];
}

export interface GalleryListQuery {
  search?: string;
  usageTags?: string[];
  themeTags?: string[];
  featureTags?: string[];
  difficulty?: GalleryDifficulty;
  sizeClass?: GallerySizeClass;
  order: GalleryOrder;
  cursor?: string;
  limit: number;
}

export interface GalleryPage<T> {
  items: T[];
  nextCursor?: string;
}
