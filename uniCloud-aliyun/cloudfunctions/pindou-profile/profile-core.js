"use strict";

const MAX_AVATAR_BYTES = 1_048_576;

function invalidProfile() {
  const error = new Error("INVALID_PROFILE");
  error.code = "INVALID_PROFILE";
  return error;
}

function normalizeCloudNickname(value) {
  if (typeof value !== "string") throw invalidProfile();

  const nickname = value.trim().replace(/\s+/gu, " ");
  if (Array.from(nickname).length > 20) throw invalidProfile();
  return nickname;
}

function decodeAvatar(avatar) {
  if (!avatar || typeof avatar !== "object"
    || (avatar.mimeType !== "image/jpeg" && avatar.mimeType !== "image/png")
    || !Number.isInteger(avatar.size)
    || avatar.size < 1
    || avatar.size > MAX_AVATAR_BYTES
    || typeof avatar.base64 !== "string"
    || avatar.base64.length === 0) {
    throw invalidProfile();
  }

  const bytes = Buffer.from(avatar.base64, "base64");
  if (bytes.length < 1 || bytes.length > MAX_AVATAR_BYTES || bytes.length !== avatar.size) {
    throw invalidProfile();
  }

  const isPng = bytes.length >= 8
    && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  const isJpeg = bytes.length >= 3
    && bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"));

  if ((avatar.mimeType === "image/png" && !isPng)
    || (avatar.mimeType === "image/jpeg" && !isJpeg)) {
    throw invalidProfile();
  }

  return { bytes, extension: isPng ? "png" : "jpg" };
}

function buildProfileUpdate(draft) {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    throw invalidProfile();
  }

  const update = {};
  if (Object.prototype.hasOwnProperty.call(draft, "nickname")) {
    const nickname = normalizeCloudNickname(draft.nickname);
    if (nickname) {
      update.nickname = nickname;
    } else {
      update.clearNickname = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(draft, "avatar") && draft.avatar !== null) {
    update.avatar = decodeAvatar(draft.avatar);
  }
  return update;
}

module.exports = {
  buildProfileUpdate,
  decodeAvatar,
  normalizeCloudNickname,
};
