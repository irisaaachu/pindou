export const PROJECT_VERSION = 1 as const;
export const MVP_BEAD_SIZE_MM = 5 as const;

export type ProjectDirection = "normal" | "reverse";
export type ProjectCell = string | null;
export type DiyScalePercent = 50 | 75 | 100 | 125 | 150;

export interface PaletteReference {
  id: string;
  version: string;
}

export interface PhotoGenerationSettings {
  cropMode: "crop-fill" | "fit";
  alignment: "center" | "top" | "bottom";
  cropCenterX: number;
  cropCenterY: number;
  cropZoom: number;
  backgroundColorId: string | null;
  preset: "photo" | "portrait" | "pixel-art" | "text-sign";
  colorCount: number;
  brightness: number;
  contrast: number;
  ditheringStrength: number;
}

export interface PhotoProjectSource {
  type: "photo";
  settings: PhotoGenerationSettings;
}

export interface GalleryProjectSource {
  type: "gallery";
  patternId: string;
  patternVersion: string;
}

export interface DiyCatalogElementObjectV1 {
  type: "catalog-element";
  id: string;
  elementId: string;
  elementVersion: string;
  x: number;
  y: number;
  scale: DiyScalePercent;
  flippedHorizontally: boolean;
  zIndex: number;
  colorRoleOverrides: Record<string, string>;
}

export interface DiyTextObjectV1 {
  type: "text";
  id: string;
  textId: string;
  zIndex: number;
}

export type DiyObjectV1 = DiyCatalogElementObjectV1 | DiyTextObjectV1;

export interface DiyProjectSource {
  type: "diy";
  objects: DiyObjectV1[];
}

export type ProjectSourceV1 =
  | PhotoProjectSource
  | GalleryProjectSource
  | DiyProjectSource;

export interface EditableProjectTextV1 {
  id: string;
  content: string;
  x: number;
  y: number;
  fontId: string;
  size: number;
  colorId: string;
}

export interface PrintAnnotations {
  title?: string;
  author?: string;
  notes?: string;
}

export interface PindouProjectV1 {
  version: typeof PROJECT_VERSION;
  id: string;
  name: string;
  ownerId?: string;
  source: ProjectSourceV1;
  width: number;
  height: number;
  beadSizeMm: typeof MVP_BEAD_SIZE_MM;
  palette: PaletteReference;
  cells: ProjectCell[];
  texts: EditableProjectTextV1[];
  direction: ProjectDirection;
  annotations: PrintAnnotations;
  createdAt: string;
  updatedAt: string;
  uploadedAt?: string;
  previewRef?: string;
}
