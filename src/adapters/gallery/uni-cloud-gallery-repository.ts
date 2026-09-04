import type {
  GalleryPayloadSource,
  GalleryRepository,
} from "../../domain/contracts";
import type {
  GalleryCategory,
  GalleryErrorCode,
  GalleryPage,
  GalleryPatternDetail,
  GalleryPatternSummary,
  GalleryResult,
} from "../../domain/gallery";
import {
  validateGalleryCategory,
  validatePatternDetail,
  validatePatternSummary,
} from "../../domain/gallery";

import type { GalleryCloudDependencies } from "./platform";

const publicErrorCodes = new Set<GalleryErrorCode>([
  "INVALID_REQUEST",
  "NOT_FOUND",
  "ASSET_UNAVAILABLE",
  "NETWORK_ERROR",
  "UNSUPPORTED_VERSION",
  "INTERNAL_ERROR",
]);

function isPublicErrorCode(code: string): code is GalleryErrorCode {
  return publicErrorCodes.has(code as GalleryErrorCode);
}

function failure<T>(code: GalleryErrorCode): GalleryResult<T> {
  return { ok: false, error: { code } } as GalleryResult<T>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloudFailure<T>(input: unknown): GalleryResult<T> {
  if (!isRecord(input) || input.ok !== false || !isRecord(input.error) || typeof input.error.code !== "string") {
    return failure("INTERNAL_ERROR");
  }
  return failure(isPublicErrorCode(input.error.code) ? input.error.code : "INTERNAL_ERROR");
}

function responseData(input: unknown): { ok: true; data: unknown } | null {
  if (!isRecord(input) || input.ok !== true || !("data" in input)) return null;
  return { ok: true, data: input.data };
}

function validateCategories(input: unknown): GalleryResult<GalleryCategory[]> {
  if (!Array.isArray(input)) return failure("INTERNAL_ERROR");
  const categories: GalleryCategory[] = [];
  for (const item of input) {
    const result = validateGalleryCategory(item);
    if (!result.ok) return failure("INTERNAL_ERROR");
    categories.push(result.value);
  }
  return { ok: true, data: categories };
}

function validatePage(input: unknown): GalleryResult<GalleryPage<GalleryPatternSummary>> {
  if (!isRecord(input) || Object.keys(input).some((key) => key !== "items" && key !== "nextCursor") || !Array.isArray(input.items)) {
    return failure("INTERNAL_ERROR");
  }
  if (input.nextCursor !== undefined && (typeof input.nextCursor !== "string" || input.nextCursor.length === 0)) {
    return failure("INTERNAL_ERROR");
  }
  const items: GalleryPatternSummary[] = [];
  for (const item of input.items) {
    const result = validatePatternSummary(item);
    if (!result.ok) return failure("INTERNAL_ERROR");
    items.push(result.value);
  }
  return { ok: true, data: input.nextCursor === undefined ? { items } : { items, nextCursor: input.nextCursor } };
}

function validateDetail(input: unknown): GalleryResult<GalleryPatternDetail | null> {
  if (input === null) return { ok: true, data: null };
  const result = validatePatternDetail(input);
  return result.ok ? { ok: true, data: result.value } : failure("INTERNAL_ERROR");
}

async function mapCloud<T>(
  request: () => Promise<unknown>,
  validate: (input: unknown) => GalleryResult<T>,
): Promise<GalleryResult<T>> {
  try {
    const response = await request();
    const successful = responseData(response);
    return successful ? validate(successful.data) : cloudFailure(response);
  } catch {
    return failure("NETWORK_ERROR");
  }
}

export function createUniCloudGalleryRepository(dependencies: GalleryCloudDependencies): GalleryRepository {
  return {
    listCategories: () => mapCloud(dependencies.listCategories, validateCategories),
    listPatterns: (query) => mapCloud(() => dependencies.listPatterns(query), validatePage),
    getPattern: (id) => mapCloud(() => dependencies.getPattern(id), validateDetail),
  };
}

export function createUniCloudGalleryPayloadSource(dependencies: GalleryCloudDependencies): GalleryPayloadSource {
  return {
    async download(descriptor) {
      try {
        const text = await dependencies.downloadText(descriptor.fileRef);
        return typeof text === "string" ? { ok: true, data: text } : failure("INTERNAL_ERROR");
      } catch {
        return failure("NETWORK_ERROR");
      }
    },
  };
}
