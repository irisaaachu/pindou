import type { PindouProjectV1 } from "../project";
import { MVP_BEAD_SIZE_MM, PROJECT_VERSION, validateProject } from "../project";
import type { GalleryPatternDetail, GalleryPatternPayloadV1, GalleryResult } from "./types";

export interface GalleryCopyDependencies {
  createId(): string;
  nowIso(): string;
}

export function createProjectFromGallery(
  detail: GalleryPatternDetail,
  payload: GalleryPatternPayloadV1,
  dependencies: GalleryCopyDependencies,
): GalleryResult<PindouProjectV1> {
  if (!matchesDetail(detail, payload)) return failure();

  const timestamp = dependencies.nowIso();
  const project: PindouProjectV1 = {
    version: PROJECT_VERSION,
    id: dependencies.createId(),
    name: detail.name,
    source: { type: "gallery", patternId: detail.id, patternVersion: detail.version },
    width: payload.width,
    height: payload.height,
    beadSizeMm: MVP_BEAD_SIZE_MM,
    palette: { ...payload.palette },
    cells: [...payload.cells],
    texts: payload.editableTextRegions.map((region) => ({
      id: region.id,
      content: region.defaultText,
      x: region.x,
      y: region.y,
      fontId: region.fontId,
      size: region.size,
      colorId: region.colorId,
    })),
    direction: payload.direction,
    annotations: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return validateProject(project).ok ? { ok: true, data: project } : failure();
}

function matchesDetail(detail: GalleryPatternDetail, payload: GalleryPatternPayloadV1): boolean {
  return detail.id === payload.contentId
    && detail.version === payload.contentVersion
    && detail.width === payload.width
    && detail.height === payload.height
    && detail.palette.id === payload.palette.id
    && detail.palette.version === payload.palette.version;
}

function failure(): GalleryResult<PindouProjectV1> {
  return { ok: false, error: { code: "INVALID_REQUEST" } };
}
