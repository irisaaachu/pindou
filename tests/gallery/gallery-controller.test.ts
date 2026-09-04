import { describe, expect, test, vi } from "vitest";

import { createGalleryController } from "../../src/application/gallery";
import type { GalleryRepository, ProjectRepository } from "../../src/domain/contracts";
import { sha256Utf8, type GalleryPatternDetail, type GalleryPatternPayloadV1 } from "../../src/domain/gallery";

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
});
