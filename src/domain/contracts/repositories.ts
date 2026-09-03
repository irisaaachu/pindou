import type {
  DiyScalePercent,
  PindouProjectV1,
  ProjectCell,
  ProjectSourceV1,
} from "../project";
import type {
  GalleryCategory,
  GalleryListQuery,
  GalleryPage,
  GalleryPatternDetail,
  GalleryPatternSummary,
  GalleryPayloadDescriptor,
  GalleryResult,
} from "../gallery";

export interface ProjectSummary {
  id: string;
  name: string;
  sourceType: ProjectSourceV1["type"];
  updatedAt: string;
  previewRef?: string;
}

export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<PindouProjectV1 | null>;
  save(project: PindouProjectV1): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ContentCategory {
  id: string;
  name: string;
  order: number;
}

export interface GalleryRepository {
  listCategories(): Promise<GalleryResult<GalleryCategory[]>>;
  listPatterns(query: GalleryListQuery): Promise<GalleryResult<GalleryPage<GalleryPatternSummary>>>;
  getPattern(id: string): Promise<GalleryResult<GalleryPatternDetail | null>>;
}

export interface GalleryPayloadSource {
  download(descriptor: GalleryPayloadDescriptor): Promise<GalleryResult<string>>;
}

export interface DiyElementRecord {
  id: string;
  version: string;
  name: string;
  categoryId: string;
  width: number;
  height: number;
  cells: ProjectCell[];
  anchorX: number;
  anchorY: number;
  colorRoles: string[];
  allowedScales: DiyScalePercent[];
  supportsHorizontalFlip: boolean;
}

export interface DiyElementRepository {
  listCategories(): Promise<ContentCategory[]>;
  listElements(categoryId: string): Promise<DiyElementRecord[]>;
  getElement(id: string, version: string): Promise<DiyElementRecord | null>;
}
