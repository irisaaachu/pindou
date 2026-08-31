import { createRequire } from "node:module";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const require = createRequire(import.meta.url);
const profileCorePath = resolve(
  process.cwd(),
  "uniCloud-aliyun/cloudfunctions/pindou-profile/profile-core.js",
);
const {
  buildProfileUpdate,
  decodeAvatar,
  normalizeCloudNickname,
} = require(profileCorePath);

const pngBytes = Buffer.from("89504e470d0a1a0a", "hex");
const jpegBytes = Buffer.from("ffd8ffe000104a4649460001", "hex");

describe("pindou profile core", () => {
  test("normalizes nicknames like the client domain", () => {
    expect(normalizeCloudNickname("  小   豆  ")).toBe("小 豆");
  });

  test("rejects nicknames longer than twenty Unicode code points", () => {
    expect(() => normalizeCloudNickname("豆".repeat(21))).toThrow("INVALID_PROFILE");
  });

  test("marks an explicit empty nickname for removal", () => {
    expect(buildProfileUpdate({ nickname: "", avatar: null })).toEqual({
      clearNickname: true,
    });
  });

  test.each([
    ["GIF", "image/gif", Buffer.from("474946383961", "hex")],
    ["empty bytes", "image/png", Buffer.alloc(0)],
    ["declared oversized data", "image/png", pngBytes, 1_048_577],
    ["PNG declared as JPEG", "image/jpeg", pngBytes],
    ["JPEG declared as PNG", "image/png", jpegBytes],
  ])("rejects %s avatars", (_name, mimeType, bytes, size = bytes.length) => {
    expect(() => decodeAvatar({
      mimeType,
      size,
      base64: bytes.toString("base64"),
    })).toThrow("INVALID_PROFILE");
  });

  test.each([
    ["image/png", pngBytes, "png"],
    ["image/jpeg", jpegBytes, "jpg"],
  ])("decodes valid %s avatars once with a fixed extension", (mimeType, bytes, extension) => {
    expect(decodeAvatar({
      mimeType,
      size: bytes.length,
      base64: bytes.toString("base64"),
    })).toEqual({ bytes, extension });
  });

  test("builds a sanitized update without client identity fields", () => {
    expect(buildProfileUpdate({
      uid: "attacker",
      token: "attacker-token",
      _id: "attacker-id",
      nickname: "  Pindou  ",
      avatar: {
        mimeType: "image/png",
        size: pngBytes.length,
        base64: pngBytes.toString("base64"),
      },
      role: "admin",
    })).toEqual({
      nickname: "Pindou",
      avatar: { bytes: pngBytes, extension: "png" },
    });
  });
});
