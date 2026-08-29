import { describe, expect, test } from "vitest";

import type {
  ExportArtifact,
  ExportOptions,
  GenerationEngine,
  GenerationRequest,
  GenerationResult,
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
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    return {
      width: request.targetWidth,
      height: request.targetHeight,
      cells: Array(request.targetWidth * request.targetHeight).fill(null),
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

  test("allows generation without platform image APIs", async () => {
    const engine: GenerationEngine = new DeterministicGenerationEngine();
    const result = await engine.generate({
      image: {
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([255, 255, 255, 255]),
      },
      targetWidth: 2,
      targetHeight: 1,
      palette: { id: "mard", version: "2026-01" },
      settings: validPhotoProject.source.type === "photo"
        ? validPhotoProject.source.settings
        : neverSettings(),
    });

    expect(result).toEqual({ width: 2, height: 1, cells: [null, null] });
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
});

function neverSettings(): never {
  throw new Error("Expected a photo fixture");
}
