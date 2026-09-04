import { createRequire } from "node:module";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const require = createRequire(import.meta.url);
const corePath = resolve(process.cwd(), "uniCloud-aliyun/cloudfunctions/pindou-gallery/gallery-core.js");
const {
  buildCategoryQuery,
  buildPatternQuery,
  decodeCursor,
  encodeCursor,
  projectCategory,
  projectPatternSummary,
  projectPatternDetail,
  validateListQuery,
} = require(corePath);

const published = {
  publish_status: "published",
  license_status: "approved",
  review_status: "approved",
};

describe("pindou gallery core", () => {
  test("normalizes search and bounds list limits", () => {
    expect(validateListQuery({ search: "  FLOWER  ", limit: 24 })).toEqual({
      search: "flower",
      usageTags: [],
      themeTags: [],
      featureTags: [],
      order: "featured",
      limit: 24,
    });
    expect(validateListQuery({})).toMatchObject({ limit: 12, order: "featured" });
    expect(() => validateListQuery({ limit: 25 })).toThrow("INVALID_REQUEST");
  });

  test("builds published selectors with intersecting tag filters", () => {
    expect(buildCategoryQuery()).toEqual(published);
    expect(buildPatternQuery({
      usageTags: ["door-sign"],
      themeTags: ["flowers"],
      featureTags: ["editable-text"],
    })).toMatchObject({
      ...published,
      usage_tags: { $in: ["door-sign"] },
      theme_tags: { $in: ["flowers"] },
      feature_tags: { $in: ["editable-text"] },
      orderBy: [["recommendation_weight", "desc"], ["published_at", "desc"], ["content_id", "asc"]],
    });
  });

  test("uses a stable newest order and rejects a cursor from another order", () => {
    const cursor = encodeCursor("featured", [10, "2026-09-03T00:00:00.000Z", "pattern-a"]);
    expect(buildPatternQuery({ order: "newest" })).toMatchObject({
      orderBy: [["published_at", "desc"], ["content_id", "asc"]],
    });
    expect(() => decodeCursor(cursor, "newest")).toThrow("INVALID_REQUEST");
    expect(() => decodeCursor("not-a-cursor", "featured")).toThrow("INVALID_REQUEST");
  });

  test("projects only safe category and summary fields", () => {
    expect(projectCategory({
      ...published,
      content_id: "usage-gift",
      version: "1.0.0",
      slug: "gift",
      name: "Gift",
      short_label: "Gift",
      quick_entry: true,
      order: 80,
      cover_ref: "cloud://cover",
      creator: "Pindou Studio",
    })).toEqual({
      id: "usage-gift",
      version: "1.0.0",
      slug: "gift",
      name: "Gift",
      shortLabel: "Gift",
      quickEntry: true,
      order: 80,
      coverRef: "cloud://cover",
    });

    const summary = projectPatternSummary(pattern());
    expect(summary).toEqual({
      id: "pattern-a",
      version: "1.0.0",
      name: "Pattern A",
      coverRef: "cloud://cover",
      width: 2,
      height: 2,
      difficulty: "beginner",
      sizeClass: "small",
      tags: { usage: ["gift"], themes: ["flowers"], features: ["editable-text"] },
      hasEditableText: true,
      publishedAt: "2026-09-03T00:00:00.000Z",
    });
    expect(JSON.stringify(summary)).not.toContain("payload_file_ref");
    expect(JSON.stringify(summary)).not.toContain("cell_data");
  });

  test("does not project unpublished pattern details", () => {
    expect(projectPatternDetail({ ...pattern(), publish_status: "archived" })).toBeNull();
    expect(projectPatternDetail({ ...pattern(), review_status: "rejected" })).toBeNull();
    expect(projectPatternDetail(pattern())).toMatchObject({
      previewRef: "cloud://preview",
      payload: { fileRef: "cloud://payload", formatVersion: 1, byteSize: 12, sha256: "a".repeat(64) },
    });
  });
});

function pattern() {
  return {
    ...published,
    content_id: "pattern-a",
    version: "1.0.0",
    name: "Pattern A",
    card_cover_ref: "cloud://cover",
    detail_preview_ref: "cloud://preview",
    payload_file_ref: "cloud://payload",
    payload_format_version: 1,
    payload_byte_size: 12,
    payload_sha256: "a".repeat(64),
    grid_width: 2,
    grid_height: 2,
    difficulty: "beginner",
    size_class: "small",
    usage_tags: ["gift"],
    theme_tags: ["flowers"],
    feature_tags: ["editable-text"],
    published_at: "2026-09-03T00:00:00.000Z",
    physical_width_mm: 10,
    physical_height_mm: 10,
    palette_id: "basic",
    palette_version: "1.0.0",
    default_direction: "normal",
    color_count: 2,
    bead_count: 4,
    recommendation_weight: 10,
    creator: "Pindou Studio",
    source_type: "original",
    editable_text_regions: [],
  };
}
