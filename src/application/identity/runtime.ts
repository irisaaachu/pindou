import { reactive } from "vue";

import {
  createIdentityPlatformDependencies,
  createUniCloudIdentityService,
} from "../../adapters/identity";
import type {
  IdentityResult,
  IdentityService,
  IdentitySession,
  IdentityState,
  ProfileDraft,
} from "../../domain/identity";
import { createIdentityController, type IdentityController } from "./controller";

export { getIdentityPresentation } from "./presentation";

export type IdentityRuntime = {
  state: IdentityState;
  consentVisible: boolean;
  profileEditorVisible: boolean;
  profileSaving: boolean;
  profileEditingSupported: boolean;
  initialize(): Promise<IdentityResult<IdentitySession | null>>;
  requestAuthenticatedAccess(): Promise<IdentityResult<IdentitySession> | null>;
  approveConsent(): Promise<IdentityResult<IdentitySession> | null>;
  declineConsent(): void;
  openProfileEditor(): void;
  closeProfileEditor(): void;
  saveProfile(draft: ProfileDraft): Promise<boolean>;
  logout(): Promise<void>;
};

export function createIdentityRuntime(
  service: IdentityService,
  profileEditingSupported = true,
): IdentityRuntime {
  const state = reactive<IdentityState>({ status: "guest", session: null, failure: null });
  const controller: IdentityController = createIdentityController(service, state);
  let logoutPromise: Promise<void> | null = null;
  const runtime = reactive<IdentityRuntime>({
    state,
    consentVisible: false,
    profileEditorVisible: false,
    profileSaving: false,
    profileEditingSupported,
    initialize: () => controller.initialize(),
    async requestAuthenticatedAccess() {
      if (state.status === "authenticated" && state.session) {
        return { ok: true, data: state.session };
      }
      if (state.status === "restoring" || state.status === "signing-in") return null;
      runtime.consentVisible = true;
      return null;
    },
    async approveConsent() {
      if (!runtime.consentVisible) return null;
      runtime.consentVisible = false;
      return controller.requestAuthenticatedAccess(async () => true);
    },
    declineConsent() {
      runtime.consentVisible = false;
    },
    openProfileEditor() {
      if (state.status === "authenticated" && state.session) runtime.profileEditorVisible = true;
    },
    closeProfileEditor() {
      runtime.profileEditorVisible = false;
    },
    async saveProfile(draft) {
      if (runtime.profileSaving || state.status !== "authenticated" || !state.session) return false;
      runtime.profileSaving = true;
      try {
        const result = await controller.saveProfile(draft);
        if (!result.ok) return false;
        runtime.profileEditorVisible = false;
        return true;
      } finally {
        runtime.profileSaving = false;
      }
    },
    async logout() {
      if (!logoutPromise) {
        runtime.consentVisible = false;
        runtime.profileEditorVisible = false;
        const pending = controller.logout().then(() => undefined);
        const tracked = pending.finally(() => {
          if (logoutPromise === tracked) logoutPromise = null;
        });
        logoutPromise = tracked;
      }
      return logoutPromise;
    },
  });
  return runtime;
}

const platform = createIdentityPlatformDependencies();

export const identityRuntime = createIdentityRuntime(
  createUniCloudIdentityService(platform),
  platform.platform === "mp-weixin",
);
