import { describe, expect, test } from "vitest";

import { PROJECT_VERSION, validateProject } from "../../src/domain/project";
import type {
  PhotoProjectSource,
  ProjectSourceV1,
} from "../../src/domain/project";
import {
  validDiyProject,
  validGalleryProject,
  validPhotoProject,
} from "../fixtures/projects";

describe("PindouProjectV1 source model", () => {
  test("uses project format version 1", () => {
    expect(PROJECT_VERSION).toBe(1);
  });

  test.each<[string, ProjectSourceV1]>([
    ["photo", validPhotoProject.source],
    ["gallery", validGalleryProject.source],
    ["diy", validDiyProject.source],
  ])("represents a %s project", (type, source) => {
    expect(source.type).toBe(type);
  });
});

describe("validateProject", () => {
  test.each([validPhotoProject, validGalleryProject, validDiyProject])(
    "accepts a valid $source.type project",
    (project) => {
      expect(validateProject(project)).toEqual({ ok: true, value: project });
    },
  );

  test.each([
    { name: "unknown version", input: { ...validPhotoProject, version: 2 }, error: { code: "UNSUPPORTED_VERSION", path: "version" } },
    { name: "zero width", input: { ...validPhotoProject, width: 0 }, error: { code: "INVALID_FIELD", path: "width" } },
    { name: "fractional height", input: { ...validPhotoProject, height: 1.5 }, error: { code: "INVALID_FIELD", path: "height" } },
    { name: "unsupported bead size", input: { ...validPhotoProject, beadSizeMm: 2.6 }, error: { code: "INVALID_FIELD", path: "beadSizeMm" } },
    { name: "wrong cell count", input: { ...validPhotoProject, cells: ["M01"] }, error: { code: "CELL_COUNT_MISMATCH", path: "cells" } },
    { name: "invalid cell value", input: { ...validPhotoProject, cells: [7, "M02", null, "M01"] }, error: { code: "INVALID_FIELD", path: "cells[0]" } },
    { name: "unsupported direction", input: { ...validPhotoProject, direction: "mirrored" }, error: { code: "INVALID_FIELD", path: "direction" } },
    { name: "unsupported source", input: { ...validPhotoProject, source: { type: "generated" } }, error: { code: "INVALID_FIELD", path: "source.type" } },
    { name: "empty project id", input: { ...validPhotoProject, id: "" }, error: { code: "INVALID_FIELD", path: "id" } },
    { name: "empty palette id", input: { ...validPhotoProject, palette: { id: "", version: "1" } }, error: { code: "INVALID_FIELD", path: "palette.id" } },
    { name: "empty timestamp", input: { ...validPhotoProject, createdAt: "" }, error: { code: "INVALID_FIELD", path: "createdAt" } },
    {
      name: "gallery without pattern id",
      input: { ...validGalleryProject, source: { ...validGalleryProject.source, patternId: "" } },
      error: { code: "INVALID_FIELD", path: "source.patternId" },
    },
    {
      name: "unknown DIY object",
      input: { ...validDiyProject, source: { type: "diy", objects: [{ type: "image" }] } },
      error: { code: "INVALID_FIELD", path: "source.objects[0].type" },
    },
    {
      name: "persisted original photo path",
      input: {
        ...validPhotoProject,
        source: { ...validPhotoProject.source, originalPhotoPath: "wxfile://private/photo.jpg" },
      },
      error: { code: "INVALID_FIELD", path: "source.originalPhotoPath" },
    },
    {
      name: "persisted original photo bytes",
      input: {
        ...validPhotoProject,
        source: { ...validPhotoProject.source, originalPhotoBytes: [1, 2, 3] },
      },
      error: { code: "INVALID_FIELD", path: "source.originalPhotoBytes" },
    },
  ])("rejects $name", ({ input, error }) => {
    expect(validateProject(input)).toEqual({ ok: false, error });
  });
});

const photoSettings = validPhotoProject.source.type === "photo"
  ? validPhotoProject.source.settings
  : neverPhotoSettings();

const unsafePhotoSource: PhotoProjectSource = {
  type: "photo",
  settings: photoSettings,
  // @ts-expect-error Original photos are intentionally excluded from persisted projects.
  originalPhotoPath: "wxfile://private/photo.jpg",
};

void unsafePhotoSource;

function neverPhotoSettings(): never {
  throw new Error("Expected a photo fixture");
}
