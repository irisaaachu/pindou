import type {
  IdentityResult,
  IdentityService,
  IdentitySession,
  IdentityUser,
  ProfileDraft,
} from "../../domain/identity";

const TOKEN_KEY = "uni_id_token";
const TOKEN_EXPIRY_KEY = "uni_id_token_expired";
const SNAPSHOT_KEY = "pindou_identity_snapshot_v1";

export interface IdentityPlatformDependencies {
  platform: "mp-weixin" | "h5" | "app" | "other";
  now(): number;
  loginWeixin(): Promise<{ code: string }>;
  loginByWeixin(code: string): Promise<{
    errCode: string | number;
    newToken?: { token: string; tokenExpired: number };
  }>;
  getProfile(): Promise<{
    ok: boolean;
    data?: { uid: string; nickname?: string; avatarUrl?: string };
    error?: { code: string };
  }>;
  updateProfile(draft: ProfileDraft): Promise<{
    ok: boolean;
    data?: IdentityUser;
    error?: { code: string };
  }>;
  readStorage(key: string): unknown;
  writeStorage(key: string, value: unknown): void;
  removeStorage(key: string): void;
}

function failure<T>(code: "PLATFORM_UNSUPPORTED" | "CLOUD_NOT_CONFIGURED" | "LOGIN_FAILED" | "SESSION_EXPIRED" | "INVALID_PROFILE" | "INTERNAL_ERROR"): IdentityResult<T> {
  return { ok: false, error: { code } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readSnapshot(value: unknown): IdentityUser | null {
  if (!isRecord(value) || typeof value.uid !== "string" || value.uid.length === 0) return null;
  if (value.nickname !== undefined && typeof value.nickname !== "string") return null;
  if (value.avatarUrl !== undefined && typeof value.avatarUrl !== "string") return null;
  return {
    uid: value.uid,
    ...(typeof value.nickname === "string" ? { nickname: value.nickname } : {}),
    ...(typeof value.avatarUrl === "string" ? { avatarUrl: value.avatarUrl } : {}),
  };
}

function isCloudConfigurationError(error: unknown): boolean {
  let message = "";
  try {
    if (error instanceof Error) {
      message = error.message;
    } else if (isRecord(error)) {
      const values = [error.errMsg, error.message];
      message = values.filter((value): value is string => typeof value === "string").join(" ");
    }
  } catch {
    return false;
  }
  return /unicloud|importobject|service space|cloud space|not configured/i.test(message);
}

function rejectedCloudCode(error: unknown): string | null {
  if (!isRecord(error)) return null;
  const code = error.code ?? error.errCode;
  return typeof code === "string" ? code : null;
}

function isSuccessfulLogin(errCode: string | number): boolean {
  return errCode === 0 || errCode === "0";
}

function isTokenMetadata(value: unknown): value is { token: string; tokenExpired: number } {
  return isRecord(value)
    && typeof value.token === "string"
    && value.token.length > 0
    && typeof value.tokenExpired === "number"
    && Number.isFinite(value.tokenExpired);
}

export function createUniCloudIdentityService(
  dependencies: IdentityPlatformDependencies,
): IdentityService {
  let operationGeneration = 0;
  let pendingSdkLogin: Promise<{ errCode: string | number; newToken?: { token: string; tokenExpired: number } }> | null = null;

  function clearIdentityStorage(expectedGeneration?: number): void {
    if (expectedGeneration !== undefined && expectedGeneration !== operationGeneration) return;
    dependencies.removeStorage(TOKEN_KEY);
    dependencies.removeStorage(TOKEN_EXPIRY_KEY);
    dependencies.removeStorage(SNAPSHOT_KEY);
  }

  async function restore(): Promise<IdentityResult<IdentitySession | null>> {
    const token = dependencies.readStorage(TOKEN_KEY);
    const expiresAt = dependencies.readStorage(TOKEN_EXPIRY_KEY);
    const user = readSnapshot(dependencies.readStorage(SNAPSHOT_KEY));
    if (typeof token !== "string" || token.length === 0
      || typeof expiresAt !== "number" || !Number.isFinite(expiresAt)
      || expiresAt <= dependencies.now() || !user) {
      clearIdentityStorage();
      return { ok: true, data: null };
    }
    return { ok: true, data: { user, expiresAt } };
  }

  async function signIn(): Promise<IdentityResult<IdentitySession>> {
    if (dependencies.platform !== "mp-weixin") return failure("PLATFORM_UNSUPPORTED");
    if (pendingSdkLogin) return failure("LOGIN_FAILED");
    const requestGeneration = operationGeneration;

    try {
      const { code } = await dependencies.loginWeixin();
      if (requestGeneration !== operationGeneration) return failure("SESSION_EXPIRED");
      const sdkLogin = dependencies.loginByWeixin(code);
      pendingSdkLogin = sdkLogin;
      let login: { errCode: string | number; newToken?: { token: string; tokenExpired: number } };
      try {
        login = await sdkLogin;
      } finally {
        if (pendingSdkLogin === sdkLogin) {
          if (requestGeneration !== operationGeneration) clearIdentityStorage();
          pendingSdkLogin = null;
        }
      }
      if (requestGeneration !== operationGeneration) return failure("SESSION_EXPIRED");
      if (!isSuccessfulLogin(login.errCode) || !isTokenMetadata(login.newToken)) {
        return failure("LOGIN_FAILED");
      }
      if (login.newToken.tokenExpired <= dependencies.now()) {
        clearIdentityStorage(requestGeneration);
        return failure("SESSION_EXPIRED");
      }

      const profile = await dependencies.getProfile();
      if (requestGeneration !== operationGeneration) return failure("SESSION_EXPIRED");
      const user = profile.ok ? readSnapshot(profile.data) : null;
      if (!user) {
        clearIdentityStorage(requestGeneration);
        return failure("SESSION_EXPIRED");
      }

      if (requestGeneration !== operationGeneration) return failure("SESSION_EXPIRED");
      dependencies.writeStorage(SNAPSHOT_KEY, user);
      return { ok: true, data: { user, expiresAt: login.newToken.tokenExpired } };
    } catch (error) {
      if (requestGeneration !== operationGeneration) return failure("SESSION_EXPIRED");
      if (rejectedCloudCode(error) === "IDENTITY_REQUIRED") {
        clearIdentityStorage(requestGeneration);
        return failure("SESSION_EXPIRED");
      }
      return failure(isCloudConfigurationError(error) ? "CLOUD_NOT_CONFIGURED" : "LOGIN_FAILED");
    }
  }

  async function updateProfile(draft: ProfileDraft): Promise<IdentityResult<IdentityUser>> {
    if (dependencies.platform !== "mp-weixin") return failure("PLATFORM_UNSUPPORTED");
    const requestGeneration = operationGeneration;

    try {
      const result = await dependencies.updateProfile(draft);
      if (requestGeneration !== operationGeneration) return failure("SESSION_EXPIRED");
      const user = result.ok ? readSnapshot(result.data) : null;
      if (user) {
        if (requestGeneration !== operationGeneration) return failure("SESSION_EXPIRED");
        dependencies.writeStorage(SNAPSHOT_KEY, user);
        return { ok: true, data: user };
      }
      if (result.error?.code === "INVALID_PROFILE") return failure("INVALID_PROFILE");
      clearIdentityStorage(requestGeneration);
      return failure("SESSION_EXPIRED");
    } catch (error) {
      if (requestGeneration !== operationGeneration) return failure("SESSION_EXPIRED");
      if (rejectedCloudCode(error) === "IDENTITY_REQUIRED") {
        clearIdentityStorage(requestGeneration);
        return failure("SESSION_EXPIRED");
      }
      return failure(isCloudConfigurationError(error) ? "CLOUD_NOT_CONFIGURED" : "INTERNAL_ERROR");
    }
  }

  async function signOut(): Promise<void> {
    operationGeneration += 1;
    clearIdentityStorage();
  }

  return { restore, signIn, updateProfile, signOut };
}
