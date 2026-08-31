import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const configPath = resolve(
  process.cwd(),
  "uniCloud-aliyun/config/uni-id.config.example.json",
);

describe("uniCloud configuration hygiene", () => {
  test("ships only unmistakable uni-id placeholders", () => {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const weixin = config["mp-weixin"].oauth.weixin;

    expect(config.dcloudAppid).toMatch(/^REPLACE_LOCALLY_/);
    expect(weixin.appid).toMatch(/^REPLACE_LOCALLY_/);
    expect(weixin.appsecret).toMatch(/^REPLACE_LOCALLY_/);
  });

  test("ignores the real config without ignoring the example", () => {
    const gitignore = readFileSync(resolve(process.cwd(), ".gitignore"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim());

    expect(gitignore).toContain(
      "uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json",
    );
    expect(gitignore).not.toContain(
      "uniCloud-aliyun/config/uni-id.config.example.json",
    );
  });
});
