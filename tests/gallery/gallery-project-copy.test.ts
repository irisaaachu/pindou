import { describe, expect, test } from "vitest";

import { createProjectFromGallery } from "../../src/domain/gallery";
import { validateProject } from "../../src/domain/project";

const detail = {
  id: "tiny-heart",
  version: "1.0.0",
  name: "Tiny Heart",
  coverRef: "https://assets.example/cover.png",
  width: 2,
  height: 2,
  difficulty: "beginner" as const,
  sizeClass: "small" as const,
  tags: { usage: ["gift"], themes: ["love"], features: ["editable-text"] },
  hasEditableText: true,
  publishedAt: "2026-09-03T00:00:00.000Z",
  description: "A tiny heart.",
  previewRef: "https://assets.example/preview.png",
  physicalWidthMm: 10,
  physicalHeightMm: 10,
  palette: { id: "pindou-basic", version: "1.0.0" },
  direction: "normal" as const,
  colorCount: 1,
  beadCount: 3,
  editableTextRegions: [{
    id: "message", defaultText: "Hi", x: 0, y: 0, fontId: "sans", size: 12, colorId: "R01", maxLength: 12,
  }],
  creator: "Pindou Studio",
  sourceType: "original" as const,
  payload: {
    fileRef: "https://assets.example/tiny-heart.json", formatVersion: 1 as const, byteSize: 1, sha256: "a".repeat(64),
  },
};

const payload = {
  format: "pindou-gallery-pattern" as const,
  formatVersion: 1 as const,
  contentId: "tiny-heart",
  contentVersion: "1.0.0",
  width: 2,
  height: 2,
  palette: { id: "pindou-basic", version: "1.0.0" },
  cells: ["R01", null, "R01", "R01"],
  direction: "normal" as const,
  editableTextRegions: [{
    id: "message", defaultText: "Hi", x: 0, y: 0, fontId: "sans", size: 12, colorId: "R01", maxLength: 12,
  }],
};

describe("createProjectFromGallery", () => {
  test("creates a valid independent local project with gallery provenance", () => {
    const result = createProjectFromGallery(detail, payload, {
      createId: () => "project-local-1",
      nowIso: () => "2026-09-04T00:00:00.000Z",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        version: 1,
        id: "project-local-1",
        name: "Tiny Heart",
        source: { type: "gallery", patternId: "tiny-heart", patternVersion: "1.0.0" },
        width: 2,
        height: 2,
        beadSizeMm: 5,
        palette: { id: "pindou-basic", version: "1.0.0" },
        cells: ["R01", null, "R01", "R01"],
        texts: [{ id: "message", content: "Hi", x: 0, y: 0, fontId: "sans", size: 12, colorId: "R01" }],
        direction: "normal",
        annotations: {},
        createdAt: "2026-09-04T00:00:00.000Z",
        updatedAt: "2026-09-04T00:00:00.000Z",
      },
    });
    if (!result.ok) throw new Error("Expected a project");
    expect(validateProject(result.data)).toEqual({ ok: true, value: result.data });
    expect(result.data).not.toHaveProperty("ownerId");
    expect(result.data).not.toHaveProperty("uploadedAt");
  });

  test("copies grid, palette, and text objects rather than retaining payload references", () => {
    const result = createProjectFromGallery(detail, payload, {
      createId: () => "project-local-1",
      nowIso: () => "2026-09-04T00:00:00.000Z",
    });
    if (!result.ok) throw new Error("Expected a project");

    result.data.cells[0] = "B02";
    result.data.palette.id = "changed";
    result.data.texts[0].content = "Bye";

    expect(payload.cells[0]).toBe("R01");
    expect(payload.palette.id).toBe("pindou-basic");
    expect(payload.editableTextRegions[0].defaultText).toBe("Hi");
  });

  test.each([
    ["content ID", { ...payload, contentId: "other" }],
    ["content version", { ...payload, contentVersion: "2.0.0" }],
    ["width", { ...payload, width: 3 }],
    ["palette", { ...payload, palette: { id: "other", version: "1.0.0" } }],
  ])("rejects a payload whose %s does not exactly match its detail", (_name, invalidPayload) => {
    expect(createProjectFromGallery(detail, invalidPayload, {
      createId: () => "project-local-1",
      nowIso: () => "2026-09-04T00:00:00.000Z",
    })).toEqual({ ok: false, error: { code: "INVALID_REQUEST" } });
  });
});
