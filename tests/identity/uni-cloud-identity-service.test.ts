import { describe, expect, test, vi } from "vitest";

import type { IdentityPlatformDependencies } from "../../src/adapters/identity";
import { createUniCloudIdentityService } from "../../src/adapters/identity";

function makeDependencies(
  overrides: Partial<IdentityPlatformDependencies> = {},
): IdentityPlatformDependencies & { storage: Map<string, unknown> } {
  const storage = new Map<string, unknown>();
  return {
    platform: "mp-weixin",
    now: () => 1_000,
    loginWeixin: vi.fn(async () => ({ code: "temporary-code" })),
    loginByWeixin: vi.fn(async () => ({
      errCode: 0,
      newToken: { token: "sdk-token", tokenExpired: 2_000 },
    })),
    getProfile: vi.fn(async () => ({
      ok: true,
      data: { uid: "verified-user", nickname: "Pindou", avatarUrl: "avatar.png" },
    })),
    updateProfile: vi.fn(async () => ({ ok: true, data: { uid: "verified-user" } })),
    readStorage: (key) => storage.get(key),
    writeStorage: (key, value) => storage.set(key, value),
    removeStorage: (key) => storage.delete(key),
    storage,
    ...overrides,
  };
}

describe("uniCloud identity service", () => {
  test.each(["h5", "app"] as const)("rejects %s sign-in without invoking WeChat or cloud dependencies", async (platform) => {
    const dependencies = makeDependencies({ platform });

    const result = await createUniCloudIdentityService(dependencies).signIn();

    expect(result).toEqual({ ok: false, error: { code: "PLATFORM_UNSUPPORTED" } });
    expect(dependencies.loginWeixin).not.toHaveBeenCalled();
    expect(dependencies.loginByWeixin).not.toHaveBeenCalled();
    expect(dependencies.getProfile).not.toHaveBeenCalled();
  });

  test("restores an unexpired SDK token with its valid Pindou snapshot", async () => {
    const dependencies = makeDependencies();
    dependencies.storage.set("uni_id_token", "sdk-token");
    dependencies.storage.set("uni_id_token_expired", 2_000);
    dependencies.storage.set("pindou_identity_snapshot_v1", {
      uid: "verified-user",
      nickname: "Pindou",
      avatarUrl: "avatar.png",
    });

    const result = await createUniCloudIdentityService(dependencies).restore();

    expect(result).toEqual({
      ok: true,
      data: {
        user: { uid: "verified-user", nickname: "Pindou", avatarUrl: "avatar.png" },
        expiresAt: 2_000,
      },
    });
  });

  test.each([
    ["missing token", undefined, 2_000, { uid: "verified-user" }],
    ["malformed expiry", "sdk-token", "2_000", { uid: "verified-user" }],
    ["expired expiry", "sdk-token", 1_000, { uid: "verified-user" }],
    ["malformed snapshot", "sdk-token", 2_000, { nickname: "Pindou" }],
  ])("clears identity storage and restores guest for %s", async (_case, token, expiry, snapshot) => {
    const dependencies = makeDependencies();
    dependencies.storage.set("uni_id_token", token);
    dependencies.storage.set("uni_id_token_expired", expiry);
    dependencies.storage.set("pindou_identity_snapshot_v1", snapshot);

    const result = await createUniCloudIdentityService(dependencies).restore();

    expect(result).toEqual({ ok: true, data: null });
    expect(dependencies.storage.has("uni_id_token")).toBe(false);
    expect(dependencies.storage.has("uni_id_token_expired")).toBe(false);
    expect(dependencies.storage.has("pindou_identity_snapshot_v1")).toBe(false);
  });

  test("uses the temporary WeChat code and protected profile to create a session", async () => {
    const dependencies = makeDependencies({
      loginWeixin: vi.fn(async () => ({ code: "one-time-code" })),
      getProfile: vi.fn(async () => ({ ok: true, data: { uid: "server-user" } })),
    });

    const result = await createUniCloudIdentityService(dependencies).signIn();

    expect(result).toEqual({
      ok: true,
      data: { user: { uid: "server-user" }, expiresAt: 2_000 },
    });
    expect(dependencies.loginByWeixin).toHaveBeenCalledWith("one-time-code");
    expect(dependencies.getProfile).toHaveBeenCalledTimes(1);
    expect(dependencies.storage.get("pindou_identity_snapshot_v1")).toEqual({ uid: "server-user" });
  });

  test("writes no official SDK token storage during login", async () => {
    const writes: string[] = [];
    const dependencies = makeDependencies();
    dependencies.writeStorage = (key, value) => {
      writes.push(key);
      dependencies.storage.set(key, value);
    };

    await createUniCloudIdentityService(dependencies).signIn();

    expect(writes).toEqual(["pindou_identity_snapshot_v1"]);
  });

  test("maps missing cloud configuration to CLOUD_NOT_CONFIGURED", async () => {
    const dependencies = makeDependencies({
      loginByWeixin: vi.fn(async () => { throw new Error("uniCloud service space is not configured"); }),
    });

    const result = await createUniCloudIdentityService(dependencies).signIn();

    expect(result).toEqual({ ok: false, error: { code: "CLOUD_NOT_CONFIGURED" } });
  });

  test("maps uniCloud errMsg failures to CLOUD_NOT_CONFIGURED without retaining the error", async () => {
    const dependencies = makeDependencies({
      loginByWeixin: vi.fn(async () => {
        throw { errMsg: "uniCloud importObject failed because the service space is missing" };
      }),
    });

    const result = await createUniCloudIdentityService(dependencies).signIn();

    expect(result).toEqual({ ok: false, error: { code: "CLOUD_NOT_CONFIGURED" } });
    expect(result).not.toHaveProperty("error.message");
  });

  test("maps rejected login responses to LOGIN_FAILED", async () => {
    const dependencies = makeDependencies({
      loginByWeixin: vi.fn(async () => ({ errCode: "AUTH_FAILED" })),
    });

    const result = await createUniCloudIdentityService(dependencies).signIn();

    expect(result).toEqual({ ok: false, error: { code: "LOGIN_FAILED" } });
    expect(dependencies.getProfile).not.toHaveBeenCalled();
  });

  test("maps a rejected protected profile IDENTITY_REQUIRED during sign-in to session expiry", async () => {
    const dependencies = makeDependencies({
      getProfile: vi.fn(async () => { throw { errCode: "IDENTITY_REQUIRED", message: "private token detail" }; }),
    });
    dependencies.storage.set("uni_id_token", "sdk-token");
    dependencies.storage.set("uni_id_token_expired", 2_000);
    dependencies.storage.set("pindou_identity_snapshot_v1", { uid: "verified-user" });

    const result = await createUniCloudIdentityService(dependencies).signIn();

    expect(result).toEqual({ ok: false, error: { code: "SESSION_EXPIRED" } });
    expect(result).not.toHaveProperty("error.message");
    expect(dependencies.storage.has("uni_id_token")).toBe(false);
    expect(dependencies.storage.has("uni_id_token_expired")).toBe(false);
    expect(dependencies.storage.has("pindou_identity_snapshot_v1")).toBe(false);
  });

  test("clears identity storage when the protected profile has no authenticated user", async () => {
    const dependencies = makeDependencies({
      getProfile: vi.fn(async () => ({ ok: true, data: { uid: "" } })),
    });

    const result = await createUniCloudIdentityService(dependencies).signIn();

    expect(result).toEqual({ ok: false, error: { code: "SESSION_EXPIRED" } });
    expect(dependencies.storage.has("uni_id_token")).toBe(false);
    expect(dependencies.storage.has("uni_id_token_expired")).toBe(false);
    expect(dependencies.storage.has("pindou_identity_snapshot_v1")).toBe(false);
  });

  test("rejects an expired login token and clears identity storage", async () => {
    const dependencies = makeDependencies({
      loginByWeixin: vi.fn(async () => ({
        errCode: 0,
        newToken: { token: "sdk-token", tokenExpired: 1_000 },
      })),
    });
    dependencies.storage.set("uni_id_token", "old-token");
    dependencies.storage.set("uni_id_token_expired", 900);
    dependencies.storage.set("pindou_identity_snapshot_v1", { uid: "old-user" });

    const result = await createUniCloudIdentityService(dependencies).signIn();

    expect(result).toEqual({ ok: false, error: { code: "SESSION_EXPIRED" } });
    expect(dependencies.getProfile).not.toHaveBeenCalled();
    expect(dependencies.storage.has("uni_id_token")).toBe(false);
    expect(dependencies.storage.has("uni_id_token_expired")).toBe(false);
    expect(dependencies.storage.has("pindou_identity_snapshot_v1")).toBe(false);
  });

  test("maps cloud INVALID_PROFILE to INVALID_PROFILE", async () => {
    const dependencies = makeDependencies({
      updateProfile: vi.fn(async () => ({ ok: false, error: { code: "INVALID_PROFILE" } })),
    });

    const result = await createUniCloudIdentityService(dependencies).updateProfile({
      nickname: "Pindou",
      avatar: null,
    });

    expect(result).toEqual({ ok: false, error: { code: "INVALID_PROFILE" } });
  });

  test.each([
    ["IDENTITY_REQUIRED", "SESSION_EXPIRED", false],
    ["INTERNAL_ERROR", "INTERNAL_ERROR", true],
    ["INVALID_REQUEST", "INTERNAL_ERROR", true],
  ] as const)("classifies resolved getProfile %s envelopes without leaking or over-clearing", async (cloudCode, expectedCode, preservesStorage) => {
    const dependencies = makeDependencies({
      getProfile: vi.fn(async () => ({ ok: false, error: { code: cloudCode } })),
    });
    dependencies.storage.set("uni_id_token", "sdk-token");
    dependencies.storage.set("uni_id_token_expired", 2_000);
    dependencies.storage.set("pindou_identity_snapshot_v1", { uid: "verified-user" });

    const result = await createUniCloudIdentityService(dependencies).signIn();

    expect(result).toEqual({ ok: false, error: { code: expectedCode } });
    expect(dependencies.storage.has("uni_id_token")).toBe(preservesStorage);
    expect(dependencies.storage.has("uni_id_token_expired")).toBe(preservesStorage);
    expect(dependencies.storage.has("pindou_identity_snapshot_v1")).toBe(preservesStorage);
  });

  test.each([
    ["IDENTITY_REQUIRED", "SESSION_EXPIRED", false],
    ["INVALID_PROFILE", "INVALID_PROFILE", true],
    ["INTERNAL_ERROR", "INTERNAL_ERROR", true],
    ["INVALID_REQUEST", "INTERNAL_ERROR", true],
  ] as const)("classifies resolved updateProfile %s envelopes without clearing valid storage", async (cloudCode, expectedCode, preservesStorage) => {
    const dependencies = makeDependencies({
      updateProfile: vi.fn(async () => ({ ok: false, error: { code: cloudCode } })),
    });
    dependencies.storage.set("uni_id_token", "sdk-token");
    dependencies.storage.set("uni_id_token_expired", 2_000);
    dependencies.storage.set("pindou_identity_snapshot_v1", { uid: "verified-user" });

    const result = await createUniCloudIdentityService(dependencies).updateProfile({ nickname: "Pindou", avatar: null });

    expect(result).toEqual({ ok: false, error: { code: expectedCode } });
    expect(dependencies.storage.has("uni_id_token")).toBe(preservesStorage);
    expect(dependencies.storage.has("uni_id_token_expired")).toBe(preservesStorage);
    expect(dependencies.storage.has("pindou_identity_snapshot_v1")).toBe(preservesStorage);
  });

  test.each(["code", "errCode"] as const)("maps rejected cloud %s IDENTITY_REQUIRED to session expiry without retaining the message", async (field) => {
    const removed: string[] = [];
    const dependencies = makeDependencies({
      updateProfile: vi.fn(async () => {
        throw { [field]: "IDENTITY_REQUIRED", message: "private upstream detail" };
      }),
      removeStorage: (key) => {
        removed.push(key);
        dependencies.storage.delete(key);
      },
    });
    dependencies.storage.set("uni_id_token", "sdk-token");
    dependencies.storage.set("uni_id_token_expired", 2_000);
    dependencies.storage.set("pindou_identity_snapshot_v1", { uid: "verified-user" });

    const result = await createUniCloudIdentityService(dependencies).updateProfile({ nickname: "Pindou", avatar: null });

    expect(result).toEqual({ ok: false, error: { code: "SESSION_EXPIRED" } });
    expect(result).not.toHaveProperty("error.message");
    expect(removed).toEqual(["uni_id_token", "uni_id_token_expired", "pindou_identity_snapshot_v1"]);
  });

  test("rejects non-WeChat profile updates without invoking the cloud dependency", async () => {
    const dependencies = makeDependencies({ platform: "app" });

    const result = await createUniCloudIdentityService(dependencies).updateProfile({
      nickname: "Pindou",
      avatar: null,
    });

    expect(result).toEqual({ ok: false, error: { code: "PLATFORM_UNSUPPORTED" } });
    expect(dependencies.updateProfile).not.toHaveBeenCalled();
  });

  test("logs out by removing only the SDK token keys and Pindou snapshot", async () => {
    const removed: string[] = [];
    const dependencies = makeDependencies({
      removeStorage: (key) => {
        removed.push(key);
        dependencies.storage.delete(key);
      },
    });
    dependencies.storage.set("unrelated", "keep");

    await createUniCloudIdentityService(dependencies).signOut();

    expect(removed).toEqual([
      "uni_id_token",
      "uni_id_token_expired",
      "pindou_identity_snapshot_v1",
    ]);
    expect(dependencies.storage.get("unrelated")).toBe("keep");
  });

  test("does not write a sign-in snapshot after logout wins its in-flight profile request", async () => {
    let resolveProfile!: (value: { ok: true; data: { uid: string } }) => void;
    let markProfileRequested!: () => void;
    const profileRequested = new Promise<void>((resolve) => { markProfileRequested = resolve; });
    const dependencies = makeDependencies({
      getProfile: vi.fn(() => {
        markProfileRequested();
        return new Promise((resolve) => { resolveProfile = resolve; });
      }),
    });
    const service = createUniCloudIdentityService(dependencies);

    const signingIn = service.signIn();
    await profileRequested;
    await service.signOut();
    resolveProfile({ ok: true, data: { uid: "old-user" } });
    await signingIn;

    expect(dependencies.storage.has("pindou_identity_snapshot_v1")).toBe(false);
    expect(dependencies.storage.has("uni_id_token")).toBe(false);
    expect(dependencies.storage.has("uni_id_token_expired")).toBe(false);
  });

  test("does not write a profile snapshot after logout wins its in-flight update", async () => {
    let resolveUpdate!: (value: { ok: true; data: { uid: string } }) => void;
    const dependencies = makeDependencies({
      updateProfile: vi.fn(() => new Promise((resolve) => { resolveUpdate = resolve; })),
    });
    const service = createUniCloudIdentityService(dependencies);

    const saving = service.updateProfile({ nickname: "Pindou", avatar: null });
    await service.signOut();
    resolveUpdate({ ok: true, data: { uid: "old-user" } });
    await saving;

    expect(dependencies.storage.has("pindou_identity_snapshot_v1")).toBe(false);
  });

  test("does not let an old sign-in clear a snapshot created by the retry after it settles", async () => {
    let resolveOldLogin!: (value: { code: string }) => void;
    let loginCalls = 0;
    const dependencies = makeDependencies({
      loginWeixin: vi.fn(() => {
        loginCalls += 1;
        return loginCalls === 1
          ? new Promise((resolve) => { resolveOldLogin = resolve; })
          : Promise.resolve({ code: "new-code" });
      }),
      getProfile: vi.fn(async () => ({ ok: true, data: { uid: "new-user" } })),
    });
    const service = createUniCloudIdentityService(dependencies);

    const oldSignIn = service.signIn();
    await service.signOut();
    await expect(service.signIn()).resolves.toEqual({ ok: false, error: { code: "LOGIN_FAILED" } });
    expect(dependencies.loginWeixin).toHaveBeenCalledTimes(1);
    expect(dependencies.loginByWeixin).not.toHaveBeenCalled();
    resolveOldLogin({ code: "old-code" });
    await expect(oldSignIn).resolves.toEqual({ ok: false, error: { code: "SESSION_EXPIRED" } });
    await service.signIn();

    expect(dependencies.storage.get("pindou_identity_snapshot_v1")).toEqual({ uid: "new-user" });
  });

  test("clears official token keys after logout wins a pending SDK login write", async () => {
    let resolveLogin!: (value: { errCode: number; newToken: { token: string; tokenExpired: number } }) => void;
    let markSdkLoginRequested!: () => void;
    const sdkLoginRequested = new Promise<void>((resolve) => { markSdkLoginRequested = resolve; });
    const dependencies = makeDependencies({
      loginByWeixin: vi.fn(() => {
        markSdkLoginRequested();
        return new Promise((resolve) => { resolveLogin = (value) => {
          dependencies.storage.set("uni_id_token", value.newToken.token);
          dependencies.storage.set("uni_id_token_expired", value.newToken.tokenExpired);
          resolve(value);
        }; });
      }),
    });
    const service = createUniCloudIdentityService(dependencies);

    const signingIn = service.signIn();
    await sdkLoginRequested;
    await service.signOut();
    resolveLogin({ errCode: 0, newToken: { token: "stale-token", tokenExpired: 2_000 } });
    await signingIn;

    expect(dependencies.storage.has("uni_id_token")).toBe(false);
    expect(dependencies.storage.has("uni_id_token_expired")).toBe(false);
    expect(dependencies.storage.has("pindou_identity_snapshot_v1")).toBe(false);
  });

  test("rejects a post-logout login until the older SDK login settles, then permits a clean retry", async () => {
    let resolveOldLogin!: (value: { errCode: number; newToken: { token: string; tokenExpired: number } }) => void;
    let markOldSdkLoginRequested!: () => void;
    const oldSdkLoginRequested = new Promise<void>((resolve) => { markOldSdkLoginRequested = resolve; });
    let sdkCalls = 0;
    const dependencies = makeDependencies({
      loginByWeixin: vi.fn(() => {
        sdkCalls += 1;
        if (sdkCalls > 1) return Promise.resolve({ errCode: 0, newToken: { token: "new-token", tokenExpired: 2_000 } });
        markOldSdkLoginRequested();
        return new Promise((resolve) => { resolveOldLogin = (value) => {
          dependencies.storage.set("uni_id_token", value.newToken.token);
          dependencies.storage.set("uni_id_token_expired", value.newToken.tokenExpired);
          resolve(value);
        }; });
      }),
      getProfile: vi.fn(async () => ({ ok: true, data: { uid: "new-user" } })),
    });
    const service = createUniCloudIdentityService(dependencies);

    const oldSignIn = service.signIn();
    await oldSdkLoginRequested;
    await service.signOut();
    await expect(service.signIn()).resolves.toEqual({ ok: false, error: { code: "LOGIN_FAILED" } });
    resolveOldLogin({ errCode: 0, newToken: { token: "old-token", tokenExpired: 2_000 } });
    await oldSignIn;
    const retried = await service.signIn();

    expect(retried).toEqual({ ok: true, data: { user: { uid: "new-user" }, expiresAt: 2_000 } });
    expect(dependencies.storage.get("pindou_identity_snapshot_v1")).toEqual({ uid: "new-user" });
  });

  test("shares one whole login flow for concurrent callers and releases it safely after logout", async () => {
    let resolveOldLogin!: (value: { errCode: number; newToken: { token: string; tokenExpired: number } }) => void;
    let markSdkLoginRequested!: () => void;
    const sdkLoginRequested = new Promise<void>((resolve) => { markSdkLoginRequested = resolve; });
    let sdkCalls = 0;
    const dependencies = makeDependencies({
      loginWeixin: vi.fn(async () => ({ code: "one-code" })),
      loginByWeixin: vi.fn(() => {
        sdkCalls += 1;
        if (sdkCalls > 1) return Promise.resolve({ errCode: 0, newToken: { token: "new-token", tokenExpired: 2_000 } });
        markSdkLoginRequested();
        return new Promise((resolve) => { resolveOldLogin = (value) => {
          dependencies.storage.set("uni_id_token", value.newToken.token);
          dependencies.storage.set("uni_id_token_expired", value.newToken.tokenExpired);
          resolve(value);
        }; });
      }),
      getProfile: vi.fn(async () => ({ ok: true, data: { uid: "new-user" } })),
    });
    const service = createUniCloudIdentityService(dependencies);

    const first = service.signIn();
    const second = service.signIn();
    await sdkLoginRequested;
    expect(dependencies.loginWeixin).toHaveBeenCalledTimes(1);
    expect(dependencies.loginByWeixin).toHaveBeenCalledTimes(1);
    await service.signOut();
    resolveOldLogin({ errCode: 0, newToken: { token: "old-token", tokenExpired: 2_000 } });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { ok: false, error: { code: "SESSION_EXPIRED" } },
      { ok: false, error: { code: "SESSION_EXPIRED" } },
    ]);
    expect(dependencies.storage.has("uni_id_token")).toBe(false);
    expect(dependencies.storage.has("uni_id_token_expired")).toBe(false);
    expect(dependencies.storage.has("pindou_identity_snapshot_v1")).toBe(false);

    await expect(service.signIn()).resolves.toEqual({
      ok: true,
      data: { user: { uid: "new-user" }, expiresAt: 2_000 },
    });
  });

  test("shares one flow when loginWeixin synchronously re-enters sign-in", async () => {
    let markLoginWeixin!: () => void;
    const loginWeixinCalled = new Promise<void>((resolve) => { markLoginWeixin = resolve; });
    let reentrantSignIn!: Promise<unknown>;
    const serviceRef: { current: ReturnType<typeof createUniCloudIdentityService> | null } = { current: null };
    const dependencies = makeDependencies({
      loginWeixin: vi.fn(() => {
        markLoginWeixin();
        reentrantSignIn = serviceRef.current!.signIn();
        return Promise.resolve({ code: "one-code" });
      }),
    });
    const service = createUniCloudIdentityService(dependencies);
    serviceRef.current = service;

    const initialSignIn = service.signIn();
    await loginWeixinCalled;

    await expect(Promise.all([initialSignIn, reentrantSignIn])).resolves.toEqual([
      { ok: true, data: { user: { uid: "verified-user", nickname: "Pindou", avatarUrl: "avatar.png" }, expiresAt: 2_000 } },
      { ok: true, data: { user: { uid: "verified-user", nickname: "Pindou", avatarUrl: "avatar.png" }, expiresAt: 2_000 } },
    ]);
    expect(dependencies.loginWeixin).toHaveBeenCalledTimes(1);
    expect(dependencies.loginByWeixin).toHaveBeenCalledTimes(1);
  });
});
