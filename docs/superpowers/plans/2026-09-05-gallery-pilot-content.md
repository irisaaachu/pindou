# Milestone 7 Gallery Pilot Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce, package and verify four original gallery patterns that exercise the complete production content pipeline in WeChat before the remaining twenty patterns are added.

**Architecture:** Deterministic grid definitions generate lossless payload JSON plus card and 32-pixel-per-cell detail PNGs. Existing gallery contracts validate and serve metadata while a deployment packager resolves locally ignored uniCloud file-ID mappings and emits `.json` files containing JSONL records for manual import.

**Tech Stack:** uni-app Vue 3, TypeScript, Node.js ESM tooling, `pngjs`, Vitest, uniCloud Alibaba cloud storage/database, HBuilderX, WeChat Developer Tools.

**Spec:** `docs/superpowers/specs/2026-09-05-gallery-pilot-content-design.md`

## Global Constraints

- Publish exactly four version `1.0.0` original records; do not create placeholder records for the remaining twenty.
- Raster previews are generated from lossless grid payloads and are never editable sources.
- Detail previews use exactly 32 pixels per cell; card previews use exactly 8 pixels per cell.
- Cloud file IDs and the local mapping file remain ignored and untracked.
- Database import artifacts have a `.json` extension and JSONL contents, one object per line.
- Gallery browsing remains guest-accessible and must not import or invoke identity code.
- Do not read, print, overwrite or stage the real `uni-id/config.json`, `src/manifest.json`, `.hbuilderx/` or `.superpowers/`.
- All behavior changes follow red-green-refactor TDD and each task receives independent review.
- This pilot is followed immediately by the MVP photo-generation engine sequence; CIEDE2000-class matching, optional dithering, background removal, connected-region cleanup, verified MARD/Perler/Hama palettes and high-resolution printable exports are mandatory MVP work, not post-MVP ideas.

---

### Task 1: Correct the uniCloud import artifact contract

**Files:**
- Modify: `scripts/gallery/build-gallery-import.mjs`
- Modify: `scripts/gallery/build-gallery-import.d.mts`
- Modify: `tests/gallery/content-tooling.test.ts`
- Modify: `docs/unicloud-aliyun-setup.md`

**Interfaces:**
- Consumes: validated catalog records and the existing stable `_id` mapping.
- Produces: `writeJsonLines(records): string` and `categories-import.json` / `patterns-import.json` artifacts.

- [ ] **Step 1: Add failing import-format tests**

Assert that each non-empty line parses as one object, the file itself does not parse as a JSON array, categories contain eight lines, an empty pattern set produces a zero-byte file, and stable `_id` values are preserved.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- tests/gallery/content-tooling.test.ts`

Expected: FAIL because the current builder writes pretty-printed arrays named `categories.json` and `patterns.json`.

- [ ] **Step 3: Implement JSONL output**

Export `writeJsonLines(records)` as `records.map(record => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "")`. Write only `categories-import.json` and `patterns-import.json`, removing obsolete output names first.

- [ ] **Step 4: Document the exact console requirement**

State explicitly that uniCloud accepts a `.json` file whose contents are JSONL and that a JSON array is rejected.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/gallery/content-tooling.test.ts && npm run build:gallery-import`

Inspect both generated files line-by-line, then commit only the four named source/test/doc files with `fix(gallery): emit unicloud jsonl imports`.

### Task 2: Define the pilot palette, glyphs and grid primitives

**Files:**
- Create: `content/gallery/palettes/pindou-soft-original-v1.json`
- Create: `content/gallery/glyphs/pindou-hanzi-12-v1.json`
- Create: `scripts/gallery/grid-authoring.mjs`
- Create: `scripts/gallery/grid-authoring.d.mts`
- Create: `tests/gallery/grid-authoring.test.ts`

**Interfaces:**
- Produces: `createGrid(width, height)`, `setCell`, `drawLine`, `drawRect`, `placeGlyph`, `countBeads`, `collectColorIds` and `loadPalette`.
- Consumers: Tasks 3 and 4.

- [ ] **Step 1: Write failing primitive and glyph tests**

Cover bounds rejection, immutable row-major output, horizontal/vertical lines, rectangles, transparent cells, unknown glyph/color rejection and exact placement of every Chinese character required by the four designs.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/gallery/grid-authoring.test.ts`

Expected: FAIL because authoring modules and registries do not exist.

- [ ] **Step 3: Add the minimal registries and primitives**

The palette defines stable IDs for cream, blush, lavender, sage, butter, cocoa, white, coral, mint, gold and charcoal. Glyph rows are fixed-width binary strings and include only `内有萌犬快递挡在门口脱离苦海发大财`.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/gallery/grid-authoring.test.ts`

Expected: PASS with no filesystem writes during module import. Commit with `feat(content): add pilot grid authoring system`.

### Task 3: Author four deterministic lossless patterns

**Files:**
- Create: `content/gallery/designs/pilot-patterns.mjs`
- Create: `scripts/gallery/build-pilot-content.mjs`
- Create: `content/gallery/payloads/inside-cute-dog-sign-v1.json`
- Create: `content/gallery/payloads/delivery-block-door-sign-v1.json`
- Create: `content/gallery/payloads/birthday-dog-cake-bouquet-v1.json`
- Create: `content/gallery/payloads/farewell-fortune-sign-v1.json`
- Create: `tests/gallery/pilot-patterns.test.ts`

**Interfaces:**
- Produces: four `GalleryPatternPayloadV1` files and `buildPilotPayloads(outputRoot)`.
- Consumes: Task 2 primitives and palette/glyph registries.

- [ ] **Step 1: Write failing content-shape tests**

Assert exact IDs, versions and dimensions; non-empty bead bounds; allowed palette IDs; intended default text regions; two farewell regions; no birthday text region; and byte-identical second generation.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/gallery/pilot-patterns.test.ts`

- [ ] **Step 3: Implement the four compositions**

Build only the motifs named in the spec. Keep each composition a direct sequence of grid primitives; do not add a general vector engine or configurable template language.

- [ ] **Step 4: Generate, inspect and verify payloads**

Run: `node scripts/gallery/build-pilot-content.mjs --payloads-only` and `npm test -- tests/gallery/pilot-patterns.test.ts`.

Confirm every `cells.length` equals width × height and every text region is inside its grid.

- [ ] **Step 5: Commit**

Commit the design, builder, four generated payloads and test with `feat(content): author four pilot gallery patterns`.

### Task 4: Render deterministic card and high-resolution previews

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/gallery/render-pattern-png.mjs`
- Modify: `scripts/gallery/build-pilot-content.mjs`
- Create: `content/gallery/previews/card/inside-cute-dog-sign-v1.png`
- Create: `content/gallery/previews/card/delivery-block-door-sign-v1.png`
- Create: `content/gallery/previews/card/birthday-dog-cake-bouquet-v1.png`
- Create: `content/gallery/previews/card/farewell-fortune-sign-v1.png`
- Create: `content/gallery/previews/detail/inside-cute-dog-sign-v1.png`
- Create: `content/gallery/previews/detail/delivery-block-door-sign-v1.png`
- Create: `content/gallery/previews/detail/birthday-dog-cake-bouquet-v1.png`
- Create: `content/gallery/previews/detail/farewell-fortune-sign-v1.png`
- Create: `tests/gallery/pattern-renderer.test.ts`

**Interfaces:**
- Produces: `renderPatternPng(payload, palette, options): Buffer`, where options contain `pixelsPerCell`, `showCoordinates`, `majorGuideEvery: 10` and `pegboardSize: 29`.
- Consumes: Task 2 palette and Task 3 payloads.

- [ ] **Step 1: Add exact renderer tests before the dependency**

Test PNG signature, exact 8/32-pixel grid dimensions, the fixed 64-pixel top/left detail margins, transparency/background policy, deterministic bytes, visible bead centre/edge difference, tenth-bead guides, 29-bead board boundaries, coordinate consistency and rejection of unknown colors or invalid cell counts.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test -- tests/gallery/pattern-renderer.test.ts`

- [ ] **Step 3: Install one pinned script dependency**

Add exact development dependency `pngjs@7.0.0`. The renderer is ESM JavaScript, so do not add a type package. Do not add Canvas, Sharp or a browser renderer.

- [ ] **Step 4: Implement and generate previews**

Render a warm-cream background, subtle grid separation, tenth-bead guides, 29-bead boundaries, optional row/column coordinates and circular beads directly from payload cells. Card images omit coordinates; detail images include them. Generate eight committed PNG files.

- [ ] **Step 5: Verify dimensions and commit**

Run the renderer tests twice and compare hashes of all eight files. Commit with `feat(content): render pilot gallery previews`.

### Task 5: Publish validated metadata and deployment manifest

**Files:**
- Modify: `content/gallery/catalog.json`
- Modify: `content/gallery/README.md`
- Create: `scripts/gallery/build-gallery-upload-manifest.mjs`
- Create: `generated/gallery-import/.gitkeep` (retain)
- Modify: `scripts/gallery/gallery-contract.mjs`
- Modify: `scripts/gallery/gallery-contract.d.mts`
- Modify: `tests/gallery/content-tooling.test.ts`
- Create: `tests/fixtures/gallery/pilot-expected-metadata.json`

**Interfaces:**
- Produces: four approved catalog records and `asset-upload-manifest.json` containing twelve logical keys/local paths.
- Consumes: Tasks 3 and 4 assets.

- [ ] **Step 1: Write failing catalog and asset tests**

Require exact four records, approved provenance, correct category slugs, exact payload hashes/sizes, derived bead/color counts, maximum eleven colors, expected PNG files/dimensions and a twelve-entry upload manifest with no cloud IDs. Compute connected components per color and reject undeclared isolated single cells; the birthday/farewell design fixtures explicitly enumerate any intentional sparkle coordinates.

- [ ] **Step 2: Run validation and confirm RED**

Run: `npm test -- tests/gallery/content-tooling.test.ts && npm run validate:gallery`

- [ ] **Step 3: Add four metadata records and strict asset validation**

Use exact version `1.0.0`, `Pindou Studio`, `original`, approved license/review/publication states and the four IDs from the spec. Compute facts from payloads; never type hashes, byte sizes, counts or image dimensions by hand.

- [ ] **Step 4: Build and inspect the upload manifest**

Run: `node scripts/gallery/build-gallery-upload-manifest.mjs`. Confirm it has twelve unique logical keys and only repository-relative source paths.

- [ ] **Step 5: Verify and commit**

Run focused tests plus `npm run validate:gallery`. Commit with `feat(content): register four approved gallery patterns`.

### Task 6: Resolve account-bound cloud file IDs safely

**Files:**
- Modify: `.gitignore`
- Create: `content/gallery/cloud-file-map.example.json`
- Modify: `scripts/gallery/build-gallery-import.mjs`
- Modify: `scripts/gallery/build-gallery-import.d.mts`
- Modify: `tests/gallery/content-tooling.test.ts`
- Modify: `docs/unicloud-aliyun-setup.md`

**Interfaces:**
- Produces: `resolveCloudAssetRefs(catalog, mapping)` and deployable `patterns-import.json`.
- Consumes: a local ignored `content/gallery/cloud-file-map.json` created by the user after upload.

- [ ] **Step 1: Add failing mapping-boundary tests**

Reject missing/extra logical keys, duplicate cloud IDs, blank IDs, non-cloud references and a mapping accidentally included in tracked files. Assert that list/detail/payload refs resolve to their corresponding cloud file IDs and no local path enters database output.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/gallery/content-tooling.test.ts`

- [ ] **Step 3: Implement the minimal mapping resolver**

Read the mapping only when `--cloud-file-map <path>` is passed. Default catalog validation and preview generation remain account-independent. Never print mapping values in success or error output.

- [ ] **Step 4: Add exact user deployment instructions**

Document upload order, how to copy twelve returned file IDs into the ignored mapping based on the example, how to build JSONL imports and how to verify four records.

- [ ] **Step 5: Verify secret boundaries and commit**

Run focused tests, `git check-ignore content/gallery/cloud-file-map.json`, and tracked-file scans only. Commit with `feat(content): package cloud-safe gallery imports`.

### Task 7: Exercise the existing gallery flow with production content

**Files:**
- Modify: `tests/gallery/gallery-controller.test.ts`
- Modify: `tests/gallery/uni-cloud-gallery-repository.test.ts`
- Modify: `tests/smoke/gallery-ui-contract.test.ts`
- Modify only on demonstrated failure: the directly failing gallery production file.

**Interfaces:**
- Consumes: four Task 5 records and existing Milestone 6 repository/controller/pages.
- Produces: regression evidence for guest list, search, filter, detail and local copy behavior.

- [ ] **Step 1: Add fixture-driven flow tests**

Assert four lightweight summaries, exact-name search, each of four usage filters, detail metadata, preview resolution, payload download-on-use only and persistent independent local copies. Assert identity runtime is never invoked.

- [ ] **Step 2: Run focused tests and inspect failures**

Run: `npm test -- tests/gallery tests/smoke/gallery-ui-contract.test.ts`

- [ ] **Step 3: Apply only demonstrated compatibility fixes**

If production content exposes a real contract mismatch, retain the failing test and change only the responsible adapter/controller/view. Do not add editor, export or cloud-save behavior.

- [ ] **Step 4: Verify and commit**

Re-run the focused command. If no production change was needed, commit only tests with `test(gallery): cover pilot content flow`; otherwise use `fix(gallery): support pilot content flow`.

### Task 8: Full verification, delivery and real-cloud handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-09-05-gallery-pilot-content.md`
- Modify only for demonstrated failures: directly responsible files.

**Interfaces:**
- Consumes: all Milestone 7 deliverables.
- Produces: reviewed GitHub tag plus an exact HBuilderX deployment package and acceptance checklist.

- [ ] **Step 1: Run the complete automated gate**

Run: `npm run check` and `npm run build:h5`.

Expected: all tests, lint, type checks, content/cloud validation and both production builds exit `0`.

- [ ] **Step 2: Inspect generated assets and secrets**

Verify four payloads, four cards, four detail PNGs, twelve upload-manifest entries and four JSONL pattern lines after a synthetic mapping. Use `git grep` over tracked files; do not recursively scan the ignored real uni-id config or cloud mapping.

- [ ] **Step 3: Obtain independent code, content and specification review**

Review every change against the spec. Treat copied-IP resemblance, incorrect text, nondeterministic assets, raster-as-source, credential leakage, JSON-array imports or guest identity prompts as blocking findings.

- [ ] **Step 4: Mark completed plan items and commit delivery state**

Stage only the plan and directly approved Milestone 7 files. Confirm local account files remain unstaged.

- [ ] **Step 5: Merge, tag and push**

Fast-forward `main`, create annotated tag `milestone-07-gallery-pilot-content`, push `main` and the tag, fetch, and prove local HEAD, `origin/main` and dereferenced tag are equal.

- [ ] **Step 6: Guide the user through real-cloud deployment**

Stop before any account-bound upload. Guide the user to upload the twelve manifest assets, create the ignored mapping, generate/import `patterns-import.json`, reconnect HBuilderX to cloud functions and validate exactly four guest-visible patterns with no red console errors.

After real-cloud acceptance, stop Milestone 7. The next implementation plan is Milestone 8 local photo intake, orientation correction and privacy controls; do not switch to DIY or community work.
