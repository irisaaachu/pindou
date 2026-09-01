import type { IdentityFailureCode, IdentityState } from "../../domain/identity";

export type IdentityPresentation = {
  title: string;
  detail: string;
  action: string;
  privacy: string;
};

export function getIdentityPresentation(state: IdentityState): IdentityPresentation {
  const privacy = "微信身份、资料设置与云作品操作均由你主动触发，不会上传你的原始创作照片。";

  if (state.status === "authenticated" && state.session) {
    return {
      title: state.session.user.nickname || "拼豆朋友",
      detail: state.failure ? profileErrorCopy(state.failure.code) : "身份已就绪，可在后续版本使用云作品。",
      action: "编辑资料",
      privacy,
    };
  }

  if (state.status === "restoring" || state.status === "signing-in") {
    return { title: "正在确认身份", detail: "请稍候。", action: "处理中", privacy };
  }

  if (state.status === "error") {
    return {
      title: "暂时无法登录",
      detail: identityErrorCopy(state.failure?.code),
      action: "重新登录",
      privacy,
    };
  }

  if (state.failure?.code === "SESSION_EXPIRED") {
    return { title: "拼豆朋友", detail: "登录状态已过期，请重新登录后继续。", action: "重新登录", privacy };
  }

  return {
    title: "拼豆朋友",
    detail: "未登录也可以继续本地生成与导出。",
    action: "微信登录",
    privacy,
  };
}

function profileErrorCopy(code: IdentityFailureCode): string {
  if (code === "INVALID_PROFILE") return "资料格式不符合要求，请检查昵称或头像。";
  if (code === "SESSION_EXPIRED") return "登录状态已过期，请重新登录后继续。";
  return "资料保存未完成，请稍后重试。";
}

function identityErrorCopy(code: IdentityFailureCode | undefined): string {
  if (code === "PLATFORM_UNSUPPORTED") return "当前平台暂不支持微信身份登录。";
  if (code === "CLOUD_NOT_CONFIGURED") return "云服务暂未配置，请稍后再试。";
  return "登录未完成，请重新尝试。";
}
