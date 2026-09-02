import { describe, expect, test } from "vitest";

import { normalizeNickname, validateProfileDraft } from "../../src/domain/identity";

describe("profile validation", () => {
  test("normalizes surrounding and internal whitespace", () => {
    expect(normalizeNickname("  小 豆  ")).toBe("小 豆");
  });

  test("treats an empty nickname and empty avatar as unset", () => {
    expect(validateProfileDraft({ nickname: "", avatar: null })).toEqual({
      ok: true,
      data: { nickname: undefined, avatar: undefined },
    });
  });

  test("rejects nicknames longer than twenty Unicode code points", () => {
    expect(validateProfileDraft({ nickname: "豆".repeat(21), avatar: null })).toEqual({
      ok: false,
      error: { code: "INVALID_PROFILE" },
    });
  });

  test("rejects unsupported avatar mime types", () => {
    expect(validateProfileDraft({
      nickname: "Pindou",
      avatar: { mimeType: "image/gif", size: 30, base64: "R0lGODlh" },
    })).toEqual({ ok: false, error: { code: "INVALID_PROFILE" } });
  });

  test.each([
    ["empty base64", { mimeType: "image/png", size: 30, base64: "" }],
    ["zero bytes", { mimeType: "image/png", size: 0, base64: "AAAA" }],
    ["too large", { mimeType: "image/png", size: 1_048_577, base64: "AAAA" }],
  ])("rejects avatar with %s", (_name, avatar) => {
    expect(validateProfileDraft({ nickname: "Pindou", avatar })).toEqual({
      ok: false,
      error: { code: "INVALID_PROFILE" },
    });
  });

  test("accepts supported avatar metadata", () => {
    expect(validateProfileDraft({
      nickname: "Pindou",
      avatar: { mimeType: "image/jpeg", size: 1, base64: "AAAA" },
    })).toEqual({
      ok: true,
      data: {
        nickname: "Pindou",
        avatar: { mimeType: "image/jpeg", size: 1, base64: "AAAA" },
      },
    });
  });
});
