import { MVP_BEAD_SIZE_MM, PROJECT_VERSION } from "./types";
import type { PindouProjectV1 } from "./types";

export type ProjectValidationErrorCode =
  | "INVALID_DOCUMENT"
  | "UNSUPPORTED_VERSION"
  | "INVALID_FIELD"
  | "CELL_COUNT_MISMATCH";

export type ProjectValidationResult =
  | { ok: true; value: PindouProjectV1 }
  | {
      ok: false;
      error: { code: ProjectValidationErrorCode; path: string };
    };

export function validateProject(input: unknown): ProjectValidationResult {
  if (!isRecord(input)) return failure("INVALID_DOCUMENT", "");
  if (input.version !== PROJECT_VERSION) return failure("UNSUPPORTED_VERSION", "version");
  if (!isNonEmptyString(input.id)) return failure("INVALID_FIELD", "id");
  if (typeof input.name !== "string") return failure("INVALID_FIELD", "name");
  if (!isPositiveInteger(input.width)) return failure("INVALID_FIELD", "width");
  if (!isPositiveInteger(input.height)) return failure("INVALID_FIELD", "height");
  if (input.beadSizeMm !== MVP_BEAD_SIZE_MM) return failure("INVALID_FIELD", "beadSizeMm");
  if (!isPaletteReference(input.palette)) return paletteFailure(input.palette);
  if (!Array.isArray(input.cells)) return failure("INVALID_FIELD", "cells");
  if (input.cells.length !== input.width * input.height) {
    return failure("CELL_COUNT_MISMATCH", "cells");
  }

  const invalidCellIndex = input.cells.findIndex(
    (cell) => cell !== null && !isNonEmptyString(cell),
  );
  if (invalidCellIndex >= 0) return failure("INVALID_FIELD", `cells[${invalidCellIndex}]`);
  if (input.direction !== "normal" && input.direction !== "reverse") {
    return failure("INVALID_FIELD", "direction");
  }
  if (!Array.isArray(input.texts)) return failure("INVALID_FIELD", "texts");

  for (let index = 0; index < input.texts.length; index += 1) {
    if (!isEditableText(input.texts[index])) {
      return failure("INVALID_FIELD", `texts[${index}]`);
    }
  }

  if (!isAnnotations(input.annotations)) return failure("INVALID_FIELD", "annotations");
  if (!isIsoTimestamp(input.createdAt)) return failure("INVALID_FIELD", "createdAt");
  if (!isIsoTimestamp(input.updatedAt)) return failure("INVALID_FIELD", "updatedAt");
  if (!isOptionalString(input.ownerId)) return failure("INVALID_FIELD", "ownerId");
  if (!isOptionalString(input.uploadedAt, isIsoTimestamp)) return failure("INVALID_FIELD", "uploadedAt");
  if (!isOptionalString(input.previewRef)) return failure("INVALID_FIELD", "previewRef");

  const sourceFailure = validateSource(input.source);
  if (sourceFailure) return sourceFailure;

  return { ok: true, value: input as unknown as PindouProjectV1 };
}

function validateSource(source: unknown): ProjectValidationResult | null {
  if (!isRecord(source) || !isNonEmptyString(source.type)) {
    return failure("INVALID_FIELD", "source.type");
  }

  if (source.type === "photo") {
    for (const field of ["originalPhoto", "originalPhotoPath", "originalPhotoBytes"]) {
      if (field in source) return failure("INVALID_FIELD", `source.${field}`);
    }
    if (!isPhotoSettings(source.settings)) return failure("INVALID_FIELD", "source.settings");
    return null;
  }

  if (source.type === "gallery") {
    if (!isNonEmptyString(source.patternId)) return failure("INVALID_FIELD", "source.patternId");
    if (!isNonEmptyString(source.patternVersion)) return failure("INVALID_FIELD", "source.patternVersion");
    return null;
  }

  if (source.type === "diy") {
    if (!Array.isArray(source.objects)) return failure("INVALID_FIELD", "source.objects");
    for (let index = 0; index < source.objects.length; index += 1) {
      const object = source.objects[index];
      if (!isRecord(object) || (object.type !== "catalog-element" && object.type !== "text")) {
        return failure("INVALID_FIELD", `source.objects[${index}].type`);
      }
      if (!isDiyObject(object)) return failure("INVALID_FIELD", `source.objects[${index}]`);
    }
    return null;
  }

  return failure("INVALID_FIELD", "source.type");
}

function isPhotoSettings(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (value.cropMode === "crop-fill" || value.cropMode === "fit")
    && (value.alignment === "center" || value.alignment === "top" || value.alignment === "bottom")
    && isFiniteNumber(value.cropCenterX)
    && isFiniteNumber(value.cropCenterY)
    && isFiniteNumber(value.cropZoom)
    && (value.backgroundColorId === null || isNonEmptyString(value.backgroundColorId))
    && ["photo", "portrait", "pixel-art", "text-sign"].includes(String(value.preset))
    && isPositiveInteger(value.colorCount)
    && isFiniteNumber(value.brightness)
    && isFiniteNumber(value.contrast)
    && isFiniteNumber(value.ditheringStrength);
}

function isDiyObject(value: Record<string, unknown>): boolean {
  if (!isNonEmptyString(value.id) || !Number.isInteger(value.zIndex)) return false;
  if (value.type === "text") return isNonEmptyString(value.textId);
  return isNonEmptyString(value.elementId)
    && isNonEmptyString(value.elementVersion)
    && Number.isInteger(value.x)
    && Number.isInteger(value.y)
    && [50, 75, 100, 125, 150].includes(Number(value.scale))
    && typeof value.flippedHorizontally === "boolean"
    && isRecord(value.colorRoleOverrides)
    && Object.values(value.colorRoleOverrides).every(isNonEmptyString);
}

function isEditableText(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && typeof value.content === "string"
    && Number.isInteger(value.x)
    && Number.isInteger(value.y)
    && isNonEmptyString(value.fontId)
    && isPositiveInteger(value.size)
    && isNonEmptyString(value.colorId);
}

function isPaletteReference(value: unknown): boolean {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.version);
}

function paletteFailure(value: unknown): ProjectValidationResult {
  if (!isRecord(value) || !isNonEmptyString(value.id)) {
    return failure("INVALID_FIELD", "palette.id");
  }
  return failure("INVALID_FIELD", "palette.version");
}

function isAnnotations(value: unknown): boolean {
  return isRecord(value)
    && isOptionalString(value.title)
    && isOptionalString(value.author)
    && isOptionalString(value.notes);
}

function isIsoTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isOptionalString(
  value: unknown,
  validator: (candidate: unknown) => candidate is string = isNonEmptyString,
): boolean {
  return value === undefined || validator(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(code: ProjectValidationErrorCode, path: string): ProjectValidationResult {
  return { ok: false, error: { code, path } };
}
