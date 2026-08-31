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

  test("maps rejected login responses to LOGIN_FAILED", async () => {
    const dependencies = makeDependencies({
      loginByWeixin: vi.fn(async () => ({ errCode: "AUTH_FAILED" })),
    });

    const result = await createUniCloudIdentityService(dependencies).signIn();

    expect(result).toEqual({ ok: false, error: { code: "LOGIN_FAILED" } });
    expect(dependencies.getProfile).not.toHaveBeenCalled();
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
});
