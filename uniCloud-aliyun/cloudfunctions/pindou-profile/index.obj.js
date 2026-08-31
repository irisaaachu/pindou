"use strict";

const { createInstance } = require("uni-id-common");
const { failure, success, toPublicFailure } = require("pindou-cloud-common");
const { buildProfileUpdate } = require("./profile-core");

function invalidRequest() {
  return publicError("INVALID_REQUEST");
}

function publicError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

module.exports = {
  async _before() {
    try {
      const uniIdCommon = createInstance({ clientInfo: this.getClientInfo() });
      const token = this.getUniIdToken();
      if (typeof token !== "string" || !token) throw publicError("IDENTITY_REQUIRED");
      const result = await uniIdCommon.checkToken(token);
      if (!result || result.errCode !== 0 || typeof result.uid !== "string" || !result.uid) {
        throw publicError("IDENTITY_REQUIRED");
      }
      this.verifiedUid = result.uid;
    } catch (error) {
      if (error && error.code === "IDENTITY_REQUIRED") throw error;
      throw publicError("INTERNAL_ERROR");
    }
  },

  async getProfile() {
    try {
      const db = uniCloud.database();
      const result = await db.collection("uni-id-users").doc(this.verifiedUid).get();
      const user = result.data && result.data[0] ? result.data[0] : {};
      const profile = { uid: this.verifiedUid };
      if (typeof user.nickname === "string" && user.nickname) profile.nickname = user.nickname;
      if (typeof user.avatar === "string" && user.avatar) {
        const tempFile = await uniCloud.getTempFileURL({ fileList: [user.avatar] });
        const file = tempFile.fileList && tempFile.fileList[0];
        if (file && typeof file.tempFileURL === "string") profile.avatarUrl = file.tempFileURL;
      }
      return success(profile);
    } catch (error) {
      return toPublicFailure(error);
    }
  },

  async updateProfile(draft) {
    try {
      if (!draft || typeof draft !== "object" || Array.isArray(draft)) throw invalidRequest();
      if (!Object.prototype.hasOwnProperty.call(draft, "nickname")
        && !Object.prototype.hasOwnProperty.call(draft, "avatar")) {
        throw invalidRequest();
      }
      const update = buildProfileUpdate(draft);
      const data = {};
      const db = uniCloud.database();
      if (update.clearNickname) data.nickname = db.command.remove();
      if (update.nickname) data.nickname = update.nickname;
      if (update.avatar) {
        const cloudPath = `pindou/avatars/${this.verifiedUid}/profile.${update.avatar.extension}`;
        data.avatar = await uniCloud.uploadFile({
          cloudPath,
          fileContent: update.avatar.bytes,
          cloudPathAsRealPath: true,
        });
      }
      await db.collection("uni-id-users").doc(this.verifiedUid).update(data);
      return this.getProfile();
    } catch (error) {
      return toPublicFailure(error);
    }
  },
};
