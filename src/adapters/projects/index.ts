/* global uni */
import type { ProjectRepository, ProjectSummary } from "../../domain/contracts";
import { validateProject, type PindouProjectV1 } from "../../domain/project";

const STORAGE_KEY = "pindou-local-projects-v1";

interface UniStorageRuntime {
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
}

function readProjects(runtime: UniStorageRuntime): PindouProjectV1[] {
  const stored = runtime.getStorageSync(STORAGE_KEY);
  if (!Array.isArray(stored)) return [];
  return stored.flatMap((item) => {
    const result = validateProject(item);
    return result.ok ? [result.value] : [];
  });
}

function summary(project: PindouProjectV1): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    sourceType: project.source.type,
    updatedAt: project.updatedAt,
    ...(project.previewRef ? { previewRef: project.previewRef } : {}),
  };
}

export function createUniProjectRepository(runtime = uni as unknown as UniStorageRuntime): ProjectRepository {
  return {
    async list() { return readProjects(runtime).map(summary); },
    async get(id) { return readProjects(runtime).find((project) => project.id === id) ?? null; },
    async save(project) {
      const projects = readProjects(runtime).filter((item) => item.id !== project.id);
      runtime.setStorageSync(STORAGE_KEY, [...projects, project]);
    },
    async delete(id) {
      runtime.setStorageSync(STORAGE_KEY, readProjects(runtime).filter((project) => project.id !== id));
    },
  };
}
