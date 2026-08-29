# Milestone 3 Project Domain Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the version 1 Pindou project model, runtime validation/migration boundary and platform-neutral module contracts.

**Architecture:** Focused TypeScript domain files define serializable project data and validation without framework imports. Thin port interfaces consume those domain types so later WeChat, H5, App and uniCloud adapters can be added without changing page-facing contracts.

**Tech Stack:** TypeScript 4.9, Vitest 1.6, uni-app Vue 3, Vite 5

**Spec:** `docs/superpowers/specs/2026-08-29-project-domain-contracts-design.md`

## Global Constraints

- Current project format version is exactly `1`.
- MVP bead size is exactly `5` millimetres.
- Original photo bytes and permanent original-photo paths are not project fields.
- Domain and contract modules must not import Vue, uni-app, WeChat, uniCloud, browser, canvas or filesystem APIs.
- Do not implement visible UI, generation algorithms, authentication, persistence adapters or exporters.
- `.superpowers/` remains local and is never staged.

---

### Task 1: Version 1 Project Model

**Files:**
- Create: `src/domain/project/types.ts`
- Create: `src/domain/project/index.ts`
- Test: `tests/domain/project-validation.test.ts`

**Interfaces:**
- Produces: `PindouProjectV1`, `ProjectSourceV1`, `PhotoGenerationSettings`, `DiyObjectV1`, `PROJECT_VERSION`, `MVP_BEAD_SIZE_MM`.
- Consumes: no application modules.

- [x] **Step 1: Write test fixtures for all three source types**

Create a literal `PindouProjectV1` base fixture in `tests/domain/project-validation.test.ts` and three projects whose `source.type` values are `photo`, `gallery` and `diy`. The photo fixture contains crop and generation settings but no original image data.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/domain/project-validation.test.ts`

Expected: FAIL because `src/domain/project` does not exist.

- [x] **Step 3: Implement the minimal serializable types**

Create `types.ts` with:

```ts
export const PROJECT_VERSION = 1 as const;
export const MVP_BEAD_SIZE_MM = 5 as const;

export type ProjectDirection = "normal" | "reverse";
export type ProjectCell = string | null;

export interface PaletteReference {
  id: string;
  version: string;
}

export interface PhotoGenerationSettings {
  cropMode: "crop-fill" | "fit";
  alignment: "center" | "top" | "bottom";
  backgroundColorId: string | null;
  preset: "photo" | "portrait" | "pixel-art" | "text-sign";
  colorCount: number;
  brightness: number;
  contrast: number;
  ditheringStrength: number;
}

export type ProjectSourceV1 =
  | { type: "photo"; settings: PhotoGenerationSettings }
  | { type: "gallery"; patternId: string; patternVersion: string }
  | { type: "diy"; objects: DiyObjectV1[] };
```

Add explicit catalog-element and text variants for `DiyObjectV1`, editable project text, annotations, timestamps, optional owner/preview references and `PindouProjectV1`. Export public types through `index.ts`.

- [x] **Step 4: Add compile-time privacy assertions**

Use `@ts-expect-error` in the test fixture to prove a photo source rejects `originalPhoto`, `originalPhotoPath` and `originalPhotoBytes` fields.

- [x] **Step 5: Run the focused test and verify GREEN**

Run: `npm test -- tests/domain/project-validation.test.ts`

Expected: PASS for fixture construction; the runtime-validation assertions added in Task 2 still do not exist yet.

---

### Task 2: Runtime Validation and Migration Boundary

**Files:**
- Create: `src/domain/project/validation.ts`
- Create: `src/domain/project/migration.ts`
- Modify: `src/domain/project/index.ts`
- Test: `tests/domain/project-validation.test.ts`
- Test: `tests/domain/project-migration.test.ts`

**Interfaces:**
- Consumes: `PindouProjectV1`, `PROJECT_VERSION`, `MVP_BEAD_SIZE_MM`.
- Produces: `validateProject(input: unknown): ProjectValidationResult` and `migrateProject(input: unknown): ProjectValidationResult`.

- [x] **Step 1: Add failing behavior tests**

Test real validation behavior with hand-written inputs:

```ts
expect(validateProject(validPhotoProject)).toEqual({
  ok: true,
  value: validPhotoProject,
});
expect(validateProject({ ...validPhotoProject, version: 2 })).toEqual({
  ok: false,
  error: { code: "UNSUPPORTED_VERSION", path: "version" },
});
```

Add separate cases for width `0`, fractional height, bead size other than `5`, incorrect cell count, unsupported direction, unsupported source, empty IDs/palette/timestamps and valid gallery/DIY projects.

- [x] **Step 2: Run validation tests and verify RED**

Run: `npm test -- tests/domain/project-validation.test.ts`

Expected: FAIL because `validateProject` is not exported.

- [x] **Step 3: Implement minimal validation**

Implement a discriminated result:

```ts
export type ProjectValidationResult =
  | { ok: true; value: PindouProjectV1 }
  | {
      ok: false;
      error: {
        code: "INVALID_DOCUMENT" | "UNSUPPORTED_VERSION" | "INVALID_FIELD" | "CELL_COUNT_MISMATCH";
        path: string;
      };
    };
```

Validate common fields, cell entries, text/source discriminants and source-required values. Return the first stable failure; do not mutate or normalize input.

- [x] **Step 4: Run validation tests and verify GREEN**

Run: `npm test -- tests/domain/project-validation.test.ts`

Expected: all validation cases PASS.

- [x] **Step 5: Add a failing migration-boundary test**

Test that version 1 delegates to validation and that version 2 returns `UNSUPPORTED_VERSION` without changing the input.

- [x] **Step 6: Run migration test and verify RED**

Run: `npm test -- tests/domain/project-migration.test.ts`

Expected: FAIL because `migrateProject` is not exported.

- [x] **Step 7: Implement the migration boundary**

Implement `migrateProject(input)` as the current-version entry point that calls `validateProject`. Do not add a migration registry or imaginary historical transformations.

- [x] **Step 8: Run both domain tests and verify GREEN**

Run: `npm test -- tests/domain/project-validation.test.ts tests/domain/project-migration.test.ts`

Expected: both files PASS.

---

### Task 3: Platform-Neutral Module Ports

**Files:**
- Create: `src/domain/contracts/generation.ts`
- Create: `src/domain/contracts/repositories.ts`
- Create: `src/domain/contracts/export.ts`
- Create: `src/domain/contracts/index.ts`
- Test: `tests/domain/contracts.test.ts`

**Interfaces:**
- Consumes: project types from `src/domain/project`.
- Produces: `GenerationEngine`, `ProjectRepository`, `GalleryRepository`, `DiyElementRepository`, `ProjectExporter` and their platform-neutral request/value types.

- [x] **Step 1: Write a compile-and-behavior contract test**

Define small in-memory implementations in the test. Exercise `ProjectRepository.save/get/list/delete`, a deterministic `GenerationEngine.generate` call and a `ProjectExporter.export` call. Assertions inspect returned real values rather than mock call counts.

- [x] **Step 2: Run the contract test and verify RED**

Run: `npm test -- tests/domain/contracts.test.ts`

Expected: FAIL because `src/domain/contracts` does not exist.

- [x] **Step 3: Implement the minimal ports**

Define:

```ts
export interface GenerationEngine {
  generate(request: GenerationRequest): Promise<GenerationResult>;
}

export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<PindouProjectV1 | null>;
  save(project: PindouProjectV1): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ProjectExporter {
  export(project: PindouProjectV1, options: ExportOptions): Promise<ExportArtifact>;
}
```

Use `Uint8ClampedArray` for decoded generation pixels and `Uint8Array | string` for artifact data. Gallery and DIY repositories expose category lists and versioned records only; they do not encode uniCloud behavior or authorization.

- [x] **Step 4: Run the contract test and verify GREEN**

Run: `npm test -- tests/domain/contracts.test.ts`

Expected: PASS.

- [x] **Step 5: Review dependency direction**

Inspect imports under `src/domain` and confirm they are relative domain imports only. Remove any framework or platform import if present.

---

### Task 4: Milestone Verification and Delivery

**Files:**
- Modify: `docs/superpowers/specs/2026-08-29-project-domain-contracts-design.md`
- Modify: `docs/superpowers/plans/2026-08-29-project-domain-contracts.md`

**Interfaces:**
- Consumes: all Milestone 3 production and test files.
- Produces: verified Git commit and tag.

- [x] **Step 1: Mark the written spec approved**

Change its status to `Approved for implementation`.

- [x] **Step 2: Run the complete quality gate**

Run: `npm run check`

Expected: all Vitest files, lint, TypeScript and WeChat production build PASS.

- [x] **Step 3: Run H5 production build**

Run: `npm run build:h5`

Expected: build exits `0`, proving the platform-neutral domain does not break the future web target.

- [x] **Step 4: Review the final diff**

Run `git diff --check`, inspect all Milestone 3 files and confirm `.superpowers/` is not staged.

- [x] **Step 5: Commit, tag and push**

Commit message: `feat: define milestone 3 project domain contracts`

Tag: `milestone-03-project-domain-contracts`

Push `main` and the tag, then verify both remote refs point at the new commit.
