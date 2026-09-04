import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const categoriesSchema = JSON.parse(readFileSync("uniCloud-aliyun/database/pindou-gallery-categories.schema.json", "utf8"));
const patternsSchema = JSON.parse(readFileSync("uniCloud-aliyun/database/pindou-gallery-patterns.schema.json", "utf8"));

const publicationRead = "doc.publish_status == 'published' && doc.license_status == 'approved' && doc.review_status == 'approved'";

describe("gallery database schemas", () => {
  test("deny ordinary writes while allowing only fully approved public records", () => {
    for (const schema of [categoriesSchema, patternsSchema]) {
      expect(schema.permission).toEqual({ read: publicationRead, create: false, update: false, delete: false });
      expect(schema.additionalProperties).toBe(false);
    }
  });

  test("exposes category routing and publication metadata", () => {
    expect(categoriesSchema.required).toEqual(expect.arrayContaining(["slug", "short_label", "quick_entry", "publish_status", "license_status", "review_status"]));
    expect(categoriesSchema.properties).toHaveProperty("cover_ref");
  });

  test("stores pattern payload metadata without embedding editable cells", () => {
    expect(patternsSchema.required).toEqual(expect.arrayContaining([
      "usage_tags", "theme_tags", "feature_tags", "difficulty", "size_class", "card_cover_ref", "detail_preview_ref",
      "payload_file_ref", "payload_format_version", "payload_byte_size", "payload_sha256", "physical_width_mm",
      "physical_height_mm", "color_count", "bead_count", "recommendation_weight", "published_at",
    ]));
    expect(patternsSchema.properties).not.toHaveProperty("cell_data");
    expect(patternsSchema.properties).not.toHaveProperty("category_id");
  });
});
