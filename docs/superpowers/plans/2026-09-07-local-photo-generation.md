# Milestone 8 Local Photo Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a WeChat mini-program user take or select one photo, crop it, and generate a deterministic local MARD 221 bead-grid preview without login, upload, or persistence.

**Architecture:** A platform adapter acquires and normalizes pixels, a framework-independent TypeScript engine converts a crop into a `BeadGrid`, and an application controller owns the page-local session and latest-job rule. Vue components render crop controls and three previews without depending on cloud or identity services.

**Tech Stack:** uni-app 5.24, Vue 3, TypeScript 4.9, WeChat Canvas/Image APIs, Vitest 1.6, pinned MARD 221 JSON.

**Spec:** `docs/superpowers/specs/2026-09-07-local-photo-generation-design.md`

## Global Constraints

- One camera or album image per session; no multi-select or chat-file input.
- Source image, normalized copy, crop, and grid remain page-local and are released on unload.
- No uniCloud call, identity request, local draft, or background upload is permitted.
- The normalized processing copy has a maximum longest side of 2048 pixels; one smaller retry is allowed after memory failure.
- Short-side presets are exactly 29, 58, and 87; default 58 and preserve crop aspect ratio.
- Color limits are exactly 12, 24, and 36; default 24.
- Modes are `auto`, `cartoon`, and `realistic`; auto recommends one of the latter two and remains user-overridable.
- MARD palette identity is `mard-221@2026.09-pinned`; all occupied cells contain a valid pinned code.
- Dithering is off by default; edge-connected background removal and one-cell cleanup are on by default.
- Identical normalized pixels, crop, settings, and palette version must produce identical output.
- Do not add Worker, WASM, AI segmentation, persistence, editing, export, or 3D preview in this milestone.

---

### Task 1: Photo-generation contracts and deterministic fixtures

**Files:**
- Create: `src/domain/photo-generation/types.ts`
- Create: `src/domain/photo-generation/grid-size.ts`
- Create: `src/domain/photo-generation/index.ts`
- Modify: `src/domain/contracts/generation.ts`
- Modify: `src/domain/contracts/index.ts`
- Create: `tests/photo-generation/grid-size.test.ts`
- Create: `tests/fixtures/photo-generation/fixtures.ts`

**Interfaces:**
- Consumes: `PaletteReference`, `ProjectCell`, and `MVP_BEAD_SIZE_MM` from `src/domain/project/types.ts`.
- Produces: `PhotoInput`, `CropTransform`, `GenerationSettings`, `BeadGrid`, `GenerationSummary`, `PhotoGenerationResult`, `GenerationEngine.generate(request)`, and `calculateGridSize(cropWidth, cropHeight, shortSide)`.

- [ ] **Step 1: Write failing contract and size tests**

```ts
expect(calculateGridSize(1600, 900, 58)).toEqual({ width: 103, height: 58 });
expect(calculateGridSize(900, 1600, 29)).toEqual({ width: 29, height: 52 });
expect(() => calculateGridSize(0, 900, 58)).toThrow("INVALID_CROP_SIZE");
expect(() => calculateGridSize(900, 900, 30 as 29)).toThrow("INVALID_SHORT_SIDE");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/photo-generation/grid-size.test.ts`

Expected: FAIL because `src/domain/photo-generation/grid-size.ts` does not exist.

- [ ] **Step 3: Define exact session contracts and minimal size calculation**

```ts
export type ShortSidePreset = 29 | 58 | 87;
export type ColorLimit = 12 | 24 | 36;
export type GenerationMode = "auto" | "cartoon" | "realistic";
export interface PhotoInput { width: number; height: number; data: Uint8ClampedArray; source: "camera" | "album"; }
export interface CropTransform { x: number; y: number; width: number; height: number; scale: number; translateX: number; translateY: number; ratioMode: "auto" | "square" | "original"; }
export interface GenerationSettings { shortSide: ShortSidePreset; colorLimit: ColorLimit; mode: GenerationMode; removeBackground: boolean; dithering: boolean; cleanupIsolated: boolean; }
export interface BeadGrid { width: number; height: number; palette: { id: "mard-221"; version: "2026.09-pinned" }; cells: Array<string | null>; }
export interface GenerationSummary { beadCount: number; colorCount: number; physicalWidthMm: number; physicalHeightMm: number; recommendedMode: Exclude<GenerationMode, "auto">; elapsedMs: number; }
```

Round the long side with `Math.max(1, Math.round(shortSide * long / short))`; reject non-finite or non-positive crop dimensions and values outside the preset union.

- [ ] **Step 4: Add deterministic RGBA fixture builders**

Create helpers returning literal typed arrays for a 4×4 gradient, four-color cartoon, transparent border, solid edge background, and 3×2 orientation marker. Do not store binary fixtures or use randomness.

- [ ] **Step 5: Run focused and existing domain tests**

Run: `npm test -- tests/photo-generation/grid-size.test.ts tests/domain/contracts.test.ts tests/domain/project-validation.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```text
feat(photo): define local generation contracts
```

### Task 2: Platform-neutral normalization and WeChat media adapter

**Files:**
- Create: `src/domain/photo-generation/normalize.ts`
- Create: `src/adapters/photo-generation/platform.ts`
- Create: `src/adapters/photo-generation/wechat-media.ts`
- Create: `src/adapters/photo-generation/index.ts`
- Create: `tests/photo-generation/normalize.test.ts`
- Create: `tests/photo-generation/wechat-media.test.ts`
- Modify: `src/shime-uni.d.ts`

**Interfaces:**
- Consumes: `PhotoInput` from Task 1.
- Produces: `normalizeDimensions(width, height, maxSide)`, `applyOrientation(pixels, orientation)`, `MediaSelection`, `PhotoMediaAdapter.choose(source)`, `PhotoMediaAdapter.decode(selection)`, and `PhotoMediaAdapter.release()`.

- [ ] **Step 1: Write RED tests for orientation and 2048 limits**

```ts
expect(normalizeDimensions(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
expect(normalizeDimensions(900, 1200, 2048)).toEqual({ width: 900, height: 1200 });
expect(Array.from(applyOrientation(marker, 6).data)).toEqual(expectedClockwiseRotation);
```

Also test orientations 1, 3, 6, and 8 and verify width/height swaps for quarter turns.

- [ ] **Step 2: Run normalization tests and verify RED**

Run: `npm test -- tests/photo-generation/normalize.test.ts`

Expected: FAIL because normalization functions do not exist.

- [ ] **Step 3: Implement deterministic dimension and pixel orientation functions**

Use integer destination coordinates and copy four RGBA bytes per pixel. Do not use browser globals in this file.

- [ ] **Step 4: Write RED adapter tests with injected platform methods**

```ts
const result = await adapter.choose("camera");
expect(chooseMedia).toHaveBeenCalledWith(expect.objectContaining({ count: 1, sourceType: ["camera"], mediaType: ["image"] }));
expect(result).toEqual({ status: "cancelled" });
await adapter.release();
expect(releaseResource).toHaveBeenCalledTimes(1);
```

Cover album, cancellation, camera denial, decode failure, a memory error followed by a 1024-pixel retry, and a second failure.

- [ ] **Step 5: Implement the injected WeChat adapter**

Wrap `uni.chooseMedia` and canvas/image decoding behind a factory whose platform functions are injectable in tests. Return public result codes `CANCELLED`, `PERMISSION_DENIED`, `UNSUPPORTED_IMAGE`, and `OUT_OF_MEMORY`; never include a local path in a public error.

- [ ] **Step 6: Run focused adapter tests and type-check**

Run: `npm test -- tests/photo-generation/normalize.test.ts tests/photo-generation/wechat-media.test.ts`

Run: `npm run type-check`

Expected: PASS.

- [ ] **Step 7: Commit**

```text
feat(photo): add local media normalization adapter
```

### Task 3: Crop model and region sampler

**Files:**
- Create: `src/domain/photo-generation/crop.ts`
- Create: `src/domain/photo-generation/sample.ts`
- Modify: `src/domain/photo-generation/index.ts`
- Create: `tests/photo-generation/crop.test.ts`
- Create: `tests/photo-generation/sample.test.ts`

**Interfaces:**
- Consumes: `PhotoInput`, `CropTransform`, and grid dimensions from Tasks 1–2.
- Produces: `suggestCrop(image, ratioMode)`, `constrainCrop(crop, image)`, `sampleRegions(image, crop, width, height, strategy)`, and `SampledCell { red, green, blue, alpha, variance, edgeStrength }`.

- [ ] **Step 1: Write failing crop tests**

```ts
expect(suggestCrop({ width: 1600, height: 900 }, "square")).toMatchObject({ x: 350, y: 0, width: 900, height: 900 });
expect(constrainCrop({ x: -20, y: 10, width: 500, height: 500 }, image)).toMatchObject({ x: 0, y: 10 });
```

Test automatic/original ratio, pan clamping, zoom limits, and restoring the suggested crop.

- [ ] **Step 2: Run crop tests and verify RED**

Run: `npm test -- tests/photo-generation/crop.test.ts`

Expected: FAIL because crop functions do not exist.

- [ ] **Step 3: Implement crop math without Vue or platform APIs**

Keep source coordinates in pixel space and normalize UI gestures only at the controller boundary. Clamp every crop to image bounds and reject a crop smaller than one source pixel.

- [ ] **Step 4: Write failing full-area sampling tests**

Use a 4×4 fixture reduced to 2×2. Assert each output represents all four source pixels rather than the top-left or center pixel. Assert `cartoon` selects the deterministic dominant bucket while `realistic` returns the luminance-aware regional mean.

- [ ] **Step 5: Implement sampling and run focused tests**

Run: `npm test -- tests/photo-generation/crop.test.ts tests/photo-generation/sample.test.ts`

Expected: PASS with exact integer RGBA results.

- [ ] **Step 6: Commit**

```text
feat(photo): add crop and area sampling
```

### Task 4: Mode recommendation, MARD Lab cache, and palette selection

**Files:**
- Create: `src/domain/photo-generation/color-space.ts`
- Create: `src/domain/photo-generation/mard-palette.ts`
- Create: `src/domain/photo-generation/mode.ts`
- Create: `src/domain/photo-generation/palette-selection.ts`
- Modify: `src/domain/photo-generation/index.ts`
- Create: `tests/photo-generation/color-space.test.ts`
- Create: `tests/photo-generation/mode.test.ts`
- Create: `tests/photo-generation/palette-selection.test.ts`

**Interfaces:**
- Consumes: sampled cells from Task 3 and `content/gallery/palettes/mard-221-v2026.09.json` as the sole palette source.
- Produces: `rgbToLab`, `ciede2000`, `getMardLabPalette`, `recommendMode`, `selectPalette(samples, limit)`, and `nearestMardColor(sample, selectedPalette)`.

- [ ] **Step 1: Write RED reference-vector tests for color conversion**

Use published CIEDE2000 validation pairs embedded in the test and assert tolerance `1e-4`. Verify repeated `getMardLabPalette()` calls return the same frozen object and exactly 221 unique codes.

- [ ] **Step 2: Run color tests and verify RED**

Run: `npm test -- tests/photo-generation/color-space.test.ts`

Expected: FAIL because the color module does not exist.

- [ ] **Step 3: Implement sRGB linearization, XYZ/Lab conversion, and CIEDE2000**

Use D65 reference white and no platform APIs. Convert the committed MARD RGB registry once at module initialization or first access and freeze the resulting array.

- [ ] **Step 4: Write RED tests for mode and constrained palette**

Assert a flat four-color fixture recommends `cartoon`, a smooth gradient recommends `realistic`, selected palettes contain exactly `min(limit, distinctUsefulColors)` valid MARD entries, and repeated selection preserves ordering and output.

- [ ] **Step 5: Implement deterministic recommendation and palette coverage**

Base the recommendation only on documented thresholds for regional variance, edge density, and gradient continuity. Select MARD representatives with deterministic weighted farthest-first coverage; break equal distances by natural MARD code order. Do not introduce random k-means initialization.

- [ ] **Step 6: Run all Task 4 tests and palette regression tests**

Run: `npm test -- tests/photo-generation/color-space.test.ts tests/photo-generation/mode.test.ts tests/photo-generation/palette-selection.test.ts tests/gallery/mard-palette.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```text
feat(photo): add perceptual MARD color matching
```

### Task 5: Background removal, dithering, and protected cleanup

**Files:**
- Create: `src/domain/photo-generation/background.ts`
- Create: `src/domain/photo-generation/dither.ts`
- Create: `src/domain/photo-generation/cleanup.ts`
- Modify: `src/domain/photo-generation/index.ts`
- Create: `tests/photo-generation/background.test.ts`
- Create: `tests/photo-generation/dither.test.ts`
- Create: `tests/photo-generation/cleanup.test.ts`

**Interfaces:**
- Consumes: sampled cells, selected MARD palette, and preliminary cell codes from Task 4.
- Produces: `removeEdgeConnectedBackground`, `ditherAndMap`, and `cleanupIsolatedCells`.

- [ ] **Step 1: Write RED edge-connected background tests**

Use a 5×5 fixture with a near-white border, a disconnected near-white center, and a colored subject. Assert only border-connected cells become `null`; a high-variance photo edge must remain occupied.

- [ ] **Step 2: Implement iterative edge flood fill and verify GREEN**

Run: `npm test -- tests/photo-generation/background.test.ts`

Expected: PASS without recursion or stack growth.

- [ ] **Step 3: Write RED deterministic dithering tests**

Assert disabled dithering delegates directly to nearest-color mapping. For enabled dithering, assert a fixed left-to-right/top-to-bottom Floyd–Steinberg pass produces the exact expected code array and never outputs outside the selected palette.

- [ ] **Step 4: Implement dithering and verify GREEN**

Run: `npm test -- tests/photo-generation/dither.test.ts`

Expected: PASS.

- [ ] **Step 5: Write RED cleanup tests**

Assert a low-contrast one-cell island is replaced by the perceptually nearest neighbor, while a high-contrast eye, line endpoint, transparent cell, and component of size two are unchanged.

- [ ] **Step 6: Implement one-cell cleanup and run Task 5 tests**

Run: `npm test -- tests/photo-generation/background.test.ts tests/photo-generation/dither.test.ts tests/photo-generation/cleanup.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```text
feat(photo): add local background and cleanup controls
```

### Task 6: Generation engine orchestration and summaries

**Files:**
- Create: `src/domain/photo-generation/engine.ts`
- Modify: `src/domain/contracts/generation.ts`
- Modify: `src/domain/photo-generation/index.ts`
- Create: `tests/photo-generation/engine.test.ts`

**Interfaces:**
- Consumes: crop, sizing, sampling, recommendation, palette selection, background, dithering, and cleanup functions from Tasks 1–5.
- Produces: `createPhotoGenerationEngine({ now })` implementing `GenerationEngine.generate(request): Promise<PhotoGenerationResult>`.

- [ ] **Step 1: Write failing end-to-end engine tests**

```ts
const first = await engine.generate(request);
const second = await engine.generate(request);
expect(second.grid).toEqual(first.grid);
expect(first.grid.palette).toEqual({ id: "mard-221", version: "2026.09-pinned" });
expect(new Set(first.grid.cells.filter(Boolean)).size).toBeLessThanOrEqual(24);
expect(first.summary).toMatchObject({ physicalWidthMm: first.grid.width * 5, physicalHeightMm: first.grid.height * 5 });
```

Also exercise all three size presets, all color limits, auto override, every switch, transparent output, exact bead counts, and non-mutation of input pixels.

- [ ] **Step 2: Run engine tests and verify RED**

Run: `npm test -- tests/photo-generation/engine.test.ts`

Expected: FAIL because the engine does not exist.

- [ ] **Step 3: Implement the direct pipeline**

Resolve auto mode once, calculate grid dimensions, sample, optionally remove background, select palette, map or dither, optionally clean, then derive the summary from final cells. Inject `now()` only for elapsed-time reporting; never use it for algorithm decisions.

- [ ] **Step 4: Run photo-generation domain suite and type-check**

Run: `npm test -- tests/photo-generation`

Run: `npm run type-check`

Expected: PASS with no cloud mocks because the engine has no cloud dependency.

- [ ] **Step 5: Commit**

```text
feat(photo): compose deterministic generation engine
```

### Task 7: Page-local controller and lifecycle

**Files:**
- Create: `src/application/photo-generation/controller.ts`
- Create: `src/application/photo-generation/runtime.ts`
- Create: `src/application/photo-generation/index.ts`
- Create: `tests/photo-generation/controller.test.ts`

**Interfaces:**
- Consumes: `PhotoMediaAdapter`, crop helpers, and `GenerationEngine` from Tasks 2–6.
- Produces: `PhotoGenerationState`, `createPhotoGenerationController(dependencies, state)`, and actions `choosePhoto`, `updateCrop`, `updateSettings`, `regenerate`, `setPreviewMode`, `replacePhoto`, and `dispose`.

- [ ] **Step 1: Write RED state-transition tests**

Assert picker cancellation retains `idle`, selection produces `cropping`, crop confirmation automatically generates once, setting changes retain the old result and set `hasPendingSettings`, and `regenerate` clears the pending marker after success.

- [ ] **Step 2: Add latest-job and cleanup tests**

Use two deferred engine promises. Resolve the second before the first and assert only the second updates state. Assert `dispose()` calls media release, clears pixel arrays and result references, increments job identity, and makes late completions inert.

- [ ] **Step 3: Run controller tests and verify RED**

Run: `npm test -- tests/photo-generation/controller.test.ts`

Expected: FAIL because controller modules do not exist.

- [ ] **Step 4: Implement the minimal controller and runtime factory**

Use discriminated state variants (`idle`, `cropping`, `generating`, `ready`, `failure`) so UI code does not combine impossible nullable fields. Store no runtime singleton outside the page instance.

- [ ] **Step 5: Run controller, identity, and gallery controller tests**

Run: `npm test -- tests/photo-generation/controller.test.ts tests/identity/identity-controller.test.ts tests/gallery/gallery-controller.test.ts`

Expected: PASS and prove the new controller does not alter existing runtimes.

- [ ] **Step 6: Commit**

```text
feat(photo): add page-local generation controller
```

### Task 8: Crop controls, previews, and generator page

**Files:**
- Create: `src/components/photo-generation/PhotoSourcePicker.vue`
- Create: `src/components/photo-generation/PhotoCropper.vue`
- Create: `src/components/photo-generation/GenerationSettings.vue`
- Create: `src/components/photo-generation/BeadPreview.vue`
- Create: `src/pages/photo-generator/index.vue`
- Modify: `src/pages/index/index.vue`
- Modify: `src/pages.json`
- Create: `tests/smoke/photo-generator-ui-contract.test.ts`

**Interfaces:**
- Consumes: the Task 7 page-local runtime and Task 1 settings/result types.
- Produces: route `/pages/photo-generator/index` and the complete camera/album → crop → preview flow.

- [ ] **Step 1: Write failing UI contract tests**

Assert `pages.json` registers the route; the home photo entry navigates to it; the page contains `拍一张`, `从相册选择`, and `照片仅在本机处理，不会自动上传`; and source contains no imports from identity or uniCloud modules.

- [ ] **Step 2: Add interaction contract tests**

Assert the page wires unload to `dispose`, exposes `原图`, `拼豆效果`, `方格预览`, keeps `重新生成` conditional on pending settings, and does not present cloud save, export, 3D, or manual editing actions.

- [ ] **Step 3: Run UI tests and verify RED**

Run: `npm test -- tests/smoke/photo-generator-ui-contract.test.ts`

Expected: FAIL because the page and route do not exist.

- [ ] **Step 4: Implement source picker and crop UI**

Use the existing warm-ivory, blush, lavender, mint, rounded-card system. Route gestures through crop-controller actions; do not let the component mutate source pixels. Display permission and decode failures with the specified public copy and keep album selection available.

- [ ] **Step 5: Implement settings and three crisp previews**

Render beads and grid from the same `BeadGrid`. Scale canvas backing pixels by device pixel ratio, disable smoothing for square-grid rendering, and use round fills for bead preview. The original preview uses only the page-local normalized image. Tapping a preview opens the page's enlarged local inspection view rather than uploading a file.

- [ ] **Step 6: Wire navigation, lifecycle, summaries, and failure retry**

Create the runtime inside the page setup, call `dispose()` from `onUnload`, preserve crop on generation failure, disable duplicate generate taps, and label pending settings without hiding the previous result.

- [ ] **Step 7: Run UI, controller, app-shell, and gallery smoke tests**

Run: `npm test -- tests/smoke/photo-generator-ui-contract.test.ts tests/photo-generation/controller.test.ts tests/smoke/app-shell.test.ts tests/smoke/gallery-ui-contract.test.ts`

Run: `npm run type-check`

Expected: PASS.

- [ ] **Step 8: Commit**

```text
feat(photo): build local photo generator flow
```

### Task 9: Full verification, manual acceptance, and publication

**Files:**
- Create: `docs/verification/milestone-08-local-photo-generation.md`
- Modify only if evidence exposes a defect: files owned by Tasks 1–8 and their tests.

**Interfaces:**
- Consumes: the complete Milestone 8 implementation.
- Produces: reproducible automated evidence, device measurements, final review result, milestone commit/tag, and GitHub synchronization.

- [ ] **Step 1: Run the full automated gate**

Run: `npm run check`

Run: `npm run build:h5`

Expected: all Vitest files pass with zero failures; ESLint, Vue type-check, gallery validation, cloud validation, WeChat build, and H5 build exit 0.

- [ ] **Step 2: Run privacy and obsolete-boundary scans**

Run searches proving the photo runtime has no `uniCloud`, identity, storage, database, upload, or project repository dependency. Confirm `git diff --name-only` excludes `src/manifest.json`, `.hbuilderx`, real uni-id config, and `content/gallery/cloud-file-map.json`.

- [ ] **Step 3: Perform WeChat manual acceptance**

On one representative phone or developer-tool device, exercise camera, album, cancellation, crop pan/zoom, 29/58/87, 12/24/36, auto/cartoon/realistic, each advanced switch, retry, replace, preview switching, enlargement, and page exit. Record generation milliseconds for default 58 and 87; record whether the targets of ≤3000 ms and ≤6000 ms were met.

- [ ] **Step 4: Record evidence without local paths or photos**

Document test counts, build results, device class, timings, and pass/fail observations in `docs/verification/milestone-08-local-photo-generation.md`. Do not embed the user's selected photo, local path, account identifier, or secret.

- [ ] **Step 5: Request an independent code review**

Review the complete feature range against the design and plan, with special attention to deterministic CIEDE2000 results, isolated-detail preservation, memory release, latest-job wins, privacy boundaries, and H5/WeChat separation. Resolve every Critical or Important issue with a regression test before continuing.

- [ ] **Step 6: Re-run the full gate after review fixes**

Run: `npm run check`

Run: `npm run build:h5`

Expected: both exit 0 on the exact commit to be published.

- [ ] **Step 7: Commit verification and publish only after user acceptance**

```text
docs: verify milestone 8 local photo generation
```

Merge the reviewed feature branch to `main`, create an annotated milestone tag, push `main` and the tag to `https://github.com/irisaaachu/pindou.git`, and verify remote refs point to the local release commit. Never commit account-bound local files.
