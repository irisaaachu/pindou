import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

const read = (path: string) => readFile(path, "utf8");

describe("local photo generator UI contract", () => {
  test("registers and opens the photo route", async () => {
    const [pages, home] = await Promise.all([read("src/pages.json"), read("src/pages/index/index.vue")]);
    expect(pages).toContain("pages/photo-generator/index");
    expect(home).toContain('/pages/photo-generator/index');
  });

  test("offers local camera/album flow, previews and lifecycle cleanup", async () => {
    const [page, picker, settings] = await Promise.all([read("src/pages/photo-generator/index.vue"), read("src/components/photo-generation/PhotoSourcePicker.vue"), read("src/components/photo-generation/GenerationSettings.vue")]);
    const flow = `${page}\n${picker}\n${settings}`;
    for (const copy of ["拍一张", "从相册选择", "照片仅在本机处理，不会自动上传", "原图", "拼豆效果", "方格预览", "重新生成", "onUnload", "dispose"]) expect(flow).toContain(copy);
    expect(page).not.toMatch(/identity|uniCloud|云保存|3D|手动编辑/);
  });
});
