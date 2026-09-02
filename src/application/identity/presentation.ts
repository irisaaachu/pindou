import type { IdentityFailureCode, IdentityState } from "../../domain/identity";

export type IdentityPresentation = {
  title: string;
  detail: string;
  action: string;
  privacy: string;
  failure: string | null;
};

export type CreateCloudPresentation = {
  title: string;
  copy: string;
  action: string;
  ready: boolean;
};

export function getIdentityPresentation(state: IdentityState): IdentityPresentation {
  const privacy = "微信身份、资料设置与云作品操作均由你主动触发，不会上传你的原始创作照片。";

  if (state.status === "authenticated" && state.session) {
    const profileFailure = state.failure ? profileErrorCopy(state.failure.code) : null;
    return {
      title: state.session.user.nickname || "拼豆朋友",
      detail: profileFailure || "身份已就绪，可在后续版本使用云作品。",
      action: "编辑资料",
      privacy,
      failure: profileFailure,
    };
  }

  if (state.status === "restoring" || state.status === "signing-in") {
    return { title: "正在确认身份", detail: "请稍候。", action: "处理中", privacy, failure: null };
  }

  if (state.status === "error") {
    return {
      title: "暂时无法登录",
      detail: identityErrorCopy(state.failure?.code),
      action: "重新登录",
      privacy,
      failure: null,
    };
  }

  if (state.failure?.code === "SESSION_EXPIRED") {
    return { title: "拼豆朋友", detail: "登录状态已过期，请重新登录后继续。", action: "重新登录", privacy, failure: null };
  }

  return {
    title: "拼豆朋友",
    detail: "未登录也可以继续本地生成与导出。",
    action: "微信登录",
    privacy,
    failure: null,
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

export function getCreateCloudPresentation(state: IdentityState): CreateCloudPresentation {
  if (state.status === "authenticated" && state.session) {
    return {
      title: "身份已就绪",
      copy: "身份已就绪，云作品将在后续版本开放",
      action: "已完成身份确认",
      ready: true,
    };
  }

  if (state.failure && state.failure.code !== "USER_CANCELLED") {
    const presentation = getIdentityPresentation(state);
    return { title: presentation.title, copy: presentation.detail, action: presentation.action, ready: false };
  }

  return {
    title: "云作品功能尚未接入",
    copy: "你可以主动确认身份后，在后续版本查看云作品。",
    action: "确认身份后查看",
    ready: false,
  };
}
