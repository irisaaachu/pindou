import type {
  GalleryCategory,
  GalleryListQuery,
  GalleryPatternDetail,
  GalleryPatternPayloadV1,
  GalleryPatternSummary,
} from "./types";

type GalleryValidationErrorCode =
  | "INVALID_DOCUMENT"
  | "INVALID_FIELD"
  | "UNKNOWN_FIELD"
  | "UNSUPPORTED_VERSION"
  | "CELL_COUNT_MISMATCH";

export type GalleryValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: GalleryValidationErrorCode; path: string } };

export function validateGalleryCategory(input: unknown): GalleryValidationResult<GalleryCategory> {
  if (!isRecord(input)) return failure("INVALID_DOCUMENT", "");
  const fields = unknownField(input, ["id", "version", "slug", "name", "shortLabel", "quickEntry", "order", "coverRef"]);
  if (fields) return fields;
  if (!isNonEmptyString(input.id)) return failure("INVALID_FIELD", "id");
  if (!isNonEmptyString(input.version)) return failure("INVALID_FIELD", "version");
  if (!isNonEmptyString(input.slug)) return failure("INVALID_FIELD", "slug");
  if (!isNonEmptyString(input.name)) return failure("INVALID_FIELD", "name");
  if (!isNonEmptyString(input.shortLabel)) return failure("INVALID_FIELD", "shortLabel");
  if (typeof input.quickEntry !== "boolean") return failure("INVALID_FIELD", "quickEntry");
  if (!Number.isInteger(input.order) || Number(input.order) < 0) return failure("INVALID_FIELD", "order");
  if (!isOptionalNonEmptyString(input.coverRef)) return failure("INVALID_FIELD", "coverRef");
  return success(input as unknown as GalleryCategory);
}

export function validatePatternSummary(input: unknown): GalleryValidationResult<GalleryPatternSummary> {
  if (!isRecord(input)) return failure("INVALID_DOCUMENT", "");
  const fields = unknownField(input, summaryFields);
  if (fields) return fields;
  const basic = validateSummaryFields(input);
  if (basic) return basic;
  return success(input as unknown as GalleryPatternSummary);
}

export function validatePatternDetail(input: unknown): GalleryValidationResult<GalleryPatternDetail> {
  if (!isRecord(input)) return failure("INVALID_DOCUMENT", "");
  const fields = unknownField(input, [...summaryFields, "description", "previewRef", "physicalWidthMm", "physicalHeightMm", "palette", "direction", "colorCount", "beadCount", "editableTextRegions", "creator", "sourceType", "sourceReference", "payload"]);
  if (fields) return fields;
  const basic = validateSummaryFields(input);
  if (basic) return basic;
  if (!isNonEmptyString(input.description)) return failure("INVALID_FIELD", "description");
  if (!isNonEmptyString(input.previewRef)) return failure("INVALID_FIELD", "previewRef");
  if (!isPositiveNumber(input.physicalWidthMm)) return failure("INVALID_FIELD", "physicalWidthMm");
  if (!isPositiveNumber(input.physicalHeightMm)) return failure("INVALID_FIELD", "physicalHeightMm");
  const palette = validatePalette(input.palette, "palette");
  if (palette) return palette;
  if (!isDirection(input.direction)) return failure("INVALID_FIELD", "direction");
  if (!isPositiveInteger(input.colorCount)) return failure("INVALID_FIELD", "colorCount");
  if (!isPositiveInteger(input.beadCount)) return failure("INVALID_FIELD", "beadCount");
  const text = validateTextRegions(input.editableTextRegions, Number(input.width), Number(input.height));
  if (text) return text;
  if (!isNonEmptyString(input.creator)) return failure("INVALID_FIELD", "creator");
  if (!["original", "commissioned", "licensed"].includes(String(input.sourceType))) return failure("INVALID_FIELD", "sourceType");
  if (!isOptionalNonEmptyString(input.sourceReference)) return failure("INVALID_FIELD", "sourceReference");
  const descriptor = validatePayloadDescriptor(input.payload, "payload");
  if (descriptor) return descriptor;
  return success(input as unknown as GalleryPatternDetail);
}

export function validateGalleryPayload(input: unknown): GalleryValidationResult<GalleryPatternPayloadV1> {
  if (!isRecord(input)) return failure("INVALID_DOCUMENT", "");
  const fields = unknownField(input, ["format", "formatVersion", "contentId", "contentVersion", "width", "height", "palette", "cells", "direction", "editableTextRegions"]);
  if (fields) return fields;
  if (input.format !== "pindou-gallery-pattern") return failure("INVALID_FIELD", "format");
  if (input.formatVersion !== 1) return failure("UNSUPPORTED_VERSION", "formatVersion");
  if (!isNonEmptyString(input.contentId)) return failure("INVALID_FIELD", "contentId");
  if (!isNonEmptyString(input.contentVersion)) return failure("INVALID_FIELD", "contentVersion");
  const dimensions = validateDimensions(input);
  if (dimensions) return dimensions;
  const palette = validatePalette(input.palette, "palette");
  if (palette) return palette;
  if (!Array.isArray(input.cells)) return failure("INVALID_FIELD", "cells");
  if (input.cells.length !== Number(input.width) * Number(input.height)) return failure("CELL_COUNT_MISMATCH", "cells");
  for (let index = 0; index < input.cells.length; index += 1) {
    if (input.cells[index] !== null && !isNonEmptyString(input.cells[index])) return failure("INVALID_FIELD", `cells[${index}]`);
  }
  if (!isDirection(input.direction)) return failure("INVALID_FIELD", "direction");
  const text = validateTextRegions(input.editableTextRegions, Number(input.width), Number(input.height));
  if (text) return text;
  return success(input as unknown as GalleryPatternPayloadV1);
}

export function validateGalleryListQuery(input: unknown): GalleryValidationResult<GalleryListQuery> {
  if (!isRecord(input)) return failure("INVALID_DOCUMENT", "");
  const fields = unknownField(input, ["search", "usageTags", "themeTags", "featureTags", "difficulty", "sizeClass", "order", "cursor", "limit"]);
  if (fields) return fields;
  if (input.search !== undefined && (!isNonEmptyString(input.search) || input.search !== input.search.trim() || input.search.length > 80)) return failure("INVALID_FIELD", "search");
  for (const name of ["usageTags", "themeTags", "featureTags"] as const) {
    const tags = validateOptionalTagArray(input[name], name);
    if (tags) return tags;
  }
  if (input.difficulty !== undefined && !["beginner", "standard", "advanced"].includes(String(input.difficulty))) return failure("INVALID_FIELD", "difficulty");
  if (input.sizeClass !== undefined && !["small", "medium", "large"].includes(String(input.sizeClass))) return failure("INVALID_FIELD", "sizeClass");
  if (!["featured", "newest"].includes(String(input.order))) return failure("INVALID_FIELD", "order");
  if (!isOptionalNonEmptyString(input.cursor) || (typeof input.cursor === "string" && input.cursor !== input.cursor.trim())) return failure("INVALID_FIELD", "cursor");
  if (!Number.isInteger(input.limit) || Number(input.limit) < 1 || Number(input.limit) > 24) return failure("INVALID_FIELD", "limit");
  return success(input as unknown as GalleryListQuery);
}

const summaryFields = ["id", "version", "name", "coverRef", "width", "height", "difficulty", "sizeClass", "tags", "hasEditableText", "publishedAt"];

function validateSummaryFields(input: Record<string, unknown>): GalleryValidationResult<never> | null {
  if (!isNonEmptyString(input.id)) return failure("INVALID_FIELD", "id");
  if (!isNonEmptyString(input.version)) return failure("INVALID_FIELD", "version");
  if (!isNonEmptyString(input.name)) return failure("INVALID_FIELD", "name");
  if (!isNonEmptyString(input.coverRef)) return failure("INVALID_FIELD", "coverRef");
  const dimensions = validateDimensions(input);
  if (dimensions) return dimensions;
  if (!["beginner", "standard", "advanced"].includes(String(input.difficulty))) return failure("INVALID_FIELD", "difficulty");
  if (!["small", "medium", "large"].includes(String(input.sizeClass))) return failure("INVALID_FIELD", "sizeClass");
  const tags = validateTags(input.tags);
  if (tags) return tags;
  if (typeof input.hasEditableText !== "boolean") return failure("INVALID_FIELD", "hasEditableText");
  if (!isIsoTimestamp(input.publishedAt)) return failure("INVALID_FIELD", "publishedAt");
  return null;
}

function validateDimensions(input: Record<string, unknown>): GalleryValidationResult<never> | null {
  if (!isDimension(input.width)) return failure("INVALID_FIELD", "width");
  if (!isDimension(input.height)) return failure("INVALID_FIELD", "height");
  return null;
}

function validateTags(value: unknown): GalleryValidationResult<never> | null {
  if (!isRecord(value)) return failure("INVALID_FIELD", "tags");
  const fields = unknownField(value, ["usage", "themes", "features"], "tags");
  if (fields) return fields;
  for (const name of ["usage", "themes", "features"] as const) {
    const tags = value[name];
    if (!Array.isArray(tags) || tags.length === 0) return failure("INVALID_FIELD", `tags.${name}`);
    const seen = new Set<string>();
    for (let index = 0; index < tags.length; index += 1) {
      if (!isNonEmptyString(tags[index]) || seen.has(tags[index])) return failure("INVALID_FIELD", `tags.${name}[${index}]`);
      seen.add(tags[index]);
    }
  }
  return null;
}

function validateOptionalTagArray(value: unknown, path: string): GalleryValidationResult<never> | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return failure("INVALID_FIELD", path);
  if (value.length > 8) return failure("INVALID_FIELD", path);
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const tag = value[index];
    if (!isNonEmptyString(tag) || tag !== tag.trim() || tag.length > 32 || seen.has(tag)) return failure("INVALID_FIELD", `${path}[${index}]`);
    seen.add(tag);
  }
  return null;
}

function validateTextRegions(value: unknown, width: number, height: number): GalleryValidationResult<never> | null {
  if (!Array.isArray(value)) return failure("INVALID_FIELD", "editableTextRegions");
  for (let index = 0; index < value.length; index += 1) {
    const region = value[index];
    const path = `editableTextRegions[${index}]`;
    if (!isRecord(region)) return failure("INVALID_FIELD", path);
    const fields = unknownField(region, ["id", "defaultText", "x", "y", "fontId", "size", "colorId", "maxLength"], path);
    if (fields) return fields;
    if (!isNonEmptyString(region.id)) return failure("INVALID_FIELD", `${path}.id`);
    if (typeof region.defaultText !== "string") return failure("INVALID_FIELD", `${path}.defaultText`);
    if (!Number.isInteger(region.x) || Number(region.x) < 0 || Number(region.x) >= width) return failure("INVALID_FIELD", `${path}.x`);
    if (!Number.isInteger(region.y) || Number(region.y) < 0 || Number(region.y) >= height) return failure("INVALID_FIELD", `${path}.y`);
    if (!isNonEmptyString(region.fontId)) return failure("INVALID_FIELD", `${path}.fontId`);
    if (!isPositiveInteger(region.size)) return failure("INVALID_FIELD", `${path}.size`);
    if (!isNonEmptyString(region.colorId)) return failure("INVALID_FIELD", `${path}.colorId`);
    if (!isPositiveInteger(region.maxLength) || region.defaultText.length > region.maxLength) return failure("INVALID_FIELD", `${path}.maxLength`);
  }
  return null;
}

function validatePalette(value: unknown, path: string): GalleryValidationResult<never> | null {
  if (!isRecord(value)) return failure("INVALID_FIELD", path);
  const fields = unknownField(value, ["id", "version"], path);
  if (fields) return fields;
  if (!isNonEmptyString(value.id)) return failure("INVALID_FIELD", `${path}.id`);
  if (!isNonEmptyString(value.version)) return failure("INVALID_FIELD", `${path}.version`);
  return null;
}

function validatePayloadDescriptor(value: unknown, path: string): GalleryValidationResult<never> | null {
  if (!isRecord(value)) return failure("INVALID_FIELD", path);
  const fields = unknownField(value, ["fileRef", "formatVersion", "byteSize", "sha256"], path);
  if (fields) return fields;
  if (!isNonEmptyString(value.fileRef)) return failure("INVALID_FIELD", `${path}.fileRef`);
  if (value.formatVersion !== 1) return failure("UNSUPPORTED_VERSION", `${path}.formatVersion`);
  if (!isPositiveInteger(value.byteSize)) return failure("INVALID_FIELD", `${path}.byteSize`);
  if (typeof value.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.sha256)) return failure("INVALID_FIELD", `${path}.sha256`);
  return null;
}

function unknownField(value: Record<string, unknown>, allowed: string[], prefix = ""): GalleryValidationResult<never> | null {
  const field = Object.keys(value).find((key) => !allowed.includes(key));
  return field ? failure("UNKNOWN_FIELD", prefix ? `${prefix}.${field}` : field) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalNonEmptyString(value: unknown): boolean {
  return value === undefined || isNonEmptyString(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isDimension(value: unknown): value is number {
  return isPositiveInteger(value) && value <= 200;
}

function isDirection(value: unknown): boolean {
  return value === "normal" || value === "reverse";
}

function isIsoTimestamp(value: unknown): boolean {
  if (!isNonEmptyString(value) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function success<T>(value: T): GalleryValidationResult<T> {
  return { ok: true, value };
}

function failure(code: GalleryValidationErrorCode, path: string): GalleryValidationResult<never> {
  return { ok: false, error: { code, path } };
}
