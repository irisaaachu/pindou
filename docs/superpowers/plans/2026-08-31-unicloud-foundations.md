# Milestone 4 uniCloud Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Alibaba Cloud uniCloud foundation with default-deny database schemas, content-security validation, safe shared cloud utilities and a reproducible association guide.

**Architecture:** Pindou-owned database schemas live under `uniCloud-aliyun/database`, while small CommonJS cloud utilities live under `uniCloud-aliyun/cloudfunctions/common/pindou-cloud-common`. A Node validation module checks the deployable artifacts without contacting a real service space. Client domain and pages remain independent of uniCloud.

**Tech Stack:** uniCloud DB Schema/JQL, Node.js CommonJS cloud modules, Node.js ESM validation, Vitest 1.6, TypeScript 4.9, uni-app Vue 3

**Spec:** `docs/superpowers/specs/2026-08-31-unicloud-foundations-design.md`

## Global Constraints

- Cloud provider is Alibaba Cloud-backed uniCloud under `uniCloud-aliyun`.
- Real service-space IDs, WeChat AppSecret, access keys, private keys and tokens are never committed.
- `uni-id-users` remains owned by the official uni-id module installed in Milestone 5; Milestone 4 must not create an incomplete replacement schema.
- Direct client access to private projects is denied.
- Public content is readable only when publication, license and review states are approved; client writes are denied.
- Original photos and generated export files are prohibited from cloud-project fields.
- `src/domain` and `src/pages` must not import uniCloud or uni-id.
- `.superpowers/` remains local and is never staged.

---

### Task 1: Secret-Safe uniCloud Layout

**Files:**
- Modify: `.gitignore`
- Create: `uniCloud-aliyun/config/uni-id.config.example.json`
- Create: `tests/cloud/cloud-config.test.ts`

**Interfaces:**
- Produces: an unmistakably non-working uni-id example config and ignored real config path.
- Consumes: no application modules.

- [x] **Step 1: Write a failing configuration-safety test**

Load the independent example JSON and assert that `dcloudAppid`, WeChat `appid` and WeChat `appsecret` are exact placeholder strings beginning with `REPLACE_LOCALLY_`. Assert that `.gitignore` ignores the real `config.json` path but does not ignore the independent example.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/cloud/cloud-config.test.ts`

Expected: FAIL because the example configuration does not exist.

- [x] **Step 3: Add the example and ignore rule**

The example follows the uni-id `mp-weixin.oauth.weixin` shape, lives outside the deployable common-module path and contains no account-bound values. Add this exact future real-config path to `.gitignore`:

```text
uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json
```

- [x] **Step 4: Run the focused test and type check**

Run: `npm test -- tests/cloud/cloud-config.test.ts && npm run type-check`

Expected: PASS.

---

### Task 2: Database Schemas and Semantic Validator

**Files:**
- Create: `uniCloud-aliyun/database/pindou-projects.schema.json`
- Create: `uniCloud-aliyun/database/pindou-gallery-categories.schema.json`
- Create: `uniCloud-aliyun/database/pindou-gallery-patterns.schema.json`
- Create: `uniCloud-aliyun/database/pindou-diy-categories.schema.json`
- Create: `uniCloud-aliyun/database/pindou-diy-elements.schema.json`
- Create: `scripts/cloud/foundation-contract.mjs`
- Create: `scripts/cloud/validate-foundations.mjs`
- Create: `tests/cloud/cloud-foundations.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `validateFoundationSchemas(schemas): string[]` and CLI script `npm run check:cloud`.
- Consumes: parsed DB Schema JSON objects keyed by collection name.

- [x] **Step 1: Write failing validator behavior tests**

Use literal in-memory schema fixtures to prove the validator reports:

- Missing expected collection.
- Private project read/write permissions other than `false`.
- A public collection with create, update or delete permission.
- A public read expression missing any of `publish_status`, `license_status` or `review_status` approved checks.
- Missing provenance fields.
- Forbidden project fields such as `original_photo`, `original_photo_path`, `original_photo_bytes` or `export_file`.

- [x] **Step 2: Run validator tests and verify RED**

Run: `npm test -- tests/cloud/cloud-foundations.test.ts`

Expected: FAIL because the validator module does not exist.

- [x] **Step 3: Implement the minimal semantic validator**

Export:

```js
export const EXPECTED_COLLECTIONS = [
  "pindou-projects",
  "pindou-gallery-categories",
  "pindou-gallery-patterns",
  "pindou-diy-categories",
  "pindou-diy-elements",
];

export function validateFoundationSchemas(schemas) {
  const issues = [];
  // Deterministic checks described above.
  return issues;
}
```

Do not duplicate a full JSON Schema engine; validate only Pindou's security invariants.

- [x] **Step 4: Run validator tests and verify GREEN**

Run: `npm test -- tests/cloud/cloud-foundations.test.ts`

Expected: validator mutation cases PASS.

- [x] **Step 5: Add the five Pindou-owned DB Schemas**

Use `bsonType: "object"`, explicit `required` fields and `additionalProperties: false`. Private project permissions are all `false`. Public read permission is:

```text
doc.publish_status == 'published' && doc.license_status == 'approved' && doc.review_status == 'approved'
```

Public create, update and delete permissions are `false`. Public records require `creator`, `source_type`, `license_status`, `review_status`, `acquired_at`, `publish_status` and `order` plus their collection-specific data.

- [x] **Step 6: Add the executable repository validator**

`validate-foundations.mjs` loads exactly the five schema files, calls `validateFoundationSchemas`, prints each issue and exits `1` on failure or prints the validated collection count and exits `0` on success.

Add:

```json
"check:cloud": "node scripts/cloud/validate-foundations.mjs"
```

and include `npm run check:cloud` in the existing `check` script before the WeChat build.

- [x] **Step 7: Run repository validation and focused tests**

Run: `npm run check:cloud && npm test -- tests/cloud/cloud-foundations.test.ts`

Expected: five collections validated and all tests PASS.

---

### Task 3: Shared Cloud Safety Utilities

**Files:**
- Create: `uniCloud-aliyun/cloudfunctions/common/pindou-cloud-common/index.js`
- Create: `uniCloud-aliyun/cloudfunctions/common/pindou-cloud-common/package.json`
- Create: `tests/cloud/cloud-common.test.ts`

**Interfaces:**
- Produces: `COLLECTIONS`, `success(data)`, `failure(code)`, `toPublicFailure(error)`, `createIdentityResolver(checkToken)`.
- Consumes: an injected async `checkToken(token)` function that Milestone 5 will bind to uni-id-common.

- [x] **Step 1: Write failing cloud-common tests**

Load the CommonJS module with Node `createRequire`. Assert exact collection names, success/failure envelopes, internal-error sanitization, missing-token rejection and successful UID extraction from an injected token verifier. Also assert that the request body cannot supply or override the UID.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/cloud/cloud-common.test.ts`

Expected: FAIL because the common module does not exist.

- [x] **Step 3: Implement minimal pure utilities**

Use no logging, database calls or environment access. `createIdentityResolver` accepts only the token, calls the injected verifier and returns either `{ ok: true, data: { uid } }` or a stable public failure. Unexpected verifier errors become `INTERNAL_ERROR` without exposing the original message.

- [x] **Step 4: Run cloud-common tests and lint**

Run: `npm test -- tests/cloud/cloud-common.test.ts && npm run lint`

Expected: PASS.

---

### Task 4: Association Guide and Final Delivery

**Files:**
- Create: `docs/unicloud-aliyun-setup.md`
- Modify: `docs/superpowers/specs/2026-08-31-unicloud-foundations-design.md`
- Modify: `docs/superpowers/plans/2026-08-31-unicloud-foundations.md`

**Interfaces:**
- Consumes: the checked-in config example, schemas and validation command.
- Produces: a user-verifiable manual association and deployment checklist.

- [x] **Step 1: Write the setup guide**

Document these bounded steps:

1. Register/sign in to DCloud and complete required verification.
2. Create one Alibaba Cloud uniCloud development service space.
3. Associate `uniCloud-aliyun` with the space in HBuilderX.
4. After Milestone 5 installs the official uni-id configuration module, copy the values from `uniCloud-aliyun/config/uni-id.config.example.json` to the ignored official `config.json` and fill the DCloud AppID plus WeChat AppID/AppSecret.
5. Upload DB Schemas and later cloud modules using the official tool workflow.
6. Run `npm run check:cloud` before upload.

State clearly that local files do not prove a cloud deployment and that the user must confirm the tool reports upload success.

- [x] **Step 2: Mark the written spec approved**

Change status to `Approved for implementation`.

- [x] **Step 3: Run the complete quality gate**

Run: `npm run check`

Expected: all Vitest tests, cloud foundation validation, lint, TypeScript and WeChat production build PASS.

- [x] **Step 4: Run H5 production build**

Run: `npm run build:h5`

Expected: exit `0`.

- [x] **Step 5: Review, commit, tag and push**

Run `git diff --check`, inspect every Milestone 4 file and confirm `.superpowers/` is not staged.

Commit: `feat: establish milestone 4 unicloud foundations`

Tag: `milestone-04-unicloud-foundations`

Push `main` and the tag, then verify both remote refs point to the new commit.
