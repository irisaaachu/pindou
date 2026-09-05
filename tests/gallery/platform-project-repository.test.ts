import { describe, expect, test, vi } from "vitest";

import { createUniProjectRepository } from "../../src/adapters/projects";
import { validPhotoProject } from "../fixtures/projects";

describe("platform project repository", () => {
  test("restores a saved project after repository recreation without identity access", async () => {
    const storage = new Map<string, unknown>();
    const runtime = {
      getStorageSync: vi.fn((key: string) => storage.get(key)),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
    };

    await createUniProjectRepository(runtime).save(validPhotoProject);
    const restored = await createUniProjectRepository(runtime).get(validPhotoProject.id);

    expect(restored).toEqual(validPhotoProject);
    expect(runtime.getStorageSync).toHaveBeenCalledTimes(2);
    expect([...storage.keys()]).toEqual(["pindou-local-projects-v1"]);
  });
});
