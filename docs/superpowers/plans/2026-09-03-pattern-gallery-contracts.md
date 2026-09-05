# Milestone 6 Pattern Gallery Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a guest-accessible, cloud-configured pattern gallery with multi-dimensional discovery, lightweight list queries, validated lossless payloads, safe caching and independent local project copies.

**Architecture:** Gallery pages call an application controller through domain ports. A uniCloud adapter talks only to a public read-only `pindou-gallery` cloud object, while a platform cache stores versioned payload files and verifies SHA-256 before use. Database records contain lightweight metadata; cloud storage contains covers, detail previews and authoritative lossless grid payloads.

**Tech Stack:** uni-app Vue 3, TypeScript 4.9, uniCloud Alibaba, Node.js cloud objects, Vitest 1.6, ESLint, `@noble/hashes` 1.4.0 for cross-platform SHA-256.

**Spec:** `docs/superpowers/specs/2026-09-03-pattern-gallery-contracts-design.md`

## Global Constraints

- WeChat Mini Program is the primary runtime; domain and application modules remain H5/App compatible.
- Guests browse, search, inspect and create local copies without identity authorization.
- Only cloud-project save/view actions use the Milestone 5 identity boundary.
- Gallery list responses never contain lossless cell data or payload bodies.
- Only records with `publish_status: published`, `license_status: approved` and `review_status: approved` are externally readable.
- Raster covers and previews are never used as editable or export sources.
- Payload format validation is strict; unsupported versions and integrity failures never create partial projects.
- Production pattern artwork remains outside this milestone; tests use synthetic grids.
- No likes, favorites, popularity sort, community publishing or administration website is added.
- Existing local `src/manifest.json`, `.hbuilderx/`, `.superpowers/` and ignored `uni-id/config.json` must never be staged by milestone commits.

## File Structure

- `src/domain/gallery/types.ts`: gallery category, summary, detail, query, payload and error types.
- `src/domain/gallery/validation.ts`: strict runtime validation for cloud records and payloads.
- `src/domain/gallery/payload-integrity.ts`: UTF-8 SHA-256 calculation and payload hash verification.
- `src/domain/gallery/project-copy.ts`: deterministic mapping from an approved payload to a new `PindouProjectV1`.
- `src/domain/gallery/index.ts`: gallery-domain public exports.
- `src/domain/contracts/repositories.ts`: replace the provisional gallery repository with paginated summary/detail/payload ports.
- `src/application/gallery/controller.ts`: gallery list/detail state machine and stale-request protection.
- `src/application/gallery/runtime.ts`: production dependency composition for gallery pages.
- `src/application/gallery/index.ts`: application exports.
- `src/adapters/gallery/uni-cloud-gallery-repository.ts`: transport mapping for the `pindou-gallery` cloud object.
- `src/adapters/gallery/platform-payload-cache.ts`: WeChat file cache and H5 storage fallback behind one port.
- `src/adapters/gallery/platform.ts`: uniCloud, download and storage dependency construction.
- `src/adapters/gallery/index.ts`: adapter exports.
- `src/components/gallery/GalleryFilters.vue`: complete multi-dimensional filter sheet/panel.
- `src/components/gallery/PatternCard.vue`: compact two-column result card.
- `src/pages/gallery/index.vue`: search, quick entries, ordering, paging and states.
- `src/pages/gallery/detail.vue`: pattern detail, preview, download/use action and states.
- `src/pages/index/index.vue`: activate the gallery entry and navigate to the gallery page.
- `src/pages.json`: register gallery list and detail routes.
- `uniCloud-aliyun/database/pindou-gallery-categories.schema.json`: category/quick-entry schema.
- `uniCloud-aliyun/database/pindou-gallery-patterns.schema.json`: lightweight metadata and payload-reference schema.
- `uniCloud-aliyun/cloudfunctions/pindou-gallery/gallery-core.js`: pure query validation, publication predicates and projections.
- `uniCloud-aliyun/cloudfunctions/pindou-gallery/index.obj.js`: public cloud-object methods.
- `uniCloud-aliyun/cloudfunctions/pindou-gallery/package.json`: cloud dependencies.
- `content/gallery/catalog.json`: eight approved usage categories and an empty Milestone 6 pattern list.
- `content/gallery/README.md`: content format, provenance and asset rules for Milestone 7.
- `scripts/gallery/gallery-contract.mjs`: Node-side strict content validator shared by CLI scripts.
- `scripts/gallery/validate-gallery.mjs`: validation command.
- `scripts/gallery/build-gallery-import.mjs`: deterministic import-bundle builder.
- `generated/gallery-import/.gitkeep`: keeps the ignored output location documented without committing generated content.
- `docs/unicloud-aliyun-setup.md`: Milestone 6 database/cloud-object/import deployment order.
- `tests/gallery/*.test.ts`, `tests/cloud/gallery-core.test.ts`, `tests/smoke/gallery-ui-contract.test.ts`: contract, integration and UI gates.

---

### Task 1: Gallery Domain Contracts and Validation

**Files:**
- Create: `src/domain/gallery/types.ts`
- Create: `src/domain/gallery/validation.ts`
- Create: `src/domain/gallery/index.ts`
- Modify: `src/domain/contracts/repositories.ts`
- Modify: `src/domain/contracts/index.ts`
- Test: `tests/gallery/gallery-validation.test.ts`
- Test: `tests/domain/contracts.test.ts`

**Interfaces:**
- Consumes: `PaletteReference`, `ProjectCell`, `ProjectDirection` from `src/domain/project`.
- Produces: `GalleryCategory`, `GalleryPatternSummary`, `GalleryPatternDetail`, `GalleryPatternPayloadV1`, `GalleryListQuery`, `GalleryPage<T>`, `GalleryRepository`, `GalleryPayloadSource`, and strict validators.

- [x] **Step 1: Write failing contract tests**

Add cases that accept one complete category, summary, detail and payload fixture and reject:

```ts
expect(validateGalleryPayload({ ...validPayload, formatVersion: 2 })).toEqual({
  ok: false,
  error: { code: "UNSUPPORTED_VERSION", path: "formatVersion" },
});

expect(validateGalleryPayload({ ...validPayload, cells: ["A01"] })).toEqual({
  ok: false,
  error: { code: "CELL_COUNT_MISMATCH", path: "cells" },
});

expect(validatePatternSummary({ ...validSummary, payload: validPayload })).toEqual({
  ok: false,
  error: { code: "UNKNOWN_FIELD", path: "payload" },
});
```

Also update `tests/domain/contracts.test.ts` so the repository contract requires paginated summaries rather than full cell records.

- [x] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/gallery/gallery-validation.test.ts tests/domain/contracts.test.ts`

Expected: FAIL because `src/domain/gallery` exports and the new repository signatures do not exist.

- [x] **Step 3: Define exact gallery types**

Create discriminated, JSON-safe types with these public shapes:

```ts
export type GalleryDifficulty = "beginner" | "standard" | "advanced";
export type GallerySizeClass = "small" | "medium" | "large";
export type GalleryOrder = "featured" | "newest";

export interface GalleryTagSet {
  usage: string[];
  themes: string[];
  features: string[];
}

export interface GalleryCategory {
  id: string;
  version: string;
  slug: string;
  name: string;
  shortLabel: string;
  quickEntry: boolean;
  order: number;
  coverRef?: string;
}

export interface GalleryEditableTextRegion {
  id: string;
  defaultText: string;
  x: number;
  y: number;
  fontId: string;
  size: number;
  colorId: string;
  maxLength: number;
}

export interface GalleryPatternSummary {
  id: string;
  version: string;
  name: string;
  coverRef: string;
  width: number;
  height: number;
  difficulty: GalleryDifficulty;
  sizeClass: GallerySizeClass;
  tags: GalleryTagSet;
  hasEditableText: boolean;
  publishedAt: string;
}

export interface GalleryPayloadDescriptor {
  fileRef: string;
  formatVersion: 1;
  byteSize: number;
  sha256: string;
}

export type GalleryErrorCode =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "ASSET_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "UNSUPPORTED_VERSION"
  | "PAYLOAD_INTEGRITY_FAILED"
  | "INTERNAL_ERROR";

export type GalleryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: GalleryErrorCode } };

export interface GalleryPatternDetail extends GalleryPatternSummary {
  description: string;
  previewRef: string;
  physicalWidthMm: number;
  physicalHeightMm: number;
  palette: PaletteReference;
  direction: ProjectDirection;
  colorCount: number;
  beadCount: number;
  editableTextRegions: GalleryEditableTextRegion[];
  creator: string;
  sourceType: "original" | "commissioned" | "licensed";
  sourceReference?: string;
  payload: GalleryPayloadDescriptor;
}

export interface GalleryPatternPayloadV1 {
  format: "pindou-gallery-pattern";
  formatVersion: 1;
  contentId: string;
  contentVersion: string;
  width: number;
  height: number;
  palette: PaletteReference;
  cells: ProjectCell[];
  direction: ProjectDirection;
  editableTextRegions: GalleryEditableTextRegion[];
}
```

Define `GalleryListQuery` with trimmed optional `search`, tag arrays, optional difficulty/size class, `order`, optional opaque cursor and `limit` constrained to `1..24`. Define `GalleryPage<T>` as `{ items: T[]; nextCursor?: string }`.

- [x] **Step 4: Implement strict runtime validators**

Validators must reject arrays where records are expected, unknown enumerable fields, empty/duplicate tags, invalid ISO timestamps, non-positive dimensions, dimensions above `200`, SHA-256 values not matching `/^[a-f0-9]{64}$/`, payload cells not equal to `width * height`, invalid text-region bounds and cell values other than non-empty color IDs or `null`.

Return only:

```ts
type GalleryValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: "INVALID_DOCUMENT" | "INVALID_FIELD" | "UNKNOWN_FIELD" | "UNSUPPORTED_VERSION" | "CELL_COUNT_MISMATCH"; path: string } };
```

- [x] **Step 5: Replace the provisional repository contract**

Use these signatures:

```ts
export interface GalleryRepository {
  listCategories(): Promise<GalleryResult<GalleryCategory[]>>;
  listPatterns(query: GalleryListQuery): Promise<GalleryResult<GalleryPage<GalleryPatternSummary>>>;
  getPattern(id: string): Promise<GalleryResult<GalleryPatternDetail | null>>;
}

export interface GalleryPayloadSource {
  download(descriptor: GalleryPayloadDescriptor): Promise<GalleryResult<string>>;
}
```

`download` returns the exact UTF-8 JSON text so integrity is checked before parsing.

- [x] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- tests/gallery/gallery-validation.test.ts tests/domain/contracts.test.ts`

Expected: all cases pass.

- [x] **Step 7: Commit Task 1**

```bash
git add src/domain/gallery src/domain/contracts tests/gallery/gallery-validation.test.ts tests/domain/contracts.test.ts
git commit -m "feat(gallery): define content contracts"
```

### Task 2: Database Schemas and Lossless Payload Integrity

**Files:**
- Modify: `uniCloud-aliyun/database/pindou-gallery-categories.schema.json`
- Modify: `uniCloud-aliyun/database/pindou-gallery-patterns.schema.json`
- Create: `src/domain/gallery/payload-integrity.ts`
- Modify: `src/domain/gallery/index.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tests/cloud/gallery-schema.test.ts`
- Test: `tests/gallery/payload-integrity.test.ts`

**Interfaces:**
- Consumes: `GalleryPayloadDescriptor` and exact payload JSON text from Task 1.
- Produces: `sha256Utf8(text: string): string` and `verifyPayloadIntegrity(text, descriptor): GalleryResult<void>`.

- [x] **Step 1: Write failing schema and hash tests**

Schema tests must prove that ordinary users cannot create/update/delete gallery records, public reads require all three approved states, pattern metadata has no `cell_data`, and required fields include multi-dimensional tags plus payload descriptor fields.

Hash tests use published SHA-256 vectors:

```ts
expect(sha256Utf8("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
expect(sha256Utf8("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
```

Add byte-size mismatch and hash mismatch cases that return `PAYLOAD_INTEGRITY_FAILED`.

- [x] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/cloud/gallery-schema.test.ts tests/gallery/payload-integrity.test.ts`

Expected: FAIL against the old single-category/cell-data schema and missing hash module.

- [x] **Step 3: Upgrade both schemas**

Keep deny-by-default writes. Categories add `slug`, `short_label`, `quick_entry`, optional `cover_ref` and publication metadata. Patterns replace `category_id` and `cell_data` with `usage_tags`, `theme_tags`, `feature_tags`, `difficulty`, `size_class`, `card_cover_ref`, `detail_preview_ref`, `payload_file_ref`, `payload_format_version`, `payload_byte_size`, `payload_sha256`, physical dimensions, counts, recommendation weight and `published_at`.

Use `additionalProperties: false` and enforce the existing publication predicate:

```json
{
  "read": "doc.publish_status == 'published' && doc.license_status == 'approved' && doc.review_status == 'approved'",
  "create": false,
  "update": false,
  "delete": false
}
```

- [x] **Step 4: Install and wrap the cross-platform hash library**

Run: `npm install --save-exact @noble/hashes@1.4.0`

Implement UTF-8 hashing with `sha256` and `bytesToHex`; compare both `new TextEncoder().encode(text).byteLength` and the lowercase digest to the descriptor. Map mismatch to `{ ok: false, error: { code: "PAYLOAD_INTEGRITY_FAILED" } }` without parsing untrusted JSON first.

- [x] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- tests/cloud/gallery-schema.test.ts tests/gallery/payload-integrity.test.ts`

Expected: all cases pass.

- [x] **Step 6: Commit Task 2**

```bash
git add package.json package-lock.json src/domain/gallery uniCloud-aliyun/database tests/cloud/gallery-schema.test.ts tests/gallery/payload-integrity.test.ts
git commit -m "feat(gallery): secure metadata and payload integrity"
```

### Task 3: Deterministic Content Validation and Import Bundle

**Files:**
- Create: `content/gallery/catalog.json`
- Create: `content/gallery/README.md`
- Create: `scripts/gallery/gallery-contract.mjs`
- Create: `scripts/gallery/validate-gallery.mjs`
- Create: `scripts/gallery/build-gallery-import.mjs`
- Create: `generated/gallery-import/.gitkeep`
- Modify: `.gitignore`
- Modify: `package.json`
- Test: `tests/gallery/content-tooling.test.ts`
- Test fixtures: `tests/fixtures/gallery/valid-catalog.json`
- Test fixtures: `tests/fixtures/gallery/invalid-hash-catalog.json`
- Test fixtures: `tests/fixtures/gallery/payloads/tiny-heart-v1.json`

**Interfaces:**
- Consumes: Task 1 field names and Task 2 SHA-256/byte-size rules.
- Produces: `validateCatalog(catalog, readAsset): ValidationIssue[]` and deterministic `generated/gallery-import/categories.json` plus `patterns.json`.

- [x] **Step 1: Write failing CLI-tool tests**

Test that the valid synthetic 2x2 fixture passes; duplicate IDs, unknown tags, invalid region bounds, mismatched byte size/hash, unapproved published content and missing assets fail with a precise JSON path. Run the builder twice and assert byte-identical outputs.

- [x] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/gallery/content-tooling.test.ts`

Expected: FAIL because the gallery scripts and fixtures are absent.

- [x] **Step 3: Create the initial catalog**

Add eight approved original usage categories with stable slugs:

```json
{
  "catalogVersion": 1,
  "categories": [
    { "id": "usage-door-sign", "slug": "door-sign", "name": "门牌", "shortLabel": "门牌", "quickEntry": true, "order": 10 },
    { "id": "usage-delivery-sign", "slug": "delivery-sign", "name": "快递门牌", "shortLabel": "快递", "quickEntry": false, "order": 20 },
    { "id": "usage-birthday", "slug": "birthday", "name": "生日", "shortLabel": "生日", "quickEntry": true, "order": 30 },
    { "id": "usage-holiday", "slug": "holiday", "name": "节日", "shortLabel": "节日", "quickEntry": true, "order": 40 },
    { "id": "usage-farewell", "slug": "farewell", "name": "离职告别", "shortLabel": "告别", "quickEntry": false, "order": 50 },
    { "id": "usage-new-job", "slug": "new-job", "name": "入职祝福", "shortLabel": "入职", "quickEntry": false, "order": 60 },
    { "id": "usage-anniversary", "slug": "anniversary", "name": "纪念日", "shortLabel": "纪念", "quickEntry": false, "order": 70 },
    { "id": "usage-gift", "slug": "gift", "name": "礼物", "shortLabel": "礼物", "quickEntry": true, "order": 80 }
  ],
  "patterns": []
}
```

The actual records also contain creator `Pindou Studio`, source type `original`, approved license/review state, an ISO acquisition date and published state.

- [x] **Step 4: Implement strict validation and deterministic output**

Sort categories by `order` then `id`; sort patterns by `id` then semantic content version. Emit only database field names documented by the schemas. The builder removes and recreates only `generated/gallery-import/categories.json` and `patterns.json`; it never writes credentials or uploads remotely.

- [x] **Step 5: Add scripts and ignore generated output**

Add:

```json
{
  "validate:gallery": "node scripts/gallery/validate-gallery.mjs",
  "build:gallery-import": "node scripts/gallery/build-gallery-import.mjs"
}
```

Ignore `generated/gallery-import/*.json` while retaining `.gitkeep`. Extend `npm run check` so `validate:gallery` runs before cloud validation.

- [x] **Step 6: Run focused and CLI tests**

Run: `npm test -- tests/gallery/content-tooling.test.ts`

Run: `npm run validate:gallery`

Run: `npm run build:gallery-import`

Expected: tests pass, the empty production pattern catalog validates, and two deterministic import JSON files are generated locally.

- [x] **Step 7: Commit Task 3**

```bash
git add .gitignore package.json content/gallery scripts/gallery generated/gallery-import/.gitkeep tests/gallery/content-tooling.test.ts tests/fixtures/gallery
git commit -m "feat(gallery): validate content import bundles"
```

### Task 4: Public Read-Only Gallery Cloud Object

**Files:**
- Create: `uniCloud-aliyun/cloudfunctions/pindou-gallery/gallery-core.js`
- Create: `uniCloud-aliyun/cloudfunctions/pindou-gallery/index.obj.js`
- Create: `uniCloud-aliyun/cloudfunctions/pindou-gallery/package.json`
- Modify: `scripts/cloud/validate-foundations.mjs`
- Test: `tests/cloud/gallery-core.test.ts`
- Modify: `tests/cloud/cloud-foundations.test.ts`

**Interfaces:**
- Consumes: cloud collections from Task 2 and field names from Task 3.
- Produces: cloud methods `listCategories()`, `listPatterns(query)` and `getPattern(contentId)` with `{ ok, data?, error? }` envelopes.

- [x] **Step 1: Write failing pure-core tests**

Inject repository functions into the core and test:

- trimming and lowercasing search input;
- allowed usage/theme/feature tag intersections;
- `limit` default `12`, maximum `24`;
- featured sorting by recommendation weight, published time and stable ID;
- newest sorting by published time and stable ID;
- opaque cursor decode rejection;
- publication/license/review predicates on every query;
- list projection excludes payload refs beyond the cover and never includes cell data;
- missing/archived/rejected details return `null` rather than leaking metadata.

- [x] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/cloud/gallery-core.test.ts tests/cloud/cloud-foundations.test.ts`

Expected: FAIL because `pindou-gallery` does not exist.

- [x] **Step 3: Implement the pure query core**

Expose:

```js
module.exports = {
  buildCategoryQuery,
  buildPatternQuery,
  decodeCursor,
  encodeCursor,
  projectCategory,
  projectPatternSummary,
  projectPatternDetail,
  validateListQuery,
};
```

Every database selector includes the three approved-state predicates. Cursor contents include order mode plus the final sort tuple and are rejected when used with a different order.

- [x] **Step 4: Implement the cloud object**

`index.obj.js` creates database collection handles, calls only validated core functions and resolves `card_cover_ref`, `detail_preview_ref` and `payload_file_ref` through `uniCloud.getTempFileURL` only after the record passes publication checks. It must not define create/update/delete/import methods callable by clients.

Map malformed requests to `INVALID_REQUEST`, unavailable storage URLs to `ASSET_UNAVAILABLE` and unexpected errors to `INTERNAL_ERROR`; do not return raw database errors.

- [x] **Step 5: Extend cloud-foundation validation**

Require all three cloud-object files, reject a client-callable write method, and ensure `package.json` depends on `pindou-cloud-common` via `file:../common/pindou-cloud-common`.

- [x] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- tests/cloud/gallery-core.test.ts tests/cloud/cloud-foundations.test.ts`

Expected: all cases pass.

- [x] **Step 7: Commit Task 4**

```bash
git add uniCloud-aliyun/cloudfunctions/pindou-gallery scripts/cloud/validate-foundations.mjs tests/cloud/gallery-core.test.ts tests/cloud/cloud-foundations.test.ts
git commit -m "feat(gallery): add public read-only cloud object"
```

### Task 5: Client Repository, Download Source and Versioned Cache

**Files:**
- Create: `src/adapters/gallery/uni-cloud-gallery-repository.ts`
- Create: `src/adapters/gallery/platform-payload-cache.ts`
- Create: `src/adapters/gallery/platform.ts`
- Create: `src/adapters/gallery/index.ts`
- Modify: `src/domain/contracts/repositories.ts`
- Test: `tests/gallery/uni-cloud-gallery-repository.test.ts`
- Test: `tests/gallery/platform-payload-cache.test.ts`

**Interfaces:**
- Consumes: `GalleryRepository`, `GalleryPayloadSource`, validators and integrity helpers from Tasks 1-2.
- Produces: `GalleryPayloadCache` with `get`, `put`, `remove` and `createCachedPayloadSource` that retries once after integrity failure.

- [x] **Step 1: Write failing adapter tests**

Cover valid envelope mapping, rejected cloud codes, thrown transport errors, malformed successful data, missing pattern, page cursor mapping, temp URL download, cache hit, version/hash cache miss, corrupt-cache removal, one clean redownload and second integrity failure.

Assert category/list/detail calls never read identity storage or invoke identity services.

- [x] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/gallery/uni-cloud-gallery-repository.test.ts tests/gallery/platform-payload-cache.test.ts`

Expected: FAIL because gallery adapters are absent.

- [x] **Step 3: Implement transport mapping**

Use a dependency interface rather than importing `uni` in tests:

```ts
export interface GalleryCloudDependencies {
  listCategories(): Promise<unknown>;
  listPatterns(query: GalleryListQuery): Promise<unknown>;
  getPattern(id: string): Promise<unknown>;
  downloadText(url: string): Promise<string>;
}
```

Validate every successful response before returning it. Map known codes to `INVALID_REQUEST`, `NOT_FOUND`, `ASSET_UNAVAILABLE`, `NETWORK_ERROR`, `UNSUPPORTED_VERSION` or `INTERNAL_ERROR`. Unknown thrown values become `NETWORK_ERROR` without exposing raw messages to pages.

- [x] **Step 4: Implement the cache port and adapters**

Define:

```ts
export interface GalleryPayloadCache {
  get(key: string): Promise<string | null>;
  put(key: string, text: string): Promise<void>;
  remove(key: string): Promise<void>;
}
```

Key format is `gallery-payload-v1/<id>/<version>/<sha256>.json`. On WeChat use `wx.env.USER_DATA_PATH` plus `uni.getFileSystemManager`; on H5 use `uni.getStorage` with the same logical key. Reject writes larger than the descriptor byte size and propagate cache failures as non-fatal: a usable downloaded payload may still open even if persistence fails.

- [x] **Step 5: Compose a cached payload source**

On cache hit, verify hash and payload contract. If invalid, remove it and download once. On download, verify UTF-8 byte size and SHA-256 before parsing, then validate ID/version/dimensions. A second invalid result returns `PAYLOAD_INTEGRITY_FAILED` and writes nothing.

- [x] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- tests/gallery/uni-cloud-gallery-repository.test.ts tests/gallery/platform-payload-cache.test.ts`

Expected: all cases pass.

- [x] **Step 7: Commit Task 5**

```bash
git add src/adapters/gallery src/domain/contracts/repositories.ts tests/gallery/uni-cloud-gallery-repository.test.ts tests/gallery/platform-payload-cache.test.ts
git commit -m "feat(gallery): add cloud adapter and payload cache"
```

### Task 6: Gallery Application Controller and Independent Project Copy

**Files:**
- Create: `src/application/gallery/controller.ts`
- Create: `src/application/gallery/runtime.ts`
- Create: `src/application/gallery/index.ts`
- Create: `src/domain/gallery/project-copy.ts`
- Modify: `src/domain/gallery/index.ts`
- Test: `tests/gallery/gallery-controller.test.ts`
- Test: `tests/gallery/gallery-project-copy.test.ts`

**Interfaces:**
- Consumes: Task 5 repository/payload source and existing `PindouProjectV1` validation.
- Produces: list/detail controller state and `createProjectFromGallery(payload, detail, dependencies)`.

- [x] **Step 1: Write failing controller and copy tests**

Test initial/loading/ready/empty/failure states, search/filter refresh, paging append, retry, detail load, stale list/detail suppression and double-tap use deduplication.

Copy tests assert a fresh ID and timestamps, `source: { type: "gallery", patternId, patternVersion }`, bead size `5`, copied cells rather than shared array identity, text defaults, no owner/upload timestamp and successful `validateProject`.

- [x] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/gallery/gallery-controller.test.ts tests/gallery/gallery-project-copy.test.ts`

Expected: FAIL because controller/copy modules do not exist.

- [x] **Step 3: Implement project-copy mapping**

Inject deterministic dependencies:

```ts
export interface GalleryCopyDependencies {
  createId(): string;
  nowIso(): string;
}

export function createProjectFromGallery(
  detail: GalleryPatternDetail,
  payload: GalleryPatternPayloadV1,
  dependencies: GalleryCopyDependencies,
): GalleryResult<PindouProjectV1>;
```

Require exact ID/version/dimension/palette matches before mapping. Copy arrays and objects so later project edits cannot mutate cached payload objects.

- [x] **Step 4: Implement the controller state machine**

Expose explicit list states (`idle`, `loading`, `ready`, `empty`, `failure`) and detail states (`idle`, `loading`, `ready`, `not-found`, `failure`, `unsupported`). Track an incrementing request generation so late search, page and detail responses cannot overwrite newer state. Track one pending use promise to prevent duplicate project creation.

- [x] **Step 5: Compose the production runtime**

Create one gallery runtime that wires platform dependencies, cloud repository, cached payload source and controller. It does not import or invoke `identityRuntime` until a future cloud-save action crosses that separate boundary.

- [x] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- tests/gallery/gallery-controller.test.ts tests/gallery/gallery-project-copy.test.ts`

Expected: all cases pass.

- [x] **Step 7: Commit Task 6**

```bash
git add src/application/gallery src/domain/gallery tests/gallery/gallery-controller.test.ts tests/gallery/gallery-project-copy.test.ts
git commit -m "feat(gallery): orchestrate discovery and local copies"
```

### Task 7: Gallery Home Page

**Files:**
- Create: `src/components/gallery/GalleryFilters.vue`
- Create: `src/components/gallery/PatternCard.vue`
- Create: `src/pages/gallery/index.vue`
- Modify: `src/pages/index/index.vue`
- Modify: `src/pages.json`
- Test: `tests/smoke/gallery-ui-contract.test.ts`

**Interfaces:**
- Consumes: Task 6 runtime list state and actions.
- Produces: route `pages/gallery/index` and navigation to `pages/gallery/detail?id=<encoded-id>`.

- [x] **Step 1: Write failing UI contract tests**

Assert the registered routes, active home gallery entry, search input, quick-entry scroll area, featured/newest controls, two-column card component, complete filter dimensions, clear-filter empty action, retry state, image fallback and no identity import in gallery files.

- [x] **Step 2: Run focused test and verify RED**

Run: `npm test -- tests/smoke/gallery-ui-contract.test.ts`

Expected: FAIL because routes and components do not exist.

- [x] **Step 3: Implement reusable card and filter components**

`PatternCard.vue` receives a `GalleryPatternSummary`, emits `select`, and renders only cover/name/dimensions/difficulty/feature badges. Cover error swaps to an existing-style warm neutral placeholder and does not emit a failure.

`GalleryFilters.vue` receives the current filter value plus category/tag options, supports usage/theme/difficulty/size/features, and emits one immutable `apply` value or `clear`.

- [x] **Step 4: Implement gallery home states**

Use the established warm cream/blush/lavender visual tokens. The page renders:

- loading skeletons without fake pattern names;
- retryable failure copy;
- empty catalog copy when no patterns exist yet;
- no-result copy plus clear filters;
- ready two-column cards;
- explicit load-more action only when `nextCursor` exists.

Search submits trimmed text and debounces typing by 300 ms; each query resets pagination. Featured is default, newest is opt-in.

- [x] **Step 5: Activate navigation**

Add an `id` to the home creation entries and only route the gallery entry to `/pages/gallery/index`. Photo and DIY entries retain their existing construction status. Register gallery list/detail pages without adding a fourth tab.

- [x] **Step 6: Run focused test, type check and WeChat build**

Run: `npm test -- tests/smoke/gallery-ui-contract.test.ts`

Run: `npm run type-check`

Run: `npm run build:mp-weixin`

Expected: all commands exit `0`.

- [x] **Step 7: Commit Task 7**

```bash
git add src/components/gallery src/pages/gallery/index.vue src/pages/index/index.vue src/pages.json tests/smoke/gallery-ui-contract.test.ts
git commit -m "feat(gallery): build discovery page"
```

### Task 8: Pattern Detail and Explicit Use Boundary

**Files:**
- Create: `src/pages/gallery/detail.vue`
- Modify: `src/application/gallery/controller.ts`
- Modify: `src/application/gallery/runtime.ts`
- Modify: `tests/gallery/gallery-controller.test.ts`
- Modify: `tests/smoke/gallery-ui-contract.test.ts`

**Interfaces:**
- Consumes: detail/use behavior from Task 6 and route ID from Task 7.
- Produces: detail presentation plus a validated in-memory independent project handed to the existing future editor boundary.

- [x] **Step 1: Extend failing tests for detail behavior**

Assert preview/name/tags/physical size/difficulty/counts/palette/direction/provenance/editable-text summary, not-found/retry/unsupported states, button loading lock and no project creation merely from opening the page.

Assert successful use shows a truthful message that the editable copy is ready but the production editor arrives in a later milestone; it must not save cloud data or claim editing is available.

- [x] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/gallery/gallery-controller.test.ts tests/smoke/gallery-ui-contract.test.ts`

Expected: FAIL on missing detail page/presentation behavior.

- [x] **Step 3: Implement the detail page**

Load by decoded route `id`, render a larger preview with fallback, format physical dimensions in millimetres, and translate normal/reverse directions into clear Chinese labels. Show creator/source information without exposing internal storage refs, hashes or review-control fields.

- [x] **Step 4: Implement the use action**

Disable the button while one use request is pending. Download, verify, parse and copy in that order. On failure create no project and show retryable copy. On success retain the copy in the gallery runtime's explicit handoff slot and show `图纸副本已准备好；完整编辑器将在后续版本开放`, with a return-to-gallery action.

- [x] **Step 5: Run focused tests and both builds**

Run: `npm test -- tests/gallery/gallery-controller.test.ts tests/smoke/gallery-ui-contract.test.ts`

Run: `npm run build:mp-weixin`

Run: `npm run build:h5`

Expected: all commands exit `0`.

- [x] **Step 6: Commit Task 8**

```bash
git add src/pages/gallery/detail.vue src/application/gallery tests/gallery/gallery-controller.test.ts tests/smoke/gallery-ui-contract.test.ts
git commit -m "feat(gallery): add pattern detail and safe copy flow"
```

### Task 9: Full Verification and Regression Review

**Files:**
- Modify only files required by demonstrated test/build failures.
- Test: all `tests/gallery`, `tests/cloud`, `tests/domain`, `tests/identity` and `tests/smoke` suites.

**Interfaces:**
- Consumes: all Milestone 6 deliverables.
- Produces: evidence that gallery work does not regress identity, project contracts, cloud security or builds.

- [x] **Step 1: Run the complete quality gate**

Run: `npm run check`

Expected: all Vitest suites, lint, type check, gallery validation, cloud validation and WeChat production build exit `0`.

- [x] **Step 2: Run the H5 production build**

Run: `npm run build:h5`

Expected: exit `0`.

- [x] **Step 3: Inspect generated WeChat output**

Confirm `dist/build/mp-weixin/pages/gallery/index.*` and `detail.*` exist, no cloud credentials appear under `dist`, and gallery list code contains no embedded pattern payload fixture.

- [x] **Step 4: Perform focused security scans**

Run:

```bash
rg -n "appsecret|tokenSecret|REPLACE_LOCALLY" src uniCloud-aliyun scripts content docs
git check-ignore uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json
git ls-files uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json
```

Expected: only example/documentation references appear; the real config is ignored and absent from tracked files.

- [x] **Step 5: Review the milestone diff**

Run: `git diff --check milestone-05-wechat-identity-profile..HEAD`

Inspect every changed file for unrelated refactors, accidental generated output, commercial-IP content, direct gallery writes, identity prompts during guest browsing and list payload leakage.

- [x] **Step 6: Commit only demonstrated verification fixes**

If a check proved a defect, add its regression test with the minimal fix. Stage the exact test file and the directly corrected implementation file named by that failure, inspect `git diff --cached --name-only`, then commit with `git commit -m "fix(gallery): address milestone verification finding"`.

If every check passed without changes, record the command evidence in the delivery summary and do not create an empty commit.

### Task 10: Deployment Guide and Milestone Delivery

**Files:**
- Modify: `docs/unicloud-aliyun-setup.md`
- Modify: `docs/superpowers/plans/2026-09-03-pattern-gallery-contracts.md`

**Interfaces:**
- Consumes: verified schemas, content bundle and `pindou-gallery` cloud object.
- Produces: exact HBuilderX deployment order and GitHub milestone tag.

- [x] **Step 1: Write the deployment section**

Document this exact update order for the already-associated Alibaba space:

1. Preserve the ignored real `uni-id/config.json`.
2. Upload the two changed gallery DB schemas.
3. Upload `pindou-gallery` as a cloud object.
4. Run `npm run build:gallery-import` locally.
5. Import `generated/gallery-import/categories.json` into `pindou-gallery-categories` and `patterns.json` into `pindou-gallery-patterns` through the uniCloud console/HBuilderX supported import flow.
6. Confirm eight categories and zero production patterns for Milestone 6.
7. Run HBuilderX connected to cloud functions and verify the guest empty-gallery state without a login prompt.

State that Milestone 7 will add preview/payload assets and 24 pattern records.

- [x] **Step 2: Run final documentation and secret checks**

Run: `git diff --check`

Run: `git status --short`

Expected: `.hbuilderx/`, `.superpowers/`, the locally modified account-bound `src/manifest.json` and ignored real config are not staged.

- [x] **Step 3: Obtain final code and specification review**

Review against `docs/superpowers/specs/2026-09-03-pattern-gallery-contracts-design.md`. Resolve every Critical or Important finding with a failing regression test, minimal fix and rerun of `npm run check && npm run build:h5`.

- [x] **Step 4: Mark this plan complete and commit delivery docs**

Change every completed checkbox to `[x]`, then stage only approved Milestone 6 files and commit:

```bash
git add docs/unicloud-aliyun-setup.md docs/superpowers/plans/2026-09-03-pattern-gallery-contracts.md
git commit -m "docs: complete milestone 6 gallery delivery"
```

- [ ] **Step 5: Tag and push**

```bash
git tag -a milestone-06-pattern-gallery-contracts -m "Milestone 6: pattern gallery contracts"
git push origin main
git push origin milestone-06-pattern-gallery-contracts
```

- [ ] **Step 6: Verify remote equality**

```bash
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
git rev-parse milestone-06-pattern-gallery-contracts^{}
```

Expected: all three revisions match. Stop before Milestone 7 and ask the user to review the gallery behavior and deployment result.
