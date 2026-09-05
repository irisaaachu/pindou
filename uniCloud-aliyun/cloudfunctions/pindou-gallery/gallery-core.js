"use strict";

const PUBLICATION_SELECTOR = Object.freeze({
  publish_status: "published",
  license_status: "approved",
  review_status: "approved",
});
const FEATURED_ORDER = [["recommendation_weight", "desc"], ["published_at", "desc"], ["content_id", "asc"]];
const NEWEST_ORDER = [["published_at", "desc"], ["content_id", "asc"]];
const MAX_SEARCH_LENGTH = 80;
const MAX_TAGS_PER_DIMENSION = 8;
const MAX_TAG_LENGTH = 32;

function invalidRequest() {
  const error = new Error("INVALID_REQUEST");
  error.code = "INVALID_REQUEST";
  return error;
}

function validateListQuery(value) {
  if (value === undefined) value = {};
  if (!isRecord(value)) throw invalidRequest();
  const allowed = new Set(["search", "usageTags", "themeTags", "featureTags", "difficulty", "sizeClass", "order", "cursor", "limit"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) throw invalidRequest();

  const query = {
    usageTags: normalizeTags(value.usageTags),
    themeTags: normalizeTags(value.themeTags),
    featureTags: normalizeTags(value.featureTags),
    order: value.order === undefined ? "featured" : value.order,
    limit: value.limit === undefined ? 12 : value.limit,
  };
  if (query.order !== "featured" && query.order !== "newest") throw invalidRequest();
  if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 24) throw invalidRequest();
  if (value.search !== undefined) {
    if (typeof value.search !== "string") throw invalidRequest();
    const search = value.search.trim().toLowerCase();
    if (search.length > MAX_SEARCH_LENGTH) throw invalidRequest();
    if (search) query.search = search;
  }
  if (value.difficulty !== undefined) {
    if (!["beginner", "standard", "advanced"].includes(value.difficulty)) throw invalidRequest();
    query.difficulty = value.difficulty;
  }
  if (value.sizeClass !== undefined) {
    if (!["small", "medium", "large"].includes(value.sizeClass)) throw invalidRequest();
    query.sizeClass = value.sizeClass;
  }
  if (value.cursor !== undefined) {
    if (typeof value.cursor !== "string" || !value.cursor) throw invalidRequest();
    query.cursor = value.cursor;
  }
  return query;
}

function buildCategoryQuery() {
  return { ...PUBLICATION_SELECTOR };
}

function buildPatternQuery(value) {
  const query = validateListQuery(value);
  const selector = { ...PUBLICATION_SELECTOR };
  if (query.usageTags.length) selector.usage_tags = { $in: query.usageTags };
  if (query.themeTags.length) selector.theme_tags = { $in: query.themeTags };
  if (query.featureTags.length) selector.feature_tags = { $in: query.featureTags };
  if (query.difficulty) selector.difficulty = query.difficulty;
  if (query.sizeClass) selector.size_class = query.sizeClass;

  const clauses = [];
  if (query.search) {
    const expression = { $regex: escapeRegex(query.search), $options: "i" };
    clauses.push({ $or: [
      { name: expression },
      { usage_tags: { $in: [query.search] } },
      { theme_tags: { $in: [query.search] } },
      { feature_tags: { $in: [query.search] } },
    ] });
  }
  if (query.cursor) clauses.push(cursorClause(decodeCursor(query.cursor, query.order), query.order));
  if (clauses.length) selector.$and = clauses;

  return {
    ...selector,
    orderBy: query.order === "featured" ? FEATURED_ORDER : NEWEST_ORDER,
    limit: query.limit,
    cursor: query.cursor,
  };
}

function encodeCursor(order, tuple) {
  if ((order !== "featured" && order !== "newest") || !Array.isArray(tuple)
    || tuple.length !== (order === "featured" ? 3 : 2)
    || tuple.some((value) => typeof value !== "string" && typeof value !== "number")) {
    throw invalidRequest();
  }
  return Buffer.from(JSON.stringify({ order, tuple })).toString("base64url");
}

function decodeCursor(cursor, order) {
  if (typeof cursor !== "string" || !cursor || (order !== "featured" && order !== "newest")) throw invalidRequest();
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!isRecord(decoded) || decoded.order !== order || !Array.isArray(decoded.tuple)
      || decoded.tuple.length !== (order === "featured" ? 3 : 2)
      || decoded.tuple.some((value) => typeof value !== "string" && typeof value !== "number")) {
      throw invalidRequest();
    }
    return decoded.tuple;
  } catch (error) {
    if (error && error.code === "INVALID_REQUEST") throw error;
    throw invalidRequest();
  }
}

function projectCategory(record) {
  if (!isPublished(record)) return null;
  return removeUndefined({
    id: record.content_id,
    version: record.version,
    slug: record.slug,
    name: record.name,
    shortLabel: record.short_label,
    quickEntry: record.quick_entry,
    order: record.order,
    coverRef: record.cover_ref,
  });
}

function projectPatternSummary(record) {
  if (!isPublished(record)) return null;
  return {
    id: record.content_id,
    version: record.version,
    name: record.name,
    coverRef: record.card_cover_ref,
    width: record.grid_width,
    height: record.grid_height,
    difficulty: record.difficulty,
    sizeClass: record.size_class,
    tags: {
      usage: record.usage_tags,
      themes: record.theme_tags,
      features: record.feature_tags,
    },
    hasEditableText: Array.isArray(record.editable_text_regions) && record.editable_text_regions.length > 0
      || Array.isArray(record.feature_tags) && record.feature_tags.includes("editable-text"),
    publishedAt: record.published_at,
  };
}

function projectPatternDetail(record) {
  const summary = projectPatternSummary(record);
  if (!summary) return null;
  return removeUndefined({
    ...summary,
    description: record.description,
    previewRef: record.detail_preview_ref,
    physicalWidthMm: record.physical_width_mm,
    physicalHeightMm: record.physical_height_mm,
    palette: { id: record.palette_id, version: record.palette_version },
    direction: record.default_direction,
    colorCount: record.color_count,
    beadCount: record.bead_count,
    editableTextRegions: projectEditableTextRegions(record.editable_text_regions),
    creator: record.creator,
    sourceType: record.source_type,
    sourceReference: record.source_reference,
    payload: {
      fileRef: record.payload_file_ref,
      formatVersion: record.payload_format_version,
      byteSize: record.payload_byte_size,
      sha256: record.payload_sha256,
    },
  });
}

function projectEditableTextRegions(regions) {
  if (!Array.isArray(regions)) return [];
  return regions.map((region) => ({
    id: region.id,
    defaultText: region.default_text,
    x: region.x,
    y: region.y,
    fontId: region.font_id,
    size: region.size,
    colorId: region.color_id,
    maxLength: region.max_length,
  }));
}

function normalizeTags(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_TAGS_PER_DIMENSION
    || value.some((tag) => typeof tag !== "string" || !tag.trim() || tag.trim().length > MAX_TAG_LENGTH)) throw invalidRequest();
  const tags = value.map((tag) => tag.trim().toLowerCase());
  if (new Set(tags).size !== tags.length) throw invalidRequest();
  return tags;
}

function cursorClause(tuple, order) {
  if (order === "newest") {
    const [publishedAt, id] = tuple;
    return { $or: [
      { published_at: { $lt: publishedAt } },
      { published_at: publishedAt, content_id: { $gt: id } },
    ] };
  }
  const [weight, publishedAt, id] = tuple;
  return { $or: [
    { recommendation_weight: { $lt: weight } },
    { recommendation_weight: weight, published_at: { $lt: publishedAt } },
    { recommendation_weight: weight, published_at: publishedAt, content_id: { $gt: id } },
  ] };
}

function isPublished(record) {
  return isRecord(record)
    && record.publish_status === "published"
    && record.license_status === "approved"
    && record.review_status === "approved";
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

module.exports = {
  buildCategoryQuery,
  buildPatternQuery,
  decodeCursor,
  encodeCursor,
  projectCategory,
  projectPatternSummary,
  projectPatternDetail,
  validateListQuery,
};
