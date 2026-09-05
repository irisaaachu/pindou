import { describe, expect, test } from "vitest";

import {
  validateGalleryCategory,
  validateGalleryListQuery,
  validateGalleryPayload,
  validatePatternDetail,
  validatePatternSummary,
} from "../../src/domain/gallery";

const validCategory = {
  id: "floral",
  version: "2026-09",
  slug: "floral",
  name: "Floral",
  shortLabel: "Flowers",
  quickEntry: true,
  order: 1,
  coverRef: "gallery/floral.png",
};

const validPayload = {
  format: "pindou-gallery-pattern",
  formatVersion: 1,
  contentId: "flower-1",
  contentVersion: "2026-09",
  width: 2,
  height: 2,
  palette: { id: "mard", version: "2026-01" },
  cells: ["M01", null, "M02", "M01"],
  direction: "normal",
  editableTextRegions: [
    { id: "title", defaultText: "Hi", x: 0, y: 0, fontId: "sans", size: 12, colorId: "M01", maxLength: 12 },
  ],
};

const validSummary = {
  id: "flower-1",
  version: "2026-09",
  name: "Flower",
  coverRef: "gallery/flower.png",
  width: 2,
  height: 2,
  difficulty: "beginner",
  sizeClass: "small",
  tags: { usage: ["coaster"], themes: ["floral"], features: ["text"] },
  hasEditableText: true,
  publishedAt: "2026-09-03T00:00:00.000Z",
};

const validDetail = {
  ...validSummary,
  description: "A small flower.",
  previewRef: "gallery/flower-preview.png",
  physicalWidthMm: 10,
  physicalHeightMm: 10,
  palette: validPayload.palette,
  direction: "normal",
  colorCount: 2,
  beadCount: 4,
  editableTextRegions: validPayload.editableTextRegions,
  creator: "Pindou",
  sourceType: "original",
  payload: {
    fileRef: "gallery/flower.json",
    formatVersion: 1,
    byteSize: 123,
    sha256: "a".repeat(64),
  },
};

describe("gallery document validators", () => {
  test("accept complete category, summary, detail, and payload fixtures", () => {
    expect(validateGalleryCategory(validCategory)).toEqual({ ok: true, value: validCategory });
    expect(validatePatternSummary(validSummary)).toEqual({ ok: true, value: validSummary });
    expect(validatePatternDetail(validDetail)).toEqual({ ok: true, value: validDetail });
    expect(validateGalleryPayload(validPayload)).toEqual({ ok: true, value: validPayload });
  });

  test.each([
    ["an unsupported payload version", { ...validPayload, formatVersion: 2 }, { code: "UNSUPPORTED_VERSION", path: "formatVersion" }],
    ["a mismatched payload cell count", { ...validPayload, cells: ["A01"] }, { code: "CELL_COUNT_MISMATCH", path: "cells" }],
    ["out-of-bounds text", { ...validPayload, editableTextRegions: [{ ...validPayload.editableTextRegions[0], x: 2 }] }, { code: "INVALID_FIELD", path: "editableTextRegions[0].x" }],
    ["an empty color cell", { ...validPayload, cells: ["", null, "M02", "M01"] }, { code: "INVALID_FIELD", path: "cells[0]" }],
    ["an array instead of a record", [], { code: "INVALID_DOCUMENT", path: "" }],
    ["a nested unknown palette field", { ...validPayload, palette: { ...validPayload.palette, extra: true } }, { code: "UNKNOWN_FIELD", path: "palette.extra" }],
    ["a non-positive width", { ...validPayload, width: 0 }, { code: "INVALID_FIELD", path: "width" }],
    ["out-of-bounds text y", { ...validPayload, editableTextRegions: [{ ...validPayload.editableTextRegions[0], y: 2 }] }, { code: "INVALID_FIELD", path: "editableTextRegions[0].y" }],
  ])("rejects %s", (_name, input, error) => {
    expect(validateGalleryPayload(input)).toEqual({ ok: false, error });
  });

  test.each([
    ["an unknown summary field", { ...validSummary, payload: validPayload }, { code: "UNKNOWN_FIELD", path: "payload" }],
    ["duplicate tags", { ...validSummary, tags: { ...validSummary.tags, usage: ["coaster", "coaster"] } }, { code: "INVALID_FIELD", path: "tags.usage[1]" }],
    ["an invalid timestamp", { ...validSummary, publishedAt: "not-a-timestamp" }, { code: "INVALID_FIELD", path: "publishedAt" }],
    ["a non-ISO timestamp", { ...validSummary, publishedAt: "09/03/2026" }, { code: "INVALID_FIELD", path: "publishedAt" }],
    ["an impossible ISO date", { ...validSummary, publishedAt: "2026-02-30T00:00:00.000Z" }, { code: "INVALID_FIELD", path: "publishedAt" }],
    ["an empty tag list", { ...validSummary, tags: { ...validSummary.tags, usage: [] } }, { code: "INVALID_FIELD", path: "tags.usage" }],
    ["oversized dimensions", { ...validSummary, width: 201 }, { code: "INVALID_FIELD", path: "width" }],
  ])("rejects summary with %s", (_name, input, error) => {
    expect(validatePatternSummary(input)).toEqual({ ok: false, error });
  });

  test("rejects a detail with an invalid payload SHA", () => {
    expect(validatePatternDetail({ ...validDetail, payload: { ...validDetail.payload, sha256: "bad" } })).toEqual({
      ok: false,
      error: { code: "INVALID_FIELD", path: "payload.sha256" },
    });
  });

  test.each([
    ["an uppercase SHA", "A".repeat(64)],
    ["a short SHA", "a".repeat(63)],
  ])("rejects a detail with %s", (_name, sha256) => {
    expect(validatePatternDetail({ ...validDetail, payload: { ...validDetail.payload, sha256 } })).toEqual({
      ok: false,
      error: { code: "INVALID_FIELD", path: "payload.sha256" },
    });
  });

  test("accepts a bounded multi-dimensional gallery query", () => {
    const query = { search: "flower", usageTags: ["gift"], themeTags: ["floral"], featureTags: ["text"], order: "featured", limit: 24 };
    expect(validateGalleryListQuery(query)).toEqual({ ok: true, value: query });
  });

  test.each([
    ["untrimmed search", { search: " flower ", order: "featured", limit: 12 }, "search"],
    ["excessive limit", { order: "featured", limit: 25 }, "limit"],
    ["empty tag", { usageTags: [""], order: "featured", limit: 12 }, "usageTags[0]"],
    ["duplicate tag", { themeTags: ["cute", "cute"], order: "featured", limit: 12 }, "themeTags[1]"],
    ["oversized search", { search: "x".repeat(81), order: "featured", limit: 12 }, "search"],
    ["too many tags", { usageTags: Array.from({ length: 9 }, (_, index) => `tag-${index}`), order: "featured", limit: 12 }, "usageTags"],
    ["oversized tag", { featureTags: ["x".repeat(33)], order: "featured", limit: 12 }, "featureTags[0]"],
  ])("rejects query with %s", (_name, query, path) => {
    expect(validateGalleryListQuery(query)).toEqual({ ok: false, error: { code: "INVALID_FIELD", path } });
  });
});
