import type { IdentityResult, ProfileDraft } from "./types";

type ValidatedProfile = {
  nickname: string | undefined;
  avatar: ProfileDraft["avatar"] | undefined;
};

export function normalizeNickname(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

export function validateProfileDraft(draft: ProfileDraft): IdentityResult<ValidatedProfile> {
  const nickname = normalizeNickname(draft.nickname);
  if (Array.from(nickname).length > 20) return invalidProfile();

  if (draft.avatar !== null) {
    const { mimeType, size, base64 } = draft.avatar;
    if ((mimeType !== "image/jpeg" && mimeType !== "image/png")
      || !Number.isInteger(size)
      || size < 1
      || size > 1_048_576
      || base64.length === 0) {
      return invalidProfile();
    }
  }

  return {
    ok: true,
    data: {
      nickname: nickname || undefined,
      avatar: draft.avatar || undefined,
    },
  };
}

function invalidProfile(): { ok: false; error: { code: "INVALID_PROFILE" } } {
  return { ok: false, error: { code: "INVALID_PROFILE" } };
}
