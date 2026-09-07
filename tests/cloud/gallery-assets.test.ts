import { createRequire } from "node:module";
import { resolve } from "node:path";

import { describe, expect, test, vi } from "vitest";

const require = createRequire(import.meta.url);
const { resolveAssetUrls } = require(resolve(process.cwd(), "uniCloud-aliyun/cloudfunctions/pindou-gallery/gallery-assets.js"));

describe("pindou gallery asset URLs", () => {
  test("uses Alibaba HTTPS file IDs directly and only resolves cloud IDs", async () => {
    const getTempFileURL = vi.fn(async () => ({
      fileList: [{ fileID: "cloud://cover", tempFileURL: "https://cdn.example/cover.png" }],
    }));

    const urls = await resolveAssetUrls(
      ["https://aliyun.example/detail.png", "https://aliyun.example/payload.json", "cloud://cover"],
      getTempFileURL,
    );

    expect(getTempFileURL).toHaveBeenCalledWith({ fileList: ["cloud://cover"] });
    expect(urls).toEqual({
      "https://aliyun.example/detail.png": "https://aliyun.example/detail.png",
      "https://aliyun.example/payload.json": "https://aliyun.example/payload.json",
      "cloud://cover": "https://cdn.example/cover.png",
    });
  });
});
