import type { ProfileDraft } from "../../domain/identity";
import type { IdentityPlatformDependencies } from "./uni-cloud-identity-service";

type Platform = IdentityPlatformDependencies["platform"];

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
