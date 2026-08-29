import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PagesConfig = {
  pages: Array<{ path: string }>;
  tabBar?: {
    list: Array<{ pagePath: string; text: string }>;
  };
};

function readPagesConfig(): PagesConfig {
  const source = readFileSync(resolve("src/pages.json"), "utf8");
  const withoutLineComments = source.replace(/\/\/.*$/gm, "");
  return JSON.parse(withoutLineComments) as PagesConfig;
}

describe("application shell", () => {
  it("registers Home, Create and My as real tab pages", () => {
    const config = readPagesConfig();
    const expectedTabs = [
      { pagePath: "pages/index/index", text: "首页" },
      { pagePath: "pages/create/index", text: "创作" },
      { pagePath: "pages/my/index", text: "我的" },
    ];

    expect(config.pages.map((page) => page.path)).toEqual(
      expectedTabs.map((tab) => tab.pagePath),
    );
    expect(config.tabBar?.list).toEqual(expectedTabs);

    for (const tab of expectedTabs) {
      expect(existsSync(resolve("src", `${tab.pagePath}.vue`))).toBe(true);
    }
  });
});
