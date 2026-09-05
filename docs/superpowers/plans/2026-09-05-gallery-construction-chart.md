# Milestone 7.1 High-Resolution Construction Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four incorrect bead-effect detail images with deterministic, zoomable, high-resolution MARD construction charts while removing the obsolete palette and rendering path.

**Architecture:** A committed, pinned MARD 221 registry becomes the only palette used by the four pilot payloads. The existing renderer file exposes separate card and construction-chart entry points that share validation but cannot accidentally select the old detail style. The catalog and cloud upload contract keep the same four IDs and twelve logical assets, while the existing detail page adds native image preview.

**Tech Stack:** Node.js 18-compatible ESM, TypeScript declarations, `pngjs`, Vitest, Vue 3, uni-app, WeChat Mini Program, uniCloud content tooling.

**Spec:** `docs/superpowers/specs/2026-09-05-gallery-construction-chart-design.md`

## Global Constraints

- Construction cells are exactly 64 × 64 pixels.
- Detail charts use four 64-pixel coordinate bands, natural MARD legend ordering, 1/3/5-pixel guides and the exact geometry formulas in the spec.
- The palette is `mard-221@2026.09-pinned`, derived from `maxcleme/beadcolors@29229889daab404fb30531d4bb785fd73f7f58e3/raw/mard.csv` and contains exactly 221 unique codes.
- Each pilot pattern uses at most eleven MARD codes; `null` is the only empty-cell value.
- Payloads, cards, charts, counts, hashes and cloud metadata are deterministic derivatives of the same grid definitions.
- Remove the obsolete `pindou-soft-original` palette and old detail renderer; do not retain compatibility flags or dead exports.
- Preserve the four content IDs, version `1.0.0`, twelve logical cloud keys and JSONL-in-`.json` import format.
- Do not stage or modify `src/manifest.json`, `.hbuilderx/`, `.superpowers/`, real uni-id configuration, cloud file mappings or service-space identifiers.
- Do not copy third-party renderer code, UI, artwork or assets.

---

### Task 1: Pinned MARD 221 palette and attribution

**Files:**
- Create: `content/gallery/palettes/mard-221-v2026.09.json`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `scripts/gallery/sync-mard-palette.mjs`
- Create: `scripts/gallery/sync-mard-palette.d.mts`
- Modify: `package.json`
- Modify: `scripts/gallery/grid-authoring.mjs`
- Modify: `scripts/gallery/grid-authoring.d.mts`
- Modify: `tests/gallery/grid-authoring.test.ts`
- Create: `tests/gallery/mard-palette.test.ts`

**Interfaces:**
- Produces: `loadPalette(filePath?: string): PaletteRegistry`, defaulting to the committed MARD 221 registry.
- Produces: `syncMardPalette(csvText: string): MardPalette`, a pure parser/deriver used by the explicit sync command and unit tests.
- Produces: `MardColorCode = string`; authoring helpers accept a registry-backed code rather than the deleted eleven-name union.

- [ ] **Step 1: Write failing palette-contract tests**

Add tests that load the committed registry and assert the exact identity, source commit, 221 unique codes, allowed series and stable SHA-256. The core assertion is:

```ts
expect(palette).toMatchObject({
  id: "mard-221",
  version: "2026.09-pinned",
  source: {
    repository: "https://github.com/maxcleme/beadcolors",
    commit: "29229889daab404fb30531d4bb785fd73f7f58e3",
    path: "raw/mard.csv",
    license: "MIT",
  },
});
expect(Object.keys(palette.colors)).toHaveLength(221);
expect(Object.keys(palette.colors).every((code) => /^[ABCDEFGHM]\d+$/.test(code))).toBe(true);
expect(new Set(Object.keys(palette.colors)).size).toBe(221);
```

Test `syncMardPalette` with a small CSV string containing allowed and extended prefixes, asserting that only allowed entries survive, RGB becomes uppercase `#RRGGBB`, duplicates fail, malformed RGB fails and a real 291-row source produces 221 entries.

- [ ] **Step 2: Run the focused tests and verify the old contract fails**

Run: `npm test -- tests/gallery/mard-palette.test.ts tests/gallery/grid-authoring.test.ts`

Expected: FAIL because the MARD registry and sync interface do not exist and `loadPalette()` still returns `pindou-soft-original`.

- [ ] **Step 3: Implement the pure palette sync and committed registry**

Implement this exact public shape:

```js
export function syncMardPalette(csvText) {
  const allowedSeries = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "M"]);
  // Parse code,name,r,g,b,contributor; validate every source row;
  // retain codes whose alphabetic prefix is allowed; natural-sort codes;
  // return the frozen registry shape asserted above.
}
```

The CLI reads a local CSV path supplied as its only argument and writes canonical LF JSON to `content/gallery/palettes/mard-221-v2026.09.json`; it never silently downloads mutable data. Add `"sync:mard-palette": "node scripts/gallery/sync-mard-palette.mjs"` to `package.json`. Generate the registry from the pinned raw file, record the exact resulting file checksum in the test, and include the upstream MIT copyright and source coordinates in `THIRD_PARTY_NOTICES.md`.

Change `grid-authoring.mjs` to default to the new file and build its valid-code set from the loaded registry. Change declarations from the obsolete literal union to:

```ts
export type MardColorCode = string;
export interface PaletteRegistry {
  readonly id: "mard-221";
  readonly version: "2026.09-pinned";
  readonly colors: Readonly<Record<MardColorCode, string>>;
}
```

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- tests/gallery/mard-palette.test.ts tests/gallery/grid-authoring.test.ts`

Expected: PASS with 221 colors and no assertion mentioning `pindou-soft-original`.

- [ ] **Step 5: Commit the palette unit**

```bash
git add package.json THIRD_PARTY_NOTICES.md content/gallery/palettes/mard-221-v2026.09.json scripts/gallery/sync-mard-palette.mjs scripts/gallery/sync-mard-palette.d.mts scripts/gallery/grid-authoring.mjs scripts/gallery/grid-authoring.d.mts tests/gallery/mard-palette.test.ts tests/gallery/grid-authoring.test.ts
git commit -m "feat(gallery): pin MARD 221 palette"
```

### Task 2: Migrate four authoritative grids and delete the old palette

**Files:**
- Modify: `content/gallery/designs/pilot-patterns.mjs`
- Delete: `content/gallery/palettes/pindou-soft-original-v1.json`
- Modify: `scripts/gallery/build-pilot-content.mjs`
- Modify: `tests/gallery/pilot-patterns.test.ts`
- Modify: `tests/fixtures/gallery/pilot-expected-metadata.json`

**Interfaces:**
- Consumes: `loadPalette()` and registry-backed `MardColorCode` from Task 1.
- Produces: `createPilotPatterns()` payloads whose palette is `{ id: "mard-221", version: "2026.09-pinned" }` and whose non-null cells are MARD codes.

- [ ] **Step 1: Write failing payload migration tests**

Replace the old eleven-name allow-list assertion with:

```ts
const palette = loadPalette();
expect(payload.palette).toEqual({ id: "mard-221", version: "2026.09-pinned" });
expect(payload.cells.filter(Boolean).every((code: string) => code in palette.colors)).toBe(true);
expect(new Set(payload.cells.filter(Boolean)).size).toBeLessThanOrEqual(11);
expect(payload.editableTextRegions.every(
  (region: { colorId: string }) => region.colorId in palette.colors,
)).toBe(true);
```

Add explicit assertions that birthday corner cells remain `null`, while each door-sign intentional background has non-null cells and contributes to the derived bead count.

- [ ] **Step 2: Run the payload tests and verify failure**

Run: `npm test -- tests/gallery/pilot-patterns.test.ts tests/gallery/grid-authoring.test.ts`

Expected: FAIL because payloads still contain semantic names and the old palette reference.

- [ ] **Step 3: Replace semantic names with one authoring-role map**

Define one frozen authoring-only role map in `pilot-patterns.mjs`, with every value verified against the MARD registry:

```js
const colors = Object.freeze({
  cream: "H13",
  blush: "E15",
  lavender: "D11",
  sage: "M1",
  butter: "A20",
  cocoa: "G17",
  white: "H2",
  coral: "F9",
  mint: "B10",
  gold: "G5",
  charcoal: "H6",
});
```

The mapping above is the approved soft-color translation and every listed code exists in the pinned 221 set. Payload output must contain the map values, never its keys. Update payload and editable-region palette references, then delete `pindou-soft-original-v1.json` and remove all remaining references to it.

- [ ] **Step 4: Run payload tests and scan for obsolete references**

Run: `npm test -- tests/gallery/pilot-patterns.test.ts tests/gallery/grid-authoring.test.ts`

Run: `rg -n "pindou-soft-original|PilotColorId" content scripts tests src`

Expected: tests PASS and `rg` returns no matches.

- [ ] **Step 5: Commit the payload migration**

```bash
git add content/gallery/designs/pilot-patterns.mjs content/gallery/palettes scripts/gallery/build-pilot-content.mjs tests/gallery/pilot-patterns.test.ts tests/fixtures/gallery/pilot-expected-metadata.json
git commit -m "feat(gallery): migrate pilot grids to MARD codes"
```

### Task 3: Replace the obsolete detail renderer with a construction-chart renderer

**Files:**
- Modify: `scripts/gallery/render-pattern-png.mjs`
- Modify: `scripts/gallery/render-pattern-png.d.mts`
- Create: `content/gallery/glyphs/chart-bitmap-v1.json`
- Modify: `scripts/gallery/build-pilot-content.mjs`
- Rewrite: `tests/gallery/pattern-renderer.test.ts`

**Interfaces:**
- Consumes: payload cells keyed by MARD code and `RenderPalette.colors: Record<string, string>`.
- Produces: `renderCardPng(payload, palette): Buffer`.
- Produces: `renderConstructionChartPng(payload, palette, options?): Buffer`, where `options.direction` is `"normal" | "reverse"` and defaults to `payload.direction`.
- Removes: `renderPatternPng`, `showCoordinates`, configurable detail cell size and the old one-sided coordinate path.

- [ ] **Step 1: Write failing geometry, content and direction tests**

Use a 3×2 fixture with a pale `A1`, dark `H7` and empty cells. Assert:

```ts
const image = decode(renderConstructionChartPng(fixture, palette));
expect(image).toMatchObject({ width: 320, height: 664 });
expect(cellTextSignature(image, 0, 0)).toBe(bitmapSignature("A1"));
expect(cellTextSignature(image, 1, 0)).toBe(bitmapSignature("H7"));
expect(cellTextSignature(image, 2, 0)).toBe(bitmapSignature(""));
expect(readLegend(image)).toEqual([
  { code: "A1", count: 1 },
  { code: "H7", count: 1 },
]);
```

Also assert all four coordinate bands, 1/3/5-pixel guide runs at cell 1, cell 10 and cell 29, contrast-aware black/white glyphs, natural legend order, and the exact 58×29 and 29×29 dimensions from the spec. Render `normal` and `reverse`, assert mirrored pixel-cell order, then assert the input payload bytes are unchanged.

- [ ] **Step 2: Run renderer tests and verify the old API fails the new contract**

Run: `npm test -- tests/gallery/pattern-renderer.test.ts`

Expected: FAIL because the two new entry points and four-sided chart do not exist.

- [ ] **Step 3: Implement the two explicit renderer entry points**

Keep shared payload/palette validation and low-level pixel helpers. Move round-bead drawing behind `renderCardPng` only. Implement construction geometry with these constants:

```js
const cellSize = 64;
const axisSize = 64;
const legendSideMargin = 64;
const legendTopGap = 64;
const legendBottomMargin = 64;
const legendItemWidth = 256;
const legendItemHeight = 128;
const legendColumnGap = 32;
const legendRowGap = 24;
```

Load the committed bitmap registry once. Draw white empty cells, solid occupied cells, centered codes, four edge axes, 1/3/5-pixel guides and a naturally sorted legend. Use a fixed relative-luminance threshold for black/white text. Reverse direction changes only `sourceX = width - 1 - displayX`; it must not mutate `payload.cells`.

- [ ] **Step 4: Remove the old detail branches and pass renderer tests**

Delete `showCoordinates`, `coordinateMargin`, old one-sided coordinate backing and any helper used only by that path. Update `build-pilot-content.mjs` to call `renderCardPng` and `renderConstructionChartPng` directly.

Run: `npm test -- tests/gallery/pattern-renderer.test.ts`

Expected: PASS, including byte determinism and direction tests.

Run: `rg -n "renderPatternPng|showCoordinates|coordinateMargin" scripts tests`

Expected: no matches.

- [ ] **Step 5: Commit the renderer replacement**

```bash
git add scripts/gallery/render-pattern-png.mjs scripts/gallery/render-pattern-png.d.mts scripts/gallery/build-pilot-content.mjs content/gallery/glyphs/chart-bitmap-v1.json tests/gallery/pattern-renderer.test.ts
git commit -m "feat(gallery): render high-resolution construction charts"
```

### Task 4: Regenerate assets, catalog metadata and validation

**Files:**
- Modify: `content/gallery/payloads/*-v1.json`
- Modify: `content/gallery/previews/card/*-v1.png`
- Modify: `content/gallery/previews/detail/*-v1.png`
- Modify: `content/gallery/catalog.json`
- Modify: `content/gallery/README.md`
- Modify: `scripts/gallery/gallery-contract.mjs`
- Modify: `tests/gallery/content-tooling.test.ts`
- Modify: `tests/fixtures/gallery/pilot-expected-metadata.json`

**Interfaces:**
- Consumes: Task 2 payload generator and Task 3 image renderers.
- Produces: the same twelve repository paths and logical upload keys with corrected bytes, hashes, dimensions and MARD metadata.

- [ ] **Step 1: Write failing published-content assertions**

Update content-tooling tests to expect `mard-221@2026.09-pinned`, 3840×2240 for each 58×29 detail and the formula-derived height for the actual used-color count of the 29×29 detail. Assert catalog `byteSize`, lowercase SHA-256, `colorCount` and `beadCount` equal the regenerated files and payload.

- [ ] **Step 2: Run content validation and verify stale assets fail**

Run: `npm test -- tests/gallery/content-tooling.test.ts tests/gallery/pilot-patterns.test.ts tests/gallery/pattern-renderer.test.ts`

Expected: FAIL on stale payload bytes, preview dimensions, hashes or palette metadata.

- [ ] **Step 3: Regenerate the twelve files and catalog metadata**

Run: `node scripts/gallery/build-pilot-content.mjs`

Update only the four existing catalog records. Keep IDs, version, ordering, provenance and logical paths unchanged. Recalculate payload byte sizes and hashes from exact LF bytes; recalculate bead/color totals from cells. Change the palette reference to MARD. Change `gallery-contract.mjs` from the deleted `width * 32 + 64` rule to one shared construction-chart geometry calculation matching the spec.

- [ ] **Step 4: Prove deterministic assets and cloud compatibility**

Run: `npm test -- tests/gallery/content-tooling.test.ts tests/gallery/pilot-patterns.test.ts tests/gallery/pattern-renderer.test.ts`

Run: `npm run validate:gallery`

Run: `node scripts/gallery/build-gallery-upload-manifest.mjs`

Expected: tests and validation PASS; upload manifest contains exactly twelve unchanged logical keys; a second content-generation run leaves `git diff` empty for generated assets.

- [ ] **Step 5: Visually inspect all four detail charts**

Open every regenerated detail PNG at original resolution. Verify readable codes on at least one pale, medium and dark color; blank outside cells; four complete axes; visible 10/29 guides; no clipped legend item; and that the four designs still match the approved messages and composition.

- [ ] **Step 6: Commit generated content and validator updates**

```bash
git add content/gallery scripts/gallery/gallery-contract.mjs tests/gallery/content-tooling.test.ts tests/fixtures/gallery/pilot-expected-metadata.json
git commit -m "content(gallery): publish corrected construction charts"
```

### Task 5: Native WeChat zoom without identity authorization

**Files:**
- Modify: `src/pages/gallery/detail.vue`
- Modify: `tests/smoke/gallery-ui-contract.test.ts`

**Interfaces:**
- Consumes: `detailState.detail.previewRef` already supplied by the gallery runtime.
- Produces: `previewConstructionChart(): void`, which calls `uni.previewImage` with the current detail image and shows a non-blocking message only on failure.

- [ ] **Step 1: Write the failing UI contract test**

Add assertions:

```ts
expect(detail).toContain("previewConstructionChart");
expect(detail).toContain("uni.previewImage");
expect(detail).toContain("current: detailState.value.detail.previewRef");
expect(detail).toContain("urls: [detailState.value.detail.previewRef]");
expect(detail).toContain('@tap="previewConstructionChart"');
expect(detail).not.toMatch(/identity|login|authorize/i);
```

- [ ] **Step 2: Run the UI test and verify failure**

Run: `npm test -- tests/smoke/gallery-ui-contract.test.ts`

Expected: FAIL because the image has no native-preview handler.

- [ ] **Step 3: Add the minimal preview handler and affordance**

Implement:

```ts
function previewConstructionChart(): void {
  if (detailState.value.status !== "ready" || previewFailed.value) return;
  const url = detailState.value.detail.previewRef;
  uni.previewImage({
    current: url,
    urls: [url],
    fail: () => uni.showToast({ title: "暂时无法放大图纸", icon: "none" }),
  });
}
```

Attach it to the existing image, add “点击放大查看色号” near the preview, and add no identity, storage or cloud dependency.

- [ ] **Step 4: Run UI, type and lint checks**

Run: `npm test -- tests/smoke/gallery-ui-contract.test.ts`

Run: `npm run type-check`

Run: `npm run lint`

Expected: all PASS.

- [ ] **Step 5: Commit the zoom behavior**

```bash
git add src/pages/gallery/detail.vue tests/smoke/gallery-ui-contract.test.ts
git commit -m "feat(gallery): add native chart zoom"
```

### Task 6: Remove leftovers, run the full gate and publish Milestone 7.1

**Files:**
- Modify only if verification exposes a direct Milestone 7.1 defect.
- Do not stage: `src/manifest.json`, `.hbuilderx/`, `.superpowers/` or account-bound files.

**Interfaces:**
- Consumes: all prior task deliverables.
- Produces: verified commit and tag `milestone-07.1-construction-charts` pushed to `origin/main`.

- [ ] **Step 1: Prove obsolete code and files are gone**

Run: `rg -n "pindou-soft-original|PilotColorId|renderPatternPng|showCoordinates|coordinateMargin" content scripts tests src`

Expected: no matches.

Run: `git status --short`

Expected: only intended Milestone 7.1 changes plus the user's pre-existing local `src/manifest.json`, `.hbuilderx/` and `.superpowers/` entries.

- [ ] **Step 2: Run the complete automated gate**

Run: `npm run check`

Run: `npm run build:h5`

Expected: all tests, lint, type checking, gallery validation, cloud validation, WeChat build and H5 build PASS.

- [ ] **Step 3: Request independent code review and fix only confirmed defects**

Review against the specification, with special attention to payload/legend consistency, exact PNG geometry, reverse non-mutation, license attribution, removed legacy paths, native preview and protected local files. Re-run the smallest failing test after each fix, then repeat Step 2.

- [ ] **Step 4: Record verification and commit any direct fixes**

Update the milestone verification record with exact command results and the manual WeChat checklist. If this creates tracked changes:

```bash
git add docs content scripts src tests package.json THIRD_PARTY_NOTICES.md
git commit -m "docs: record milestone 7.1 verification"
```

Before committing, inspect `git diff --cached --name-only` and unstage any protected local file.

- [ ] **Step 5: Tag and push the completed milestone**

```bash
git tag -a milestone-07.1-construction-charts -m "Milestone 7.1: high-resolution construction charts"
git push origin main
git push origin milestone-07.1-construction-charts
```

Verify local `HEAD`, `origin/main` and the tag resolve to the same commit.

- [ ] **Step 6: Real WeChat acceptance before cloud upload**

Ask the user to run the updated `mp-weixin` build in HBuilderX, open each of the four gallery details, tap the chart and inspect codes at maximum zoom. Acceptance requires smooth zoom/pan, readable MARD codes, correct blank cells/coordinates/legend and no red console errors. Only after the user confirms 64 pixels per cell is sufficiently clear should the twelve corrected files be uploaded to uniCloud and the rebuilt JSONL `.json` records imported.
