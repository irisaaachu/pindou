import { createRequire } from "node:module";
import { resolve } from "node:path";

import { describe, expect, test, vi } from "vitest";

const require = createRequire(import.meta.url);
const profileCorePath = resolve(
  process.cwd(),
  "uniCloud-aliyun/cloudfunctions/pindou-profile/profile-core.js",
);
const profileObjectPath = resolve(
  process.cwd(),
  "uniCloud-aliyun/cloudfunctions/pindou-profile/index.obj.js",
);
const {
  buildProfileUpdate,
  decodeAvatar,
  normalizeCloudNickname,
} = require(profileCorePath);

const pngBytes = Buffer.from("89504e470d0a1a0a", "hex");
const jpegBytes = Buffer.from("ffd8ffe000104a4649460001", "hex");

describe("pindou profile core", () => {
  test("normalizes nicknames like the client domain", () => {
    expect(normalizeCloudNickname("  小   豆  ")).toBe("小 豆");
  });

  test("rejects nicknames longer than twenty Unicode code points", () => {
    expect(() => normalizeCloudNickname("豆".repeat(21))).toThrow("INVALID_PROFILE");
  });

  test("marks an explicit empty nickname for removal", () => {
    expect(buildProfileUpdate({ nickname: "", avatar: null })).toEqual({
      clearNickname: true,
    });
  });

  test.each([
    ["GIF", "image/gif", Buffer.from("474946383961", "hex")],
    ["empty bytes", "image/png", Buffer.alloc(0)],
    ["declared oversized data", "image/png", pngBytes, 1_048_577],
    ["PNG declared as JPEG", "image/jpeg", pngBytes],
    ["JPEG declared as PNG", "image/png", jpegBytes],
  ])("rejects %s avatars", (_name, mimeType, bytes, size = bytes.length) => {
    expect(() => decodeAvatar({
      mimeType,
      size,
      base64: bytes.toString("base64"),
    })).toThrow("INVALID_PROFILE");
  });

  test("rejects decoded bytes over one MiB even when their declared size is small", () => {
    const bytes = Buffer.alloc(1_048_577);
    pngBytes.copy(bytes);

    expect(() => decodeAvatar({
      mimeType: "image/png",
      size: 1,
      base64: bytes.toString("base64"),
    })).toThrow("INVALID_PROFILE");
  });

  test.each([
    ["smaller", pngBytes.length - 1],
    ["larger", pngBytes.length + 1],
  ])("rejects a declared size %s than decoded avatar bytes", (_direction, size) => {
    expect(() => decodeAvatar({
      mimeType: "image/png",
      size,
      base64: pngBytes.toString("base64"),
    })).toThrow("INVALID_PROFILE");
  });

  test.each([
    ["image/png", pngBytes, "png"],
    ["image/jpeg", jpegBytes, "jpg"],
  ])("decodes valid %s avatars once with a fixed extension", (mimeType, bytes, extension) => {
    expect(decodeAvatar({
      mimeType,
      size: bytes.length,
      base64: bytes.toString("base64"),
    })).toEqual({ bytes, extension });
  });

  test("builds a sanitized update without client identity fields", () => {
    expect(buildProfileUpdate({
      uid: "attacker",
      token: "attacker-token",
      _id: "attacker-id",
      nickname: "  Pindou  ",
      avatar: {
        mimeType: "image/png",
        size: pngBytes.length,
        base64: pngBytes.toString("base64"),
      },
      role: "admin",
    })).toEqual({
      nickname: "Pindou",
      avatar: { bytes: pngBytes, extension: "png" },
    });
  });
});

describe("pindou profile cloud object", () => {
  test("getProfile reads only the checked token UID", async () => {
    const fixture = loadCloudObject({ uid: "verified-user" });
    const context = { ...makeContext(fixture.cloudObject), uid: "attacker" };

    await fixture.cloudObject._before.call(context);
    const result = await fixture.cloudObject.getProfile.call(context);

    expect(fixture.checkToken).toHaveBeenCalledWith("valid-token");
    expect(fixture.doc.mock.calls).toEqual([["verified-user"]]);
    expect(fixture.doc).not.toHaveBeenCalledWith("attacker");
    expect(result).toEqual({ ok: true, data: { uid: "verified-user" } });
  });

  test.each([
    ["missing fileID", { requestId: "request-secret" }],
    ["empty fileID", { fileID: "", requestId: "request-secret" }],
    ["non-string fileID", { fileID: 42, requestId: "request-secret" }],
    ["non-object response", "cloud://unexpected"],
  ])("sanitizes an upload response with %s", async (_name, uploadResult) => {
    const fixture = loadCloudObject({ uid: "verified-user", uploadResult });
    const context = makeContext(fixture.cloudObject);

    await fixture.cloudObject._before.call(context);
    const result = await fixture.cloudObject.updateProfile.call(context, {
      avatar: {
        mimeType: "image/png",
        size: pngBytes.length,
        base64: pngBytes.toString("base64"),
      },
    });

    expect(result).toEqual({ ok: false, error: { code: "INTERNAL_ERROR" } });
    expect(JSON.stringify(result)).not.toContain("request-secret");
    expect(fixture.update).not.toHaveBeenCalled();
  });

  test("updateProfile ignores attacker identity fields and uses only the checked UID", async () => {
    const fixture = loadCloudObject({ uid: "verified-user" });
    const context = { ...makeContext(fixture.cloudObject), uid: "attacker" };

    await fixture.cloudObject._before.call(context);
    const result = await fixture.cloudObject.updateProfile.call(context, {
      uid: "attacker",
      _id: "attacker-id",
      token: "attacker-token",
      nickname: "  Pindou  ",
      avatar: {
        mimeType: "image/png",
        size: pngBytes.length,
        base64: pngBytes.toString("base64"),
      },
      role: "admin",
    });

    expect(fixture.checkToken).toHaveBeenCalledWith("valid-token");
    expect(fixture.doc.mock.calls).toEqual([["verified-user"], ["verified-user"]]);
    expect(fixture.doc).not.toHaveBeenCalledWith("attacker");
    expect(fixture.uploadFile).toHaveBeenCalledWith(expect.objectContaining({
      cloudPath: "pindou/avatars/verified-user/profile.png",
      cloudPathAsRealPath: true,
      fileContent: pngBytes,
    }));
    expect(fixture.update).toHaveBeenCalledWith({
      nickname: "Pindou",
      avatar: "cloud://pindou/avatars/verified-user/profile.png",
    });
    expect(result).toEqual({ ok: true, data: { uid: "verified-user" } });
  });

  test.each([
    ["missing token", undefined, { errCode: 0, uid: "verified-user" }, "IDENTITY_REQUIRED", undefined],
    ["invalid token result", "bad-token", { errCode: "TOKEN_INVALID" }, "IDENTITY_REQUIRED", undefined],
    ["token SDK exception", "valid-token", new Error("token implementation details"), "INTERNAL_ERROR", undefined],
    ["client info SDK exception", "valid-token", { errCode: 0, uid: "verified-user" }, "INTERNAL_ERROR", new Error("client details")],
  ])("returns only a public %s error from _before", async (
    _name,
    token,
    checkTokenResult,
    code,
    clientInfoError,
  ) => {
    const fixture = loadCloudObject({ checkTokenResult, clientInfoError });
    const context = makeContext(fixture.cloudObject, token, clientInfoError);

    await expect(fixture.cloudObject._before.call(context)).rejects.toMatchObject({
      code,
      message: code,
    });
  });

  test("maps a uni-id factory exception to an internal public error", async () => {
    const fixture = loadCloudObject({ createInstanceError: new Error("uni-id SDK internals") });
    const context = makeContext(fixture.cloudObject);

    await expect(fixture.cloudObject._before.call(context)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      message: "INTERNAL_ERROR",
    });
  });

  test("does not rethrow an SDK error that forges an identity error code", async () => {
    const sdkError = Object.assign(new Error("SDK secret details"), {
      code: "IDENTITY_REQUIRED",
    });
    const fixture = loadCloudObject({ checkTokenResult: sdkError });
    const context = makeContext(fixture.cloudObject);

    await expect(fixture.cloudObject._before.call(context)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      message: "INTERNAL_ERROR",
    });
  });

  test("returns sanitized method failures without SDK error messages", async () => {
    const fixture = loadCloudObject({ databaseError: new Error("database secret query") });
    const context = makeContext(fixture.cloudObject);

    await fixture.cloudObject._before.call(context);
    const getResult = await fixture.cloudObject.getProfile.call(context);
    const updateResult = await fixture.cloudObject.updateProfile.call(context, "malformed");

    expect(getResult).toEqual({ ok: false, error: { code: "INTERNAL_ERROR" } });
    expect(updateResult).toEqual({ ok: false, error: { code: "INVALID_REQUEST" } });
    expect(JSON.stringify(getResult)).not.toContain("database secret query");
  });
});

function makeContext(
  cloudObject: Record<string, unknown>,
  suppliedToken?: unknown,
  clientInfoError?: Error,
) {
  const token = arguments.length === 1 ? "valid-token" : suppliedToken;
  return {
    ...cloudObject,
    getClientInfo: vi.fn(() => {
      if (clientInfoError) throw clientInfoError;
      return { appId: "app-id" };
    }),
    getUniIdToken: vi.fn(() => token),
  };
}

function loadCloudObject(options: {
  uid?: string;
  checkTokenResult?: unknown;
  clientInfoError?: Error;
  createInstanceError?: Error;
  databaseError?: Error;
  uploadResult?: unknown;
} = {}) {
  const checkToken = vi.fn(async () => {
    if (options.checkTokenResult instanceof Error) throw options.checkTokenResult;
    return options.checkTokenResult ?? { errCode: 0, uid: options.uid ?? "verified-user" };
  });
  const createInstance = vi.fn(() => {
    if (options.createInstanceError) throw options.createInstanceError;
    return { checkToken };
  });
  const update = vi.fn(async () => undefined);
  const get = vi.fn(async () => {
    if (options.databaseError) throw options.databaseError;
    return { data: [{}] };
  });
  const doc = vi.fn(() => ({ get, update }));
  const uploadFile = vi.fn(async ({ cloudPath }) => options.uploadResult ?? {
    fileID: `cloud://${cloudPath}`,
    requestId: "request-id",
  });
  const common = {
    success: (data: unknown) => ({ ok: true, data }),
    failure: (code: string) => ({ ok: false, error: { code } }),
    toPublicFailure: (error: { code?: string } | undefined) => ({
      ok: false,
      error: {
        code: error?.code === "INVALID_REQUEST" || error?.code === "INVALID_PROFILE"
          || error?.code === "IDENTITY_REQUIRED" ? error.code : "INTERNAL_ERROR",
      },
    }),
  };
  const nodeModule = require("node:module") as {
    _load(request: string, parent: unknown, isMain: boolean): unknown;
  };
  const originalLoad = nodeModule._load;
  (globalThis as { uniCloud?: unknown }).uniCloud = {
    database: () => ({
      command: { remove: vi.fn(() => "remove-command") },
      collection: () => ({ doc }),
    }),
    uploadFile,
    getTempFileURL: vi.fn(async () => ({ fileList: [] })),
  };
  nodeModule._load = (request, parent, isMain) => {
    if (request === "uni-id-common") return { createInstance };
    if (request === "pindou-cloud-common") return common;
    return originalLoad.call(nodeModule, request, parent, isMain);
  };

  delete require.cache[profileObjectPath];
  const cloudObject = require(profileObjectPath);
  nodeModule._load = originalLoad;
  return { checkToken, cloudObject, doc, update, uploadFile };
}
