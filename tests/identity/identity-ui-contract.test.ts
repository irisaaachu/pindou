import { describe, expect, test, vi } from "vitest";

import { createIdentityRuntime, getIdentityPresentation } from "../../src/application/identity/runtime";
import { readAvatarFile } from "../../src/adapters/identity/platform";
import type { IdentityService, IdentitySession, ProfileDraft } from "../../src/domain/identity";

const session: IdentitySession = {
  user: { uid: "user-1", nickname: "Pindou" },
  expiresAt: Date.now() + 60_000,
};

function makeService(overrides: Partial<IdentityService> = {}): IdentityService {
  return {
    restore: vi.fn(async () => ({ ok: true as const, data: null })),
    signIn: vi.fn(async () => ({ ok: true as const, data: session })),
    updateProfile: vi.fn(async () => ({ ok: true as const, data: session.user })),
    signOut: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("identity UI runtime", () => {
  test("returns the current authenticated session without reopening consent", async () => {
    const service = makeService({ restore: vi.fn(async () => ({ ok: true as const, data: session })) });
    const runtime = createIdentityRuntime(service);
    await runtime.initialize();

    const result = await runtime.requestAuthenticatedAccess();

    expect(result).toEqual({ ok: true, data: session });
    expect(runtime.consentVisible).toBe(false);
    expect(service.signIn).not.toHaveBeenCalled();
  });

  test("opens consent for a guest before the first identity call", async () => {
    const service = makeService();
    const runtime = createIdentityRuntime(service);

    const result = await runtime.requestAuthenticatedAccess();

    expect(result).toBeNull();
    expect(runtime.consentVisible).toBe(true);
    expect(service.signIn).not.toHaveBeenCalled();

    await runtime.approveConsent();

    expect(service.signIn).toHaveBeenCalledTimes(1);
    expect(runtime.state.status).toBe("authenticated");
  });

  test.each(["restoring", "signing-in"] as const)("does not open another consent dialog while identity is %s", async (status) => {
    let releaseRestore!: (value: { ok: true; data: null }) => void;
    const service = makeService({
      restore: vi.fn(() => new Promise((resolve) => { releaseRestore = resolve; })),
    });
    const runtime = createIdentityRuntime(service);

    const restoring = runtime.initialize();
    if (status === "signing-in") {
      releaseRestore({ ok: true, data: null });
      await restoring;
      let releaseSignIn!: (value: { ok: true; data: IdentitySession }) => void;
      service.signIn = vi.fn(() => new Promise((resolve) => { releaseSignIn = resolve; }));
      await runtime.requestAuthenticatedAccess();
      const signingIn = runtime.approveConsent();
      await Promise.resolve();
      expect(runtime.state.status).toBe("signing-in");
      await runtime.requestAuthenticatedAccess();
      expect(runtime.consentVisible).toBe(false);
      releaseSignIn({ ok: true, data: session });
      await signingIn;
      return;
    }

    await runtime.requestAuthenticatedAccess();

    expect(runtime.consentVisible).toBe(false);
    releaseRestore({ ok: true, data: null });
    await restoring;
  });

  test("allows a stable error state to open consent for a retry", async () => {
    const service = makeService({ restore: vi.fn(async () => ({ ok: false as const, error: { code: "LOGIN_FAILED" as const } })) });
    const runtime = createIdentityRuntime(service);
    await runtime.initialize();

    await runtime.requestAuthenticatedAccess();

    expect(runtime.consentVisible).toBe(true);
  });

  test("cancels consent silently without calling the identity service", async () => {
    const service = makeService();
    const runtime = createIdentityRuntime(service);
    await runtime.requestAuthenticatedAccess();

    runtime.declineConsent();

    expect(runtime.consentVisible).toBe(false);
    expect(runtime.state).toEqual({ status: "guest", session: null, failure: null });
    expect(service.signIn).not.toHaveBeenCalled();
  });

  test("does not send profile saves while logged out", async () => {
    const service = makeService();
    const runtime = createIdentityRuntime(service);
    const draft: ProfileDraft = { nickname: "Pindou", avatar: null };

    const saved = await runtime.saveProfile(draft);

    expect(saved).toBe(false);
    expect(service.updateProfile).not.toHaveBeenCalled();
  });

  test("ignores a second profile save while the first save is pending", async () => {
    let completeSave!: (value: { ok: true; data: IdentitySession["user"] }) => void;
    const service = makeService({
      restore: vi.fn(async () => ({ ok: true as const, data: session })),
      updateProfile: vi.fn(() => new Promise((resolve) => { completeSave = resolve; })),
    });
    const runtime = createIdentityRuntime(service);
    await runtime.initialize();
    runtime.openProfileEditor();
    const draft: ProfileDraft = { nickname: "Pindou", avatar: null };

    const first = runtime.saveProfile(draft);
    const second = await runtime.saveProfile(draft);
    completeSave({ ok: true, data: session.user });

    await expect(first).resolves.toBe(true);
    expect(second).toBe(false);
    expect(service.updateProfile).toHaveBeenCalledTimes(1);
  });

  test("updates the displayed user and closes the editor after a successful save", async () => {
    const updatedUser = { uid: "user-1", nickname: "豆豆", avatarUrl: "cloud://avatar" };
    const service = makeService({
      restore: vi.fn(async () => ({ ok: true as const, data: session })),
      updateProfile: vi.fn(async () => ({ ok: true as const, data: updatedUser })),
    });
    const runtime = createIdentityRuntime(service);
    await runtime.initialize();
    runtime.openProfileEditor();

    const saved = await runtime.saveProfile({ nickname: "豆豆", avatar: null });

    expect(saved).toBe(true);
    expect(runtime.state.session?.user).toEqual(updatedUser);
    expect(runtime.profileEditorVisible).toBe(false);
  });

  test("presents the stable privacy statement without claiming photo upload", () => {
    expect(getIdentityPresentation({ status: "guest", session: null, failure: null }).privacy).toBe(
      "微信登录不会上传你的原始创作照片。",
    );
  });

  test("rejects an oversized avatar before reading its base64 data", async () => {
    const calls: string[] = [];

    await expect(readAvatarFile({
      getFileInfo: async () => { calls.push("file-info"); return { size: 1_048_577 }; },
      readFile: async () => { calls.push("read-file"); return "iVBORw0KGgo="; },
      base64ToArrayBuffer: () => new ArrayBuffer(0),
    }, "wxfile://avatar")).rejects.toThrow("INVALID_PROFILE");

    expect(calls).toEqual(["file-info"]);
  });
});
