import { describe, expect, test } from "vitest";

import { migrateProject } from "../../src/domain/project";
import { validPhotoProject } from "../fixtures/projects";

describe("migrateProject", () => {
  test("loads a valid current project without rewriting it", () => {
    expect(migrateProject(validPhotoProject)).toEqual({
      ok: true,
      value: validPhotoProject,
    });
  });

  test("rejects an unsupported version without mutating the input", () => {
    const futureProject = { ...validPhotoProject, version: 2 };
    const snapshot = JSON.stringify(futureProject);

    expect(migrateProject(futureProject)).toEqual({
      ok: false,
      error: { code: "UNSUPPORTED_VERSION", path: "version" },
    });
    expect(JSON.stringify(futureProject)).toBe(snapshot);
  });
});
