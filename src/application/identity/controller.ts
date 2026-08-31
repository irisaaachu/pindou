import type {
  IdentityResult,
  IdentityFailureCode,
  IdentityService,
  IdentitySession,
  IdentityState,
  IdentityUser,
  ProfileDraft,
} from "../../domain/identity";

export interface IdentityController {
  initialize(): Promise<IdentityResult<IdentitySession | null>>;
  requestAuthenticatedAccess(confirmConsent: () => Promise<boolean>): Promise<IdentityResult<IdentitySession>>;
  saveProfile(draft: ProfileDraft): Promise<IdentityResult<IdentityUser>>;
  logout(): Promise<IdentityState>;
}

export function createIdentityController(
  service: IdentityService,
  state: IdentityState,
): IdentityController {
  let loginPromise: Promise<IdentityResult<IdentitySession>> | null = null;

  function applyFailure(result: { ok: false; error: { code: IdentityFailureCode } }): void {
    state.failure = result.error;
    state.session = null;
    state.status = result.error.code === "SESSION_EXPIRED" || result.error.code === "USER_CANCELLED"
      ? "guest"
      : "error";
  }

  async function initialize(): Promise<IdentityResult<IdentitySession | null>> {
    state.status = "restoring";
    const result = await service.restore();
    if (!result.ok) {
      applyFailure(result);
      return result;
    }
    state.session = result.data;
    state.failure = null;
    state.status = result.data ? "authenticated" : "guest";
    return result;
  }

  async function requestAuthenticatedAccess(
    confirmConsent: () => Promise<boolean>,
  ): Promise<IdentityResult<IdentitySession>> {
    if (state.status === "authenticated" && state.session) {
      return { ok: true, data: state.session };
    }

    if (!(await confirmConsent())) {
      const result = { ok: false as const, error: { code: "USER_CANCELLED" as const } };
      applyFailure(result);
      return result;
    }

    if (!loginPromise) {
      state.status = "signing-in";
      const currentPromise = service.signIn().then((result) => {
        if (result.ok) {
          state.session = result.data;
          state.failure = null;
          state.status = "authenticated";
        } else {
          applyFailure(result);
        }
        return result;
      });
      loginPromise = currentPromise;
      void currentPromise.then(
        () => { if (loginPromise === currentPromise) loginPromise = null; },
        () => { if (loginPromise === currentPromise) loginPromise = null; },
      );
    }
    return loginPromise;
  }

  async function saveProfile(draft: ProfileDraft): Promise<IdentityResult<IdentityUser>> {
    if (!state.session) {
      const result = { ok: false as const, error: { code: "INTERNAL_ERROR" as const } };
      applyFailure(result);
      return result;
    }
    const result = await service.updateProfile(draft);
    if (result.ok) {
      state.session = { ...state.session, user: result.data };
      state.failure = null;
      state.status = "authenticated";
    } else {
      applyFailure(result);
    }
    return result;
  }

  async function logout(): Promise<IdentityState> {
    await service.signOut();
    state.status = "guest";
    state.session = null;
    state.failure = null;
    return state;
  }

  return { initialize, requestAuthenticatedAccess, saveProfile, logout };
}
