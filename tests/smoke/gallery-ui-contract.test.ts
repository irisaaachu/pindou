import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PagesConfig = {
  pages: Array<{ path: string }>;
  tabBar?: { list: Array<{ pagePath: string }> };
};

function readSource(path: string): string {
  return readFileSync(resolve(path), "utf8");
}

function readPagesConfig(): PagesConfig {
  return JSON.parse(readSource("src/pages.json")) as PagesConfig;
}

describe("gallery discovery UI contract", () => {
  it("registers gallery list and detail pages without adding a tab", () => {
    const config = readPagesConfig();

    expect(config.pages.map((page) => page.path)).toContain("pages/gallery/index");
    expect(config.pages.map((page) => page.path)).toContain("pages/gallery/detail");
    expect(config.tabBar?.list.map((tab) => tab.pagePath)).toEqual([
      "pages/index/index",
      "pages/create/index",
      "pages/my/index",
    ]);
  });

  it("makes only the home gallery entry navigable", () => {
    const source = readSource("src/pages/index/index.vue");

    expect(source).toContain('id: "gallery"');
    expect(source).toContain('uni.navigateTo({ url: "/pages/gallery/index" })');
    expect(source).toContain('entry.id === "gallery"');
  });

  it("provides a real gallery page and reusable cards without identity imports", () => {
    const files = [
      "src/pages/gallery/index.vue",
      "src/components/gallery/PatternCard.vue",
      "src/components/gallery/GalleryFilters.vue",
    ];

    for (const file of files) expect(existsSync(resolve(file))).toBe(true);

    const page = readSource("src/pages/gallery/index.vue");
    const card = readSource("src/components/gallery/PatternCard.vue");
    const filters = readSource("src/components/gallery/GalleryFilters.vue");

    expect(page).toContain("createGalleryRuntime");
    expect(page).toContain("setTimeout");
    expect(page).toContain("300");
    expect(page).toContain("trim()");
    expect(page).toContain('order: "featured"');
    expect(page).toContain('order: "newest"');
    expect(page).toContain("scroll-view");
    expect(page).toContain("loadNextPage");
    expect(page).toContain("retryList");
    expect(page).toContain("clearFilters");
    expect(page).toContain("encodeURIComponent");
    expect(page).toContain("PatternCard");
    expect(page).toContain("GalleryFilters");
    expect(page).not.toMatch(/identity/i);

    expect(card).toContain("GalleryPatternSummary");
    expect(card).toContain('emit("select"');
    expect(card).toContain("@error");
    expect(card).toContain("coverFailed");

    expect(filters).toContain("usageTags");
    expect(filters).toContain("themeTags");
    expect(filters).toContain("difficulty");
    expect(filters).toContain("sizeClass");
    expect(filters).toContain("featureTags");
    expect(filters).toContain('emit("apply"');
    expect(filters).toContain('emit("clear"');
  });
});
