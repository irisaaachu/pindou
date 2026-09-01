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
    expect(provenance).toMatch(/\b[0-9a-f]{40}\b/);
    for (const [destination] of officialPackages) expect(provenance).toContain(destination);
    expect(provenance).toContain("uni_modules/uni-id-pages/uniCloud/database/");
    expect(provenance).toMatch(/license/i);
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
