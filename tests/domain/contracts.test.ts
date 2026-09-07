import { describe, expect, test } from "vitest";

import type {
  ExportArtifact,
  ExportOptions,
  GalleryCategory,
  GalleryListQuery,
  GalleryPage,
  GalleryPatternDetail,
  GalleryPatternSummary,
  GalleryPayloadDescriptor,
  GalleryResult,
  GenerationEngine,
  GenerationRequest,
  GalleryPayloadSource,
  GalleryRepository,
  PhotoGenerationResult,
  ProjectExporter,
  ProjectRepository,
  ProjectSummary,
} from "../../src/domain/contracts";
import type { PindouProjectV1 } from "../../src/domain/project";
import { validPhotoProject } from "../fixtures/projects";

class MemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, PindouProjectV1>();

  async list(): Promise<ProjectSummary[]> {
    return [...this.projects.values()].map((project) => ({
      id: project.id,
      name: project.name,
      sourceType: project.source.type,
      updatedAt: project.updatedAt,
      previewRef: project.previewRef,
    }));
  }

  async get(id: string): Promise<PindouProjectV1 | null> {
    return this.projects.get(id) ?? null;
  }

  async save(project: PindouProjectV1): Promise<void> {
    this.projects.set(project.id, project);
  }

  async delete(id: string): Promise<void> {
    this.projects.delete(id);
  }
}

class DeterministicGenerationEngine implements GenerationEngine {
  async generate(request: GenerationRequest): Promise<PhotoGenerationResult> {
    return {
      grid: {
        width: request.settings.shortSide,
        height: request.settings.shortSide,
        palette: { id: "mard-221", version: "2026.09-pinned" },
        cells: Array(request.settings.shortSide ** 2).fill(null),
      },
      summary: {
        beadCount: request.settings.shortSide ** 2,
        colorCount: 0,
        physicalWidthMm: request.settings.shortSide * 5,
        physicalHeightMm: request.settings.shortSide * 5,
        recommendedMode: "realistic" as const,
        elapsedMs: 0,
      },
    };
  }
}

class SvgProjectExporter implements ProjectExporter {
  async export(
    project: PindouProjectV1,
    options: ExportOptions,
  ): Promise<ExportArtifact> {
    return {
      fileName: `${project.name}.${options.format}`,
      mediaType: "image/svg+xml",
      data: `<svg data-direction="${options.direction}"></svg>`,
    };
  }
}

class SummaryOnlyGalleryRepository implements GalleryRepository {
  async listCategories(): Promise<GalleryResult<GalleryCategory[]>> {
    return { ok: true, data: [] };
  }

  async listPatterns(
    _query: GalleryListQuery,
  ): Promise<GalleryResult<GalleryPage<GalleryPatternSummary>>> {
    void _query;
    return { ok: true, data: { items: [] } };
  }

  async getPattern(_id: string): Promise<GalleryResult<GalleryPatternDetail | null>> {
    void _id;
    return { ok: true, data: null };
  }
}

class JsonGalleryPayloadSource implements GalleryPayloadSource {
  async download(
    _descriptor: GalleryPayloadDescriptor,
  ): Promise<GalleryResult<string>> {
    void _descriptor;
    return { ok: true, data: "{}" };
  }
}

describe("domain module contracts", () => {
  test("supports a project repository lifecycle", async () => {
    const repository: ProjectRepository = new MemoryProjectRepository();

    await repository.save(validPhotoProject);
    expect(await repository.get(validPhotoProject.id)).toEqual(validPhotoProject);
    expect(await repository.list()).toEqual([
      {
        id: "project-photo-1",
        name: "Portrait",
        sourceType: "photo",
        updatedAt: "2026-08-29T07:00:00.000Z",
        previewRef: undefined,
      },
    ]);

    await repository.delete(validPhotoProject.id);
    expect(await repository.get(validPhotoProject.id)).toBeNull();
  });

  test("allows page-local photo generation without platform image APIs", async () => {
    const engine: GenerationEngine = new DeterministicGenerationEngine();
    const result = await engine.generate({
      image: {
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([255, 255, 255, 255]),
        source: "album",
      },
      crop: {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        scale: 1,
        translateX: 0,
        translateY: 0,
        ratioMode: "auto",
      },
      settings: {
        shortSide: 29,
        colorLimit: 12,
        mode: "auto",
        removeBackground: true,
        dithering: false,
        cleanupIsolated: true,
      },
    });

    expect(result).toEqual({
      grid: {
        width: 29,
        height: 29,
        palette: { id: "mard-221", version: "2026.09-pinned" },
        cells: Array(29 * 29).fill(null),
      },
      summary: {
        beadCount: 29 * 29,
        colorCount: 0,
        physicalWidthMm: 145,
        physicalHeightMm: 145,
        recommendedMode: "realistic",
        elapsedMs: 0,
      },
    });
  });

  test("returns a platform-neutral export artifact", async () => {
    const exporter: ProjectExporter = new SvgProjectExporter();

    expect(await exporter.export(validPhotoProject, {
      format: "svg",
      direction: "reverse",
      annotations: {},
    })).toEqual({
      fileName: "Portrait.svg",
      mediaType: "image/svg+xml",
      data: '<svg data-direction="reverse"></svg>',
    });
  });

  test("lists paginated gallery summaries instead of cell records", async () => {
    const repository: GalleryRepository = new SummaryOnlyGalleryRepository();
    const source: GalleryPayloadSource = new JsonGalleryPayloadSource();
    const result = await repository.listPatterns({ order: "featured", limit: 24 });

    expect(result).toEqual({ ok: true, data: { items: [] } });
    expect(await source.download({
      fileRef: "gallery/flower.json",
      formatVersion: 1,
      byteSize: 2,
      sha256: "a".repeat(64),
    })).toEqual({ ok: true, data: "{}" });
  });
});
