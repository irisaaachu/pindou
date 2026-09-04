import { createHash } from "node:crypto";

const categoryFields = ["id", "version", "slug", "name", "shortLabel", "quickEntry", "coverRef", "creator", "sourceType", "sourceReference", "licenseStatus", "reviewStatus", "acquiredAt", "publishStatus", "order"];
const patternFields = ["id", "version", "name", "usageTags", "themeTags", "featureTags", "difficulty", "sizeClass", "coverRef", "previewRef", "payload", "width", "height", "physicalWidthMm", "physicalHeightMm", "palette", "direction", "colorCount", "beadCount", "recommendationWeight", "publishedAt", "creator", "sourceType", "sourceReference", "licenseStatus", "reviewStatus", "acquiredAt", "publishStatus", "order"];
const provenanceFields = ["creator", "sourceType", "sourceReference", "licenseStatus", "reviewStatus", "acquiredAt", "publishStatus"];

export async function validateCatalog(catalog, readAsset) {
  const issues = [];
  if (!isRecord(catalog)) return [{ path: "", message: "Catalog must be an object." }];
  validateFields(catalog, ["catalogVersion", "categories", "patterns"], "", issues);
  if (catalog.catalogVersion !== 1) issue(issues, "catalogVersion", "Catalog version must be 1.");
  if (!Array.isArray(catalog.categories)) issue(issues, "categories", "Categories must be an array.");
  if (!Array.isArray(catalog.patterns)) issue(issues, "patterns", "Patterns must be an array.");
  if (!Array.isArray(catalog.categories) || !Array.isArray(catalog.patterns)) return issues;

  const ids = new Set();
  const slugs = new Set();
  for (let index = 0; index < catalog.categories.length; index += 1) {
    const category = catalog.categories[index];
    const path = `categories[${index}]`;
    validateCategory(category, path, issues);
    if (!isRecord(category)) continue;
    if (isNonEmptyString(category.id)) {
      if (ids.has(category.id)) issue(issues, `${path}.id`, "Content IDs must be unique.");
      ids.add(category.id);
    }
    if (isNonEmptyString(category.slug)) {
      if (slugs.has(category.slug)) issue(issues, `${path}.slug`, "Category slugs must be unique.");
      slugs.add(category.slug);
    }
  }

  for (let index = 0; index < catalog.patterns.length; index += 1) {
    const pattern = catalog.patterns[index];
    const path = `patterns[${index}]`;
    validatePattern(pattern, path, issues, ids, slugs);
    if (!isRecord(pattern) || !isRecord(pattern.payload) || !isNonEmptyString(pattern.payload.fileRef)) continue;
    let asset;
    try {
      asset = await readAsset(pattern.payload.fileRef);
    } catch {
      asset = null;
    }
    if (typeof asset !== "string") {
      issue(issues, `${path}.payload.fileRef`, "Payload asset is missing.");
      continue;
    }
    validatePayloadAsset(asset, pattern, `${path}.payload`, issues);
  }

  return issues;
}

export function compareSemanticVersions(left, right) {
  const [leftVersion] = left.split("+");
  const [rightVersion] = right.split("+");
  const leftSeparator = leftVersion.indexOf("-");
  const rightSeparator = rightVersion.indexOf("-");
  const leftCore = leftSeparator === -1 ? leftVersion : leftVersion.slice(0, leftSeparator);
  const rightCore = rightSeparator === -1 ? rightVersion : rightVersion.slice(0, rightSeparator);
  const leftPrerelease = leftSeparator === -1 ? undefined : leftVersion.slice(leftSeparator + 1);
  const rightPrerelease = rightSeparator === -1 ? undefined : rightVersion.slice(rightSeparator + 1);
  const leftParts = leftCore.split(".").map(Number);
  const rightParts = rightCore.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  if (leftPrerelease === undefined || rightPrerelease === undefined) {
    if (leftPrerelease === rightPrerelease) return 0;
    return leftPrerelease === undefined ? 1 : -1;
  }
  const leftIdentifiers = leftPrerelease.split(".");
  const rightIdentifiers = rightPrerelease.split(".");
  for (let index = 0; index < Math.max(leftIdentifiers.length, rightIdentifiers.length); index += 1) {
    const leftIdentifier = leftIdentifiers[index];
    const rightIdentifier = rightIdentifiers[index];
    if (leftIdentifier === undefined || rightIdentifier === undefined) return leftIdentifier === undefined ? -1 : 1;
    if (leftIdentifier === rightIdentifier) continue;
    const leftNumeric = /^\d+$/.test(leftIdentifier);
    const rightNumeric = /^\d+$/.test(rightIdentifier);
    if (leftNumeric && rightNumeric) return Number(leftIdentifier) - Number(rightIdentifier);
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftIdentifier < rightIdentifier ? -1 : 1;
  }
  return 0;
}

export function toCategoryImport(category) {
  return removeUndefined({
    content_id: category.id,
    version: category.version,
    slug: category.slug,
    name: category.name,
    short_label: category.shortLabel,
    quick_entry: category.quickEntry,
    cover_ref: category.coverRef,
    creator: category.creator,
    source_type: category.sourceType,
    source_reference: category.sourceReference,
    license_status: category.licenseStatus,
    review_status: category.reviewStatus,
    acquired_at: category.acquiredAt,
    publish_status: category.publishStatus,
    order: category.order,
  });
}

export function toPatternImport(pattern) {
  return removeUndefined({
    content_id: pattern.id,
    version: pattern.version,
    name: pattern.name,
    usage_tags: pattern.usageTags,
    theme_tags: pattern.themeTags,
    feature_tags: pattern.featureTags,
    difficulty: pattern.difficulty,
    size_class: pattern.sizeClass,
    card_cover_ref: pattern.coverRef,
    detail_preview_ref: pattern.previewRef,
    payload_file_ref: pattern.payload.fileRef,
    payload_format_version: pattern.payload.formatVersion,
    payload_byte_size: pattern.payload.byteSize,
    payload_sha256: pattern.payload.sha256,
    grid_width: pattern.width,
    grid_height: pattern.height,
    physical_width_mm: pattern.physicalWidthMm,
    physical_height_mm: pattern.physicalHeightMm,
    palette_id: pattern.palette.id,
    palette_version: pattern.palette.version,
    default_direction: pattern.direction,
    color_count: pattern.colorCount,
    bead_count: pattern.beadCount,
    recommendation_weight: pattern.recommendationWeight,
    published_at: pattern.publishedAt,
    creator: pattern.creator,
    source_type: pattern.sourceType,
    source_reference: pattern.sourceReference,
    license_status: pattern.licenseStatus,
    review_status: pattern.reviewStatus,
    acquired_at: pattern.acquiredAt,
    publish_status: pattern.publishStatus,
    order: pattern.order,
  });
}

function validateCategory(category, path, issues) {
  if (!isRecord(category)) return issue(issues, path, "Category must be an object.");
  validateFields(category, categoryFields, path, issues);
  validateContentIdentity(category, path, issues);
  for (const field of ["slug", "name", "shortLabel", "creator"]) validateNonEmptyString(category[field], `${path}.${field}`, issues);
  if (category.quickEntry !== true && category.quickEntry !== false) issue(issues, `${path}.quickEntry`, "Quick entry must be boolean.");
  validateOptionalString(category.coverRef, `${path}.coverRef`, issues);
  validateProvenance(category, path, issues);
  validateNonNegativeInteger(category.order, `${path}.order`, issues);
}

function validatePattern(pattern, path, issues, ids, categorySlugs) {
  if (!isRecord(pattern)) return issue(issues, path, "Pattern must be an object.");
  validateFields(pattern, patternFields, path, issues);
  validateContentIdentity(pattern, path, issues);
  if (isNonEmptyString(pattern.id)) {
    if (ids.has(pattern.id)) issue(issues, `${path}.id`, "Content IDs must be unique.");
    ids.add(pattern.id);
  }
  for (const field of ["name", "coverRef", "previewRef", "creator"]) validateNonEmptyString(pattern[field], `${path}.${field}`, issues);
  validateTagArray(pattern.usageTags, `${path}.usageTags`, issues, categorySlugs);
  validateTagArray(pattern.themeTags, `${path}.themeTags`, issues);
  validateTagArray(pattern.featureTags, `${path}.featureTags`, issues);
  if (!['beginner', 'standard', 'advanced'].includes(pattern.difficulty)) issue(issues, `${path}.difficulty`, "Difficulty is invalid.");
  if (!['small', 'medium', 'large'].includes(pattern.sizeClass)) issue(issues, `${path}.sizeClass`, "Size class is invalid.");
  validatePayloadDescriptor(pattern.payload, `${path}.payload`, issues);
  validatePositiveInteger(pattern.width, `${path}.width`, issues);
  validatePositiveInteger(pattern.height, `${path}.height`, issues);
  validatePositiveNumber(pattern.physicalWidthMm, `${path}.physicalWidthMm`, issues);
  validatePositiveNumber(pattern.physicalHeightMm, `${path}.physicalHeightMm`, issues);
  validatePalette(pattern.palette, `${path}.palette`, issues);
  if (!['normal', 'reverse'].includes(pattern.direction)) issue(issues, `${path}.direction`, "Direction is invalid.");
  for (const field of ["colorCount", "beadCount", "recommendationWeight", "order"]) validateNonNegativeInteger(pattern[field], `${path}.${field}`, issues);
  validateIsoTimestamp(pattern.publishedAt, `${path}.publishedAt`, issues);
  validateProvenance(pattern, path, issues);
}

function validatePayloadAsset(asset, pattern, path, issues) {
  const bytes = Buffer.byteLength(asset, "utf8");
  const digest = createHash("sha256").update(asset, "utf8").digest("hex");
  if (bytes !== pattern.payload.byteSize || digest !== pattern.payload.sha256) issue(issues, path, "Payload byte size or SHA-256 does not match.");
  let payload;
  try {
    payload = JSON.parse(asset);
  } catch {
    return issue(issues, path, "Payload must contain JSON.");
  }
  if (!isRecord(payload)) return issue(issues, path, "Payload must be an object.");
  validateFields(payload, ["format", "formatVersion", "contentId", "contentVersion", "width", "height", "palette", "cells", "direction", "editableTextRegions"], path, issues);
  if (payload.format !== "pindou-gallery-pattern") issue(issues, `${path}.format`, "Payload format is invalid.");
  if (payload.formatVersion !== 1) issue(issues, `${path}.formatVersion`, "Payload format version is unsupported.");
  if (payload.contentId !== pattern.id) issue(issues, `${path}.contentId`, "Payload content ID does not match.");
  if (payload.contentVersion !== pattern.version) issue(issues, `${path}.contentVersion`, "Payload content version does not match.");
  if (payload.width !== pattern.width) issue(issues, `${path}.width`, "Payload width does not match.");
  if (payload.height !== pattern.height) issue(issues, `${path}.height`, "Payload height does not match.");
  validatePalette(payload.palette, `${path}.palette`, issues);
  if (isRecord(payload.palette) && isRecord(pattern.palette) && (payload.palette.id !== pattern.palette.id || payload.palette.version !== pattern.palette.version)) issue(issues, `${path}.palette`, "Payload palette does not match.");
  if (!Array.isArray(payload.cells) || payload.cells.length !== payload.width * payload.height) issue(issues, `${path}.cells`, "Payload cells do not match dimensions.");
  else payload.cells.forEach((cell, index) => { if (cell !== null && !isNonEmptyString(cell)) issue(issues, `${path}.cells[${index}]`, "Payload cell is invalid."); });
  if (!['normal', 'reverse'].includes(payload.direction)) issue(issues, `${path}.direction`, "Payload direction is invalid.");
  validateTextRegions(payload.editableTextRegions, payload.width, payload.height, `${path}.editableTextRegions`, issues);
}

function validatePayloadDescriptor(payload, path, issues) {
  if (!isRecord(payload)) return issue(issues, path, "Payload descriptor must be an object.");
  validateFields(payload, ["fileRef", "formatVersion", "byteSize", "sha256"], path, issues);
  validateNonEmptyString(payload.fileRef, `${path}.fileRef`, issues);
  if (payload.formatVersion !== 1) issue(issues, `${path}.formatVersion`, "Payload format version is unsupported.");
  validateNonNegativeInteger(payload.byteSize, `${path}.byteSize`, issues);
  if (typeof payload.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(payload.sha256)) issue(issues, `${path}.sha256`, "Payload SHA-256 is invalid.");
}

function validateTextRegions(regions, width, height, path, issues) {
  if (!Array.isArray(regions)) return issue(issues, path, "Editable text regions must be an array.");
  regions.forEach((region, index) => {
    const regionPath = `${path}[${index}]`;
    if (!isRecord(region)) return issue(issues, regionPath, "Editable text region must be an object.");
    validateFields(region, ["id", "defaultText", "x", "y", "fontId", "size", "colorId", "maxLength"], regionPath, issues);
    for (const field of ["id", "fontId", "colorId"]) validateNonEmptyString(region[field], `${regionPath}.${field}`, issues);
    if (typeof region.defaultText !== "string") issue(issues, `${regionPath}.defaultText`, "Default text must be a string.");
    if (!Number.isInteger(region.x) || region.x < 0 || region.x >= width) issue(issues, `${regionPath}.x`, "Text region x is out of bounds.");
    if (!Number.isInteger(region.y) || region.y < 0 || region.y >= height) issue(issues, `${regionPath}.y`, "Text region y is out of bounds.");
    validatePositiveInteger(region.size, `${regionPath}.size`, issues);
    validatePositiveInteger(region.maxLength, `${regionPath}.maxLength`, issues);
    if (typeof region.defaultText === "string" && Number.isInteger(region.maxLength) && region.defaultText.length > region.maxLength) issue(issues, `${regionPath}.defaultText`, "Default text exceeds max length.");
  });
}

function validateContentIdentity(record, path, issues) {
  validateNonEmptyString(record.id, `${path}.id`, issues);
  if (!isSemanticVersion(record.version)) issue(issues, `${path}.version`, "Version must be semantic.");
}

function validateProvenance(record, path, issues) {
  validateOptionalString(record.sourceReference, `${path}.sourceReference`, issues);
  if (!['original', 'commissioned', 'licensed'].includes(record.sourceType)) issue(issues, `${path}.sourceType`, "Source type is invalid.");
  if (!['pending', 'approved', 'rejected'].includes(record.licenseStatus)) issue(issues, `${path}.licenseStatus`, "License status is invalid.");
  if (!['pending', 'approved', 'rejected'].includes(record.reviewStatus)) issue(issues, `${path}.reviewStatus`, "Review status is invalid.");
  validateIsoTimestamp(record.acquiredAt, `${path}.acquiredAt`, issues);
  if (!['draft', 'published', 'archived'].includes(record.publishStatus)) issue(issues, `${path}.publishStatus`, "Publish status is invalid.");
  if (record.publishStatus === 'published' && record.licenseStatus !== 'approved') issue(issues, `${path}.licenseStatus`, "Published content requires an approved license.");
  if (record.publishStatus === 'published' && record.reviewStatus !== 'approved') issue(issues, `${path}.reviewStatus`, "Published content requires an approved review.");
}

function validateTagArray(tags, path, issues, allowedValues) {
  if (!Array.isArray(tags) || tags.length === 0) return issue(issues, path, "Tags must be a non-empty array.");
  const seen = new Set();
  tags.forEach((tag, index) => {
    if (!isNonEmptyString(tag) || seen.has(tag) || (allowedValues && !allowedValues.has(tag))) issue(issues, `${path}[${index}]`, "Tag is invalid.");
    seen.add(tag);
  });
}

function validatePalette(value, path, issues) {
  if (!isRecord(value)) return issue(issues, path, "Palette must be an object.");
  validateFields(value, ["id", "version"], path, issues);
  validateNonEmptyString(value.id, `${path}.id`, issues);
  if (!isSemanticVersion(value.version)) issue(issues, `${path}.version`, "Palette version must be semantic.");
}

function validateFields(record, allowed, path, issues) {
  Object.keys(record).filter((key) => !allowed.includes(key)).forEach((key) => issue(issues, path ? `${path}.${key}` : key, "Field is not allowed."));
  allowed.filter((key) => !optionalFields.has(key) && record[key] === undefined).forEach((key) => issue(issues, path ? `${path}.${key}` : key, "Field is required."));
}

const optionalFields = new Set(["coverRef", "sourceReference"]);

function validateNonEmptyString(value, path, issues) { if (!isNonEmptyString(value)) issue(issues, path, "Value must be a non-empty string."); }
function validateOptionalString(value, path, issues) { if (value !== undefined && !isNonEmptyString(value)) issue(issues, path, "Value must be a non-empty string."); }
function validatePositiveInteger(value, path, issues) { if (!Number.isInteger(value) || value < 1) issue(issues, path, "Value must be a positive integer."); }
function validateNonNegativeInteger(value, path, issues) { if (!Number.isInteger(value) || value < 0) issue(issues, path, "Value must be a non-negative integer."); }
function validatePositiveNumber(value, path, issues) { if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) issue(issues, path, "Value must be positive."); }
function validateIsoTimestamp(value, path, issues) { if (!isIsoTimestamp(value)) issue(issues, path, "Timestamp must be ISO-8601 UTC."); }
function isRecord(value) { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isNonEmptyString(value) { return typeof value === "string" && value.trim().length > 0; }
function isSemanticVersion(value) { return typeof value === "string" && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value); }
function isIsoTimestamp(value) { if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false; const date = new Date(value); return !Number.isNaN(date.getTime()) && date.toISOString() === value; }
function issue(issues, path, message) { issues.push({ path, message }); }
function removeUndefined(record) { return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)); }
