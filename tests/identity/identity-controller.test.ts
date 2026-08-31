import { describe, expect, test } from "vitest";

import {
  createIdentityController,
  type IdentityService,
  type IdentitySession,
  type IdentityState,
} from "../../src/application/identity";
import type { ProfileDraft } from "../../src/domain/identity";

const session: IdentitySession = {
  user: { uid: "user-1", nickname: "Pindou" },
  expiresAt: Date.now() + 60_000,
};

function makeState(): IdentityState {
  return { status: "guest", session: null, failure: null };
}

function makeService(overrides: Partial<IdentityService> = {}) {
  let signInCalls = 0;
  let signOutCalls = 0;
  const signIn = overrides.signIn ?? (async () => ({ ok: true as const, data: session }));
  const service: IdentityService = {
    restore: async () => ({ ok: true, data: null }),
    updateProfile: async () => ({ ok: true, data: session.user }),
    signOut: async () => {
      signOutCalls += 1;
    },
    ...overrides,
    signIn: async () => {
      signInCalls += 1;
      return signIn();
    },
  };
  return { service, getSignInCalls: () => signInCalls, getSignOutCalls: () => signOutCalls };
}

describe("identity controller", () => {
  test("initializes a missing session as guest without signing in", async () => {
    const { service, getSignInCalls } = makeService();
    const state = makeState();
    const controller = createIdentityController(service, state);

    const result = await controller.initialize();

    expect(result).toEqual({ ok: true, data: null });
    expect(state).toEqual({ status: "guest", session: null, failure: null });
    expect(getSignInCalls()).toBe(0);
  });

  test("restores an existing session as authenticated", async () => {
    const { service } = makeService({ restore: async () => ({ ok: true, data: session }) });
    const state = makeState();

    const result = await createIdentityController(service, state).initialize();

    expect(result).toEqual({ ok: true, data: session });
    expect(state).toEqual({ status: "authenticated", session, failure: null });
  });

  test("returns USER_CANCELLED and does not sign in when consent is rejected", async () => {
    const { service, getSignInCalls } = makeService();
    const state = makeState();

    const result = await createIdentityController(service, state)
      .requestAuthenticatedAccess(async () => false);

    expect(result).toEqual({ ok: false, error: { code: "USER_CANCELLED" } });
    expect(state).toEqual({
      status: "guest",
      session: null,
      failure: { code: "USER_CANCELLED" },
    });
    expect(getSignInCalls()).toBe(0);
  });

  test("signs in once after approved consent and stores the session", async () => {
    const { service, getSignInCalls } = makeService();
    const state = makeState();

    const result = await createIdentityController(service, state)
      .requestAuthenticatedAccess(async () => true);

    expect(result).toEqual({ ok: true, data: session });
    expect(getSignInCalls()).toBe(1);
    expect(state).toEqual({ status: "authenticated", session, failure: null });
  });

  test("shares one in-flight login between simultaneous access requests", async () => {
    let resolveSignIn!: (value: { ok: true; data: IdentitySession }) => void;
    const signIn = () => new Promise<{ ok: true; data: IdentitySession }>((resolve) => {
      resolveSignIn = resolve;
    });
    const { service, getSignInCalls } = makeService({ signIn });
    const state = makeState();
    const controller = createIdentityController(service, state);

    const first = controller.requestAuthenticatedAccess(async () => true);
    const second = controller.requestAuthenticatedAccess(async () => true);
    await Promise.resolve();
    resolveSignIn({ ok: true, data: session });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { ok: true, data: session },
      { ok: true, data: session },
    ]);
    expect(getSignInCalls()).toBe(1);
  });

  test("clears an expired session and keeps the failure for retry messaging", async () => {
    const { service } = makeService({
      signIn: async () => ({ ok: false, error: { code: "SESSION_EXPIRED" } }),
    });
    const state: IdentityState = { status: "guest", session: null, failure: null };

    const result = await createIdentityController(service, state)
      .requestAuthenticatedAccess(async () => true);

    expect(result).toEqual({ ok: false, error: { code: "SESSION_EXPIRED" } });
    expect(state).toEqual({
      status: "guest",
      session: null,
      failure: { code: "SESSION_EXPIRED" },
    });
  });

  test("logs out and clears only identity state", async () => {
    const { service, getSignOutCalls } = makeService();
    const state: IdentityState = { status: "authenticated", session, failure: null };
    const controller = createIdentityController(service, state);

    const result = await controller.logout();

    expect(getSignOutCalls()).toBe(1);
    expect(result).toEqual({ status: "guest", session: null, failure: null });
    expect(state).toEqual({ status: "guest", session: null, failure: null });
  });

  test("profile success replaces only the authenticated user fields", async () => {
    const updatedUser = { uid: "user-1", nickname: "New Name", avatarUrl: "avatar.jpg" };
    const draft: ProfileDraft = { nickname: "New Name", avatar: null };
    const { service } = makeService({ updateProfile: async () => ({ ok: true, data: updatedUser }) });
    const state: IdentityState = { status: "authenticated", session, failure: null };

    const result = await createIdentityController(service, state).saveProfile(draft);

    expect(result).toEqual({ ok: true, data: updatedUser });
    expect(state.session).toEqual({ ...session, user: updatedUser });
    expect(state.status).toBe("authenticated");
    expect(state.failure).toBeNull();
  });
});
