import { createRequire } from "node:module";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const require = createRequire(import.meta.url);
const commonPath = resolve(
  process.cwd(),
  "uniCloud-aliyun/cloudfunctions/common/pindou-cloud-common/index.js",
);
const {
  COLLECTIONS,
  createIdentityResolver,
  failure,
  success,
  toPublicFailure,
} = require(commonPath);

describe("pindou-cloud-common", () => {
  test("uses stable collection names", () => {
    expect(COLLECTIONS).toEqual({
      projects: "pindou-projects",
      galleryCategories: "pindou-gallery-categories",
      galleryPatterns: "pindou-gallery-patterns",
      diyCategories: "pindou-diy-categories",
      diyElements: "pindou-diy-elements",
    });
  });

  test("returns stable success and failure envelopes", () => {
    expect(success({ id: "project-1" })).toEqual({
      ok: true,
      data: { id: "project-1" },
    });
    expect(failure("PERMISSION_DENIED")).toEqual({
      ok: false,
      error: { code: "PERMISSION_DENIED" },
    });
  });

  test("does not expose unexpected internal errors", () => {
    expect(toPublicFailure(new Error("space-id secret query failed"))).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR" },
    });
  });

  test("requires a token before checking identity", async () => {
    const resolveIdentity = createIdentityResolver(async () => {
      throw new Error("must not be called");
    });

    expect(await resolveIdentity("")).toEqual({
      ok: false,
      error: { code: "IDENTITY_REQUIRED" },
    });
  });

  test("returns only the UID verified by uni-id", async () => {
    const resolveIdentity = createIdentityResolver(async (token: string) => ({
      errCode: 0,
      uid: token === "valid-token" ? "verified-user" : "",
    }));

    expect(await resolveIdentity("valid-token", { uid: "attacker" })).toEqual({
      ok: true,
      data: { uid: "verified-user" },
    });
  });

  test("maps rejected and failed token checks to public errors", async () => {
    const rejected = createIdentityResolver(async () => ({ errCode: "TOKEN_INVALID" }));
    const crashed = createIdentityResolver(async () => {
      throw new Error("database details");
    });

    expect(await rejected("bad-token")).toEqual({
      ok: false,
      error: { code: "IDENTITY_REQUIRED" },
    });
    expect(await crashed("token")).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR" },
    });
  });
});
