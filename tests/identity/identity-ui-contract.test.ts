import { describe, expect, test, vi } from "vitest";

import { createIdentityRuntime, getIdentityPresentation } from "../../src/application/identity/runtime";
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
});
