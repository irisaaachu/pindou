import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const configPath = resolve(
  process.cwd(),
  "uniCloud-aliyun/config/uni-id.config.example.json",
);
const realConfigPath =
  "uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json";

const officialPackages = [
  ["uniCloud-aliyun/cloudfunctions/uni-id-co", "uni-id-co"],
  ["uniCloud-aliyun/cloudfunctions/common/uni-id-common", "uni-id-common"],
  ["uniCloud-aliyun/cloudfunctions/common/uni-config-center", "uni-config-center"],
  [
    "uniCloud-aliyun/cloudfunctions/common/uni-open-bridge-common",
    "uni-open-bridge-common",
  ],
  ["uniCloud-aliyun/cloudfunctions/common/uni-captcha", "uni-captcha"],
  ["uniCloud-aliyun/cloudfunctions/common/uni-cloud-s2s", "uni-cloud-s2s"],
] as const;
const provenanceMappings = [
  [
    "uni_modules/uni-id-pages/uniCloud/cloudfunctions/uni-id-co",
    "uniCloud-aliyun/cloudfunctions/uni-id-co",
  ],
  [
    "uni_modules/uni-id-common/uniCloud/cloudfunctions/common/uni-id-common",
    "uniCloud-aliyun/cloudfunctions/common/uni-id-common",
  ],
  [
    "uni_modules/uni-config-center/uniCloud/cloudfunctions/common/uni-config-center",
    "uniCloud-aliyun/cloudfunctions/common/uni-config-center",
  ],
  [
    "uni_modules/uni-open-bridge-common/uniCloud/cloudfunctions/common/uni-open-bridge-common",
    "uniCloud-aliyun/cloudfunctions/common/uni-open-bridge-common",
  ],
  [
    "uni_modules/uni-captcha/uniCloud/cloudfunctions/common/uni-captcha",
    "uniCloud-aliyun/cloudfunctions/common/uni-captcha",
  ],
  [
    "uni_modules/uni-cloud-s2s/uniCloud/cloudfunctions/common/uni-cloud-s2s",
    "uniCloud-aliyun/cloudfunctions/common/uni-cloud-s2s",
  ],
  [
    "uni_modules/uni-id-pages/uniCloud/database/",
    "uniCloud-aliyun/database/",
  ],
] as const;

function listJsonFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory()
      ? listJsonFiles(path)
      : name.endsWith(".json")
        ? [path]
        : [];
  });
}

function findSecretValues(value: unknown, path = "root"): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;
    if (/^(appid|appsecret)$/i.test(key) && typeof child === "string") {
      return !child || child.startsWith("REPLACE_LOCALLY_") ? [] : [childPath];
    }
    return findSecretValues(child, childPath);
  });
}

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
    expect(existsSync(resolve(process.cwd(), realConfigPath))).toBe(false);
    expect(
      execFileSync("git", ["check-ignore", realConfigPath], { encoding: "utf8" }).trim(),
    ).toBe(realConfigPath);
    expect(spawnSync("git", ["ls-files", "--error-unmatch", realConfigPath]).status).toBe(1);
  });

  test("vendors the required official cloud package roots", () => {
    for (const [directory, packageName] of officialPackages) {
      const packageJson = JSON.parse(
        readFileSync(resolve(process.cwd(), directory, "package.json"), "utf8"),
      );
      expect(packageJson.name, directory).toBe(packageName);
    }
  });

  test("closes every vendored file common-module dependency", () => {
    const availablePackages = new Set<string>(officialPackages.map(([, name]) => name));
    const missing = officialPackages.flatMap(([directory]) => {
      const packageJson = JSON.parse(
        readFileSync(resolve(process.cwd(), directory, "package.json"), "utf8"),
      );
      return Object.entries(packageJson.dependencies ?? {})
        .filter(([, value]) => typeof value === "string" && value.startsWith("file:"))
        .map(([name]) => name)
        .filter((name) => !availablePackages.has(name));
    });

    expect(missing).toEqual([]);
  });

  test("records immutable official provenance, mappings and licenses", () => {
    const provenance = readFileSync(
      resolve(process.cwd(), "docs/vendor/dcloud-uni-id.md"),
      "utf8",
    );

    expect(provenance).toContain("https://gitcode.com/dcloud/hello_uni-id-pages.git");
    expect(provenance).toContain("d0b4b8ad6f837a62eaab2fd49f951e4d74926aa8");
    for (const [source, destination] of provenanceMappings) {
      expect(provenance).toContain(source);
      expect(provenance).toContain(destination);
    }
    expect(provenance).toContain(
      "uniCloud-aliyun/cloudfunctions/common/uni-captcha/LICENSE.md",
    );
  });

  test("documents the safe local deployment order and complete common roots", () => {
    const guide = readFileSync(
      resolve(process.cwd(), "docs/unicloud-aliyun-setup.md"),
      "utf8",
    );
    const safetyGate = guide.indexOf("运行 `npm run check`");
    const realConfig = guide.indexOf("在本地创建已忽略的");
    const commonUpload = guide.indexOf("按以下清单逐一上传全部 common 模块");
    const objectUpload = guide.indexOf("再上传 `uni-id-co` 和 `pindou-profile`");

    expect(safetyGate).toBeGreaterThan(-1);
    expect(safetyGate).toBeLessThan(realConfig);
    expect(commonUpload).toBeGreaterThan(realConfig);
    expect(commonUpload).toBeLessThan(objectUpload);
    for (const packageName of [
      "uni-id-common",
      "uni-config-center",
      "uni-open-bridge-common",
      "uni-captcha",
      "uni-cloud-s2s",
      "pindou-cloud-common",
    ]) {
      expect(guide).toContain(`\`${packageName}\``);
    }
  });

  test("contains no account-bound AppID or AppSecret in JSON", () => {
    const roots = [
      resolve(process.cwd(), "uniCloud-aliyun"),
    ];
    const findings = roots.flatMap(listJsonFiles).flatMap((path) => {
      if (path.endsWith(realConfigPath.replaceAll("/", "\\"))) return [];
      const content = JSON.parse(readFileSync(path, "utf8"));
      return findSecretValues(content, path);
    });

    expect(findings).toEqual([]);
  });
});
