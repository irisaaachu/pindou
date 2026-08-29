import type { PindouProjectV1 } from "../../src/domain/project";

export const validPhotoProject: PindouProjectV1 = {
  version: 1,
  id: "project-photo-1",
  name: "Portrait",
  source: {
    type: "photo",
    settings: {
      cropMode: "crop-fill",
      alignment: "center",
      cropCenterX: 0.5,
      cropCenterY: 0.5,
      cropZoom: 1,
      backgroundColorId: null,
      preset: "portrait",
      colorCount: 24,
      brightness: 0,
      contrast: 0,
      ditheringStrength: 0.25,
    },
  },
  width: 2,
  height: 2,
  beadSizeMm: 5,
  palette: { id: "mard", version: "2026-01" },
  cells: ["M01", "M02", null, "M01"],
  texts: [],
  direction: "normal",
  annotations: {},
  createdAt: "2026-08-29T07:00:00.000Z",
  updatedAt: "2026-08-29T07:00:00.000Z",
};

export const validGalleryProject: PindouProjectV1 = {
  ...validPhotoProject,
  id: "project-gallery-1",
  source: {
    type: "gallery",
    patternId: "birthday-cake-01",
    patternVersion: "1",
  },
};

export const validDiyProject: PindouProjectV1 = {
  ...validPhotoProject,
  id: "project-diy-1",
  source: {
    type: "diy",
    objects: [
      {
        type: "catalog-element",
        id: "object-1",
        elementId: "heart-01",
        elementVersion: "1",
        x: 0,
        y: 0,
        scale: 100,
        flippedHorizontally: false,
        zIndex: 0,
        colorRoleOverrides: {},
      },
      { type: "text", id: "object-2", textId: "text-1", zIndex: 1 },
    ],
  },
  texts: [
    {
      id: "text-1",
      content: "生日快乐",
      x: 0,
      y: 1,
      fontId: "rounded-cn",
      size: 1,
      colorId: "M01",
    },
  ],
};
