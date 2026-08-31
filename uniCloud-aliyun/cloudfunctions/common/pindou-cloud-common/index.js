"use strict";

const COLLECTIONS = Object.freeze({
  projects: "pindou-projects",
  galleryCategories: "pindou-gallery-categories",
  galleryPatterns: "pindou-gallery-patterns",
  diyCategories: "pindou-diy-categories",
  diyElements: "pindou-diy-elements",
});

const PUBLIC_ERROR_CODES = new Set([
  "CLOUD_NOT_CONFIGURED",
  "IDENTITY_REQUIRED",
  "PERMISSION_DENIED",
  "INVALID_REQUEST",
  "INTERNAL_ERROR",
]);

function success(data) {
  return { ok: true, data };
}

function failure(code) {
  const publicCode = PUBLIC_ERROR_CODES.has(code) ? code : "INTERNAL_ERROR";
  return { ok: false, error: { code: publicCode } };
}

function toPublicFailure(error) {
  return failure(error && error.code);
}

function createIdentityResolver(checkToken) {
  return async function resolveIdentity(token) {
    if (typeof token !== "string" || token.length === 0) {
      return failure("IDENTITY_REQUIRED");
    }

    try {
      const result = await checkToken(token);
      if (result && result.errCode === 0 && typeof result.uid === "string" && result.uid) {
        return success({ uid: result.uid });
      }
      return failure("IDENTITY_REQUIRED");
    } catch (error) {
      return toPublicFailure(error);
    }
  };
}

module.exports = {
  COLLECTIONS,
  createIdentityResolver,
  failure,
  success,
  toPublicFailure,
};
