export type IdentityFailureCode =
  | "USER_CANCELLED"
  | "PLATFORM_UNSUPPORTED"
  | "CLOUD_NOT_CONFIGURED"
  | "LOGIN_FAILED"
  | "SESSION_EXPIRED"
  | "INVALID_PROFILE"
  | "INTERNAL_ERROR";

export interface IdentityUser {
  uid: string;
  nickname?: string;
  avatarUrl?: string;
}

export interface IdentitySession {
  user: IdentityUser;
  expiresAt: number;
}

export interface ProfileDraft {
  nickname: string;
  avatar: null | {
    mimeType: "image/jpeg" | "image/png" | string;
    size: number;
    base64: string;
  };
}

export type IdentityResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: IdentityFailureCode } };

export type IdentityStatus =
  | "guest"
  | "restoring"
  | "signing-in"
  | "authenticated"
  | "error";

export interface IdentityState {
  status: IdentityStatus;
  session: IdentitySession | null;
  failure: { code: IdentityFailureCode } | null;
}
