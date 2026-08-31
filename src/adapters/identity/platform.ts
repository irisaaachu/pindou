import type { ProfileDraft } from "../../domain/identity";
import type { IdentityPlatformDependencies } from "./uni-cloud-identity-service";

type Platform = IdentityPlatformDependencies["platform"];

export type AvatarFile = Exclude<ProfileDraft["avatar"], null>;

type AvatarReadDependencies = {
  getFileInfo(filePath: string): Promise<{ size: number }>;
  readFile(filePath: string): Promise<string>;
  base64ToArrayBuffer(base64: string): ArrayBuffer;
};

function unsupported(): Promise<never> {
  return Promise.reject(new Error("PLATFORM_UNSUPPORTED"));
}

export function createIdentityPlatformDependencies(): IdentityPlatformDependencies {
  let platform: Platform = "other";
  let loginWeixin: IdentityPlatformDependencies["loginWeixin"] = unsupported;
  let loginByWeixin: IdentityPlatformDependencies["loginByWeixin"] = unsupported;
  let getProfile: IdentityPlatformDependencies["getProfile"] = unsupported;
  let updateProfile: IdentityPlatformDependencies["updateProfile"] = unsupported;

  // #ifdef H5
  platform = "h5";
  // #endif
  // #ifdef APP-PLUS
  platform = "app";
  // #endif
  // #ifdef MP-WEIXIN
  platform = "mp-weixin";
  loginWeixin = () => new Promise((resolve, reject) => {
    uni.login({
      provider: "weixin",
      success: ({ code }) => code ? resolve({ code }) : reject(new Error("LOGIN_FAILED")),
      fail: reject,
    });
  });
  loginByWeixin = (code) => uniCloud.importObject("uni-id-co").loginByWeixin({ code });
  getProfile = () => uniCloud.importObject("pindou-profile").getProfile();
  updateProfile = (draft: ProfileDraft) => uniCloud.importObject("pindou-profile").updateProfile(draft);
  // #endif

  return {
    platform,
    now: () => Date.now(),
    loginWeixin,
    loginByWeixin,
    getProfile,
    updateProfile,
    readStorage: (key) => uni.getStorageSync(key),
    writeStorage: (key, value) => uni.setStorageSync(key, value),
    removeStorage: (key) => uni.removeStorageSync(key),
  };
}

export async function readTemporaryAvatarFile(filePath: string): Promise<AvatarFile> {
  // #ifdef MP-WEIXIN
  return readAvatarFile({
    getFileInfo: () => new Promise((resolve, reject) => {
      uni.getFileInfo({ filePath, success: ({ size }) => resolve({ size }), fail: reject });
    }),
    readFile: () => new Promise((resolve, reject) => {
      uni.getFileSystemManager().readFile({
        filePath,
        encoding: "base64",
        success: ({ data }) => typeof data === "string" ? resolve(data) : reject(new Error("INVALID_PROFILE")),
        fail: reject,
      });
    }),
    base64ToArrayBuffer: uni.base64ToArrayBuffer,
  }, filePath);
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error("PLATFORM_UNSUPPORTED");
  // #endif
}

export async function readAvatarFile(
  dependencies: AvatarReadDependencies,
  filePath: string,
): Promise<AvatarFile> {
  const fileInfo = await dependencies.getFileInfo(filePath);
  if (!Number.isInteger(fileInfo.size) || fileInfo.size < 1 || fileInfo.size > 1_048_576) {
    throw new Error("INVALID_PROFILE");
  }
  const base64 = await dependencies.readFile(filePath);
  const bytes = new Uint8Array(dependencies.base64ToArrayBuffer(base64));
  return { base64, size: fileInfo.size, mimeType: avatarMimeType(bytes) };
}

function avatarMimeType(bytes: Uint8Array): "image/jpeg" | "image/png" {
  const isPng = bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (isPng) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  throw new Error("INVALID_PROFILE");
}
