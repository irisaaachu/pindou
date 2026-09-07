"use strict";

async function resolveAssetUrls(fileList, getTempFileURL) {
  if (fileList.some((file) => typeof file !== "string" || !file)) throw new Error("ASSET_UNAVAILABLE");
  const urls = {};
  const cloudFileIds = [];
  for (const file of fileList) {
    if (file.startsWith("https://")) urls[file] = file;
    else cloudFileIds.push(file);
  }
  if (cloudFileIds.length) {
    const response = await getTempFileURL({ fileList: cloudFileIds });
    for (const file of response && response.fileList || []) {
      if (file && typeof file.fileID === "string" && typeof file.tempFileURL === "string" && file.tempFileURL) {
        urls[file.fileID] = file.tempFileURL;
      }
    }
  }
  if (fileList.some((file) => !urls[file])) throw new Error("ASSET_UNAVAILABLE");
  return urls;
}

module.exports = { resolveAssetUrls };
