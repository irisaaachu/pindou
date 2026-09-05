import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test, vi } from "vitest";

import { createGalleryController, createGalleryRuntime, createProductionGalleryRuntime } from "../../src/application/gallery";
import type { GalleryRepository, ProjectRepository } from "../../src/domain/contracts";
import { sha256Utf8, type GalleryPatternDetail, type GalleryPatternPayloadV1, type GalleryResult } from "../../src/domain/gallery";
import type { PindouProjectV1 } from "../../src/domain/project";

const summary = {
  id: "tiny-heart", version: "1.0.0", name: "Tiny Heart", coverRef: "cover.png", width: 2, height: 2,
  difficulty: "beginner" as const, sizeClass: "small" as const,
  tags: { usage: ["gift"], themes: ["love"], features: ["editable-text"] }, hasEditableText: true,
  publishedAt: "2026-09-03T00:00:00.000Z",
};

const payload: GalleryPatternPayloadV1 = {
  format: "pindou-gallery-pattern", formatVersion: 1, contentId: "tiny-heart", contentVersion: "1.0.0",
  width: 2, height: 2, palette: { id: "pindou-basic", version: "1.0.0" }, cells: ["R01", null, "R01", "R01"],
  direction: "normal", editableTextRegions: [],
};
const payloadText = JSON.stringify(payload);
const detail: GalleryPatternDetail = {
  ...summary, description: "A tiny heart.", previewRef: "preview.png", physicalWidthMm: 10, physicalHeightMm: 10,
  palette: { id: "pindou-basic", version: "1.0.0" }, direction: "normal", colorCount: 1, beadCount: 3,
  editableTextRegions: [], creator: "Pindou Studio", sourceType: "original",
  payload: { fileRef: "payload.json", formatVersion: 1, byteSize: new TextEncoder().encode(payloadText).byteLength, sha256: sha256Utf8(payloadText) },
};

const pilotCatalog = JSON.parse(readFileSync(resolve(process.cwd(), "content/gallery/catalog.json"), "utf8")) as {
  patterns: Array<{
    id: string;
    version: string;
    name: string;
    description: string;
    usageTags: string[];
    themeTags: string[];
    featureTags: string[];
    difficulty: GalleryPatternDetail["difficulty"];
    sizeClass: GalleryPatternDetail["sizeClass"];
    coverRef: string;
    previewRef: string;
    payload: GalleryPatternDetail["payload"];
    width: number;
    height: number;
    physicalWidthMm: number;
    physicalHeightMm: number;
    palette: GalleryPatternDetail["palette"];
    direction: GalleryPatternDetail["direction"];
    colorCount: number;
    beadCount: number;
    publishedAt: string;
    creator: string;
    sourceType: GalleryPatternDetail["sourceType"];
  }>;
};

const pilotPatterns = pilotCatalog.patterns.map((pattern) => {
  const payloadText = readFileSync(resolve(process.cwd(), `content/gallery/payloads/${pattern.id}-v1.json`), "utf8");
  const payload = JSON.parse(payloadText) as GalleryPatternPayloadV1;
  const summary: GalleryPatternDetail = {
    id: pattern.id,
    version: pattern.version,
    name: pattern.name,
    description: pattern.description,
    coverRef: pattern.coverRef,
    previewRef: pattern.previewRef,
    width: pattern.width,
    height: pattern.height,
    difficulty: pattern.difficulty,
    sizeClass: pattern.sizeClass,
    tags: { usage: pattern.usageTags, themes: pattern.themeTags, features: pattern.featureTags },
    hasEditableText: payload.editableTextRegions.length > 0,
    publishedAt: pattern.publishedAt,
    physicalWidthMm: pattern.physicalWidthMm,
    physicalHeightMm: pattern.physicalHeightMm,
    palette: pattern.palette,
    direction: pattern.direction,
    colorCount: pattern.colorCount,
    beadCount: pattern.beadCount,
    editableTextRegions: payload.editableTextRegions,
    creator: pattern.creator,
    sourceType: pattern.sourceType,
    payload: pattern.payload,
  };
  return { summary, payloadText };
});

function productionController() {
  let nextProjectId = 1;
  const downloads = vi.fn(async (descriptor: GalleryPatternDetail["payload"]) => {
    const pattern = pilotPatterns.find((candidate) => candidate.summary.payload.fileRef === descriptor.fileRef);
    if (!pattern) throw new Error("Unknown production payload");
    return { ok: true as const, data: pattern.payloadText };
  });
  const repository: GalleryRepository = {
    listCategories: async () => ({ ok: true, data: [] }),
    listPatterns: vi.fn(async (query) => ({
      ok: true as const,
      data: {
        items: pilotPatterns.map((pattern) => pattern.summary).filter((pattern) =>
          (!query.search || pattern.name.includes(query.search))
          && (!query.usageTags || query.usageTags.every((tag) => pattern.tags.usage.includes(tag))),
        ).map(({ description, previewRef, physicalWidthMm, physicalHeightMm, palette, direction, colorCount, beadCount, editableTextRegions, creator, sourceType, payload, ...summary }) => summary),
      },
    })),
    getPattern: vi.fn(async (id) => ({ ok: true as const, data: pilotPatterns.find((pattern) => pattern.summary.id === id)?.summary ?? null })),
  };
  const savedProjects = new Map<string, PindouProjectV1>();
  const projects: ProjectRepository = {
    list: async () => [],
    get: async (id) => savedProjects.get(id) ?? null,
    delete: async () => undefined,
    save: async (project) => { savedProjects.set(project.id, project); },
  };
  const dependencies = {
    repository,
    payloadSource: { download: downloads },
    projects,
    copyDependencies: { createId: () => `pilot-local-${nextProjectId++}`, nowIso: () => "2026-09-05T00:00:00.000Z" },
  };
  return { value: createGalleryController(dependencies), downloads, savedProjects };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function controller(overrides: Partial<GalleryRepository> = {}, download = vi.fn(async () => ({ ok: true as const, data: payloadText }))) {
  const repository: GalleryRepository = {
    listCategories: async () => ({ ok: true, data: [] }),
    listPatterns: vi.fn(async () => ({ ok: true as const, data: { items: [summary], nextCursor: "page-2" } })),
    getPattern: vi.fn(async () => ({ ok: true as const, data: detail })),
    ...overrides,
  };
  const projects: ProjectRepository = {
    list: async () => [], get: async () => null, delete: async () => undefined, save: vi.fn(async () => undefined),
  };
  return {
    repository,
    projects,
    download,
    value: createGalleryController({
      repository,
      payloadSource: { download },
      projects,
      copyDependencies: { createId: () => "local-project", nowIso: () => "2026-09-04T00:00:00.000Z" },
    }),
  };
}

describe("gallery controller", () => {
  test("creates the production guest runtime without invoking identity", () => {
    const importObject = vi.fn(() => ({}));
    vi.stubGlobal("uni", {});
    vi.stubGlobal("uniCloud", { importObject });

    try {
      createProductionGalleryRuntime();
      expect(importObject).toHaveBeenCalledWith("pindou-gallery");
      expect(importObject).not.toHaveBeenCalledWith("pindou-identity");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("browses four production summaries by exact Chinese name and each usage without payload or identity access", async () => {
    const { value, downloads } = productionController();

    await value.refresh({ order: "featured", limit: 24 });
    expect(value.list).toEqual(expect.objectContaining({ status: "ready", items: expect.any(Array) }));
    if (value.list.status !== "ready") throw new Error("Expected pilot summaries");
    expect(value.list.items.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: "inside-cute-dog-sign", name: "内有萌犬" },
      { id: "delivery-block-door-sign", name: "快递挡在门口" },
      { id: "birthday-dog-cake-bouquet", name: "生日小伙伴" },
      { id: "farewell-fortune-sign", name: "脱离苦海 发大财" },
    ]);
    expect(value.list.items.every((item) => !("previewRef" in item) && !("payload" in item))).toBe(true);

    await value.refresh({ search: "内有萌犬", order: "featured", limit: 24 });
    expect(value.list).toEqual(expect.objectContaining({ status: "ready", items: [expect.objectContaining({ id: "inside-cute-dog-sign", name: "内有萌犬" })] }));
    if (value.list.status !== "ready") throw new Error("Expected pilot summaries");
    expect(value.list.items).toHaveLength(1);
    expect(value.list.items[0]).not.toHaveProperty("previewRef");
    expect(value.list.items[0]).not.toHaveProperty("payload");

    for (const [usage, id] of [["door-sign", "inside-cute-dog-sign"], ["delivery-sign", "delivery-block-door-sign"], ["birthday", "birthday-dog-cake-bouquet"], ["farewell", "farewell-fortune-sign"]]) {
      await value.refresh({ usageTags: [usage], order: "featured", limit: 24 });
      expect(value.list).toEqual(expect.objectContaining({ status: "ready", items: [expect.objectContaining({ id })] }));
    }

    expect(downloads).not.toHaveBeenCalled();
  });

  test("loads production preview metadata before explicit payload use and persists independent local copies", async () => {
    const { value, downloads, savedProjects } = productionController();

    await value.loadDetail("inside-cute-dog-sign");
    expect(value.detail).toEqual(expect.objectContaining({
      status: "ready",
      detail: expect.objectContaining({
        name: "内有萌犬",
        previewRef: "previews/detail/inside-cute-dog-sign-v1.png",
        payload: expect.objectContaining({ fileRef: "payloads/inside-cute-dog-sign-v1.json" }),
      }),
    }));
    expect(downloads).not.toHaveBeenCalled();

    await expect(value.useCurrentDetail()).resolves.toEqual(expect.objectContaining({ ok: true }));
    await expect(value.useCurrentDetail()).resolves.toEqual(expect.objectContaining({ ok: true }));
    const copies = [...savedProjects.values()];

    expect(downloads).toHaveBeenCalledTimes(2);
    expect(copies).toHaveLength(2);
    expect(copies.map((project) => project.id)).toEqual(["pilot-local-1", "pilot-local-2"]);
    expect(copies.every((project) => project.source.type === "gallery" && project.source.patternId === "inside-cute-dog-sign")).toBe(true);
    copies[0].cells[0] = null;
    expect(copies[1].cells[0]).toBe(JSON.parse(pilotPatterns[0].payloadText).cells[0]);
  });

  test("moves list from idle through loading to ready and preserves the submitted query", async () => {
    const { value, repository } = controller();
    expect(value.list).toEqual({ status: "idle" });

    const loading = value.refresh({ search: "  heart  ", order: "newest", limit: 12 });
    expect(value.list).toEqual(expect.objectContaining({ status: "loading", query: { search: "heart", order: "newest", limit: 12 } }));
    await loading;

    expect(value.list).toEqual(expect.objectContaining({ status: "ready", items: [summary], nextCursor: "page-2" }));
    expect(repository.listPatterns).toHaveBeenCalledWith({ search: "heart", order: "newest", limit: 12 });
  });

  test("uses empty and failure states and retries the exact failed query", async () => {
    const listPatterns = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { items: [] } })
      .mockResolvedValueOnce({ ok: false, error: { code: "NETWORK_ERROR" } })
      .mockResolvedValueOnce({ ok: true, data: { items: [summary] } });
    const { value } = controller({ listPatterns });

    await value.refresh({ order: "featured", limit: 24 });
    expect(value.list).toEqual(expect.objectContaining({ status: "empty" }));
    await value.refresh({ search: "gift", order: "featured", limit: 24 });
    expect(value.list).toEqual(expect.objectContaining({ status: "failure", error: { code: "NETWORK_ERROR" } }));
    await value.retryList();
    expect(value.list).toEqual(expect.objectContaining({ status: "ready", items: [summary] }));
    expect(listPatterns).toHaveBeenLastCalledWith({ search: "gift", order: "featured", limit: 24 });
  });

  test("appends the next page without replacing current results", async () => {
    const second = { ...summary, id: "flower", name: "Flower" };
    const listPatterns = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { items: [summary], nextCursor: "page-2" } })
      .mockResolvedValueOnce({ ok: true, data: { items: [second] } });
    const { value } = controller({ listPatterns });

    await value.refresh({ order: "featured", limit: 24 });
    await value.loadNextPage();

    expect(value.list).toEqual(expect.objectContaining({ status: "ready", items: [summary, second] }));
    expect(listPatterns).toHaveBeenLastCalledWith({ order: "featured", limit: 24, cursor: "page-2" });
  });

  test("ignores an older list response after a new search refresh", async () => {
    const first = deferred<ReturnType<GalleryRepository["listPatterns"]> extends Promise<infer Result> ? Result : never>();
    const listPatterns = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce({ ok: true, data: { items: [{ ...summary, name: "New" }] } });
    const { value } = controller({ listPatterns });

    const oldRequest = value.refresh({ search: "old", order: "featured", limit: 24 });
    await value.refresh({ search: "new", order: "featured", limit: 24 });
    first.resolve({ ok: true, data: { items: [{ ...summary, name: "Old" }] } });
    await oldRequest;

    expect(value.list).toEqual(expect.objectContaining({ status: "ready", items: [{ ...summary, name: "New" }] }));
  });

  test("loads ready, not-found, and failure detail states and ignores stale detail responses", async () => {
    const old = deferred<ReturnType<GalleryRepository["getPattern"]> extends Promise<infer Result> ? Result : never>();
    const getPattern = vi.fn()
      .mockImplementationOnce(() => old.promise)
      .mockResolvedValueOnce({ ok: true, data: detail })
      .mockResolvedValueOnce({ ok: true, data: null })
      .mockResolvedValueOnce({ ok: false, error: { code: "NETWORK_ERROR" } })
      .mockResolvedValueOnce({ ok: false, error: { code: "NETWORK_ERROR" } });
    const { value } = controller({ getPattern });

    const oldRequest = value.loadDetail("old");
    await value.loadDetail("tiny-heart");
    old.resolve({ ok: true, data: { ...detail, id: "old" } });
    await oldRequest;
    expect(value.detail).toEqual({ status: "ready", detail });
    await value.loadDetail("missing");
    expect(value.detail).toEqual({ status: "not-found" });
    await value.loadDetail("broken");
    expect(value.detail).toEqual({ status: "failure", id: "broken", error: { code: "NETWORK_ERROR" } });
    await value.retryDetail();
    expect(getPattern).toHaveBeenLastCalledWith("broken");
  });

  test("deduplicates simultaneous use actions into one download and one local project", async () => {
    const pending = deferred<{ ok: true; data: string }>();
    const download = vi.fn(() => pending.promise);
    const { value, projects } = controller({}, download);
    await value.loadDetail("tiny-heart");

    const first = value.useCurrentDetail();
    const second = value.useCurrentDetail();
    expect(first).toBe(second);
    pending.resolve({ ok: true, data: payloadText });

    await expect(first).resolves.toEqual(expect.objectContaining({ ok: true }));
    expect(download).toHaveBeenCalledTimes(1);
    expect(projects.save).toHaveBeenCalledTimes(1);
  });

  test("keeps a copied project in the explicit runtime handoff only after use", async () => {
    const { repository, projects, download } = controller();
    const value = createGalleryRuntime({
      controllerDependencies: {
        repository,
        payloadSource: { download },
        projects,
        copyDependencies: { createId: () => "local-project", nowIso: () => "2026-09-04T00:00:00.000Z" },
      },
    });

    expect(value.handoff.project).toBeNull();
    await value.controller.loadDetail("tiny-heart");
    expect(value.handoff.project).toBeNull();
    expect(projects.save).not.toHaveBeenCalled();

    await expect(value.useCurrentDetail()).resolves.toEqual(expect.objectContaining({ ok: true }));
    expect(value.handoff.project).toEqual(expect.objectContaining({ id: "local-project" }));
  });

  test.each([
    ["download failure", { ok: false, error: { code: "NETWORK_ERROR" } }],
    ["integrity failure", { ok: false, error: { code: "PAYLOAD_INTEGRITY_FAILED" } }],
    ["invalid JSON", { ok: true, data: "not-json" }],
    ["copy mismatch", { ok: true, data: JSON.stringify({ ...payload, contentId: "other" }) }],
  ] as Array<[string, GalleryResult<string>]>)('keeps no handoff or saved project after %s', async (_name, downloadResult) => {
    const base = controller();
    const value = createGalleryRuntime({
      controllerDependencies: {
        repository: base.repository,
        payloadSource: { download: async () => downloadResult },
        projects: base.projects,
        copyDependencies: { createId: () => "must-not-save", nowIso: () => "2026-09-04T00:00:00.000Z" },
      },
    });

    await value.controller.loadDetail("tiny-heart");
    await expect(value.useCurrentDetail()).resolves.toEqual(expect.objectContaining({ ok: false }));
    expect(base.projects.save).not.toHaveBeenCalled();
    expect(value.handoff.project).toBeNull();
  });
});
