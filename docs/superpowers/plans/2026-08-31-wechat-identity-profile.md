# Milestone 5 WeChat Identity and Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consent-gated WeChat Mini Program identity, restorable uni-id sessions, logout and optional nickname/avatar profiles without coupling pages or domain code to uniCloud.

**Architecture:** Framework-free identity contracts feed a small application controller. A uniCloud adapter owns `uni.login`, official `uni-id-co` calls and SDK storage, while a protected `pindou-profile` cloud object derives UID from `uni-id-common`. Vue pages consume one reactive runtime facade and retain platform-safe H5/App behavior.

**Tech Stack:** uni-app Vue 3, TypeScript 4.9, Vue reactivity, Vitest 1.6, uniCloud Alibaba, official uni-id-co/uni-id-common/uni-config-center, Node.js CommonJS cloud objects

**Spec:** `docs/superpowers/specs/2026-08-31-wechat-identity-profile-design.md`

## Global Constraints

- Only WeChat Mini Program login is enabled in this milestone.
- Local generation, editing and export never require identity.
- The consent explanation appears before an unauthenticated cloud-project action; cancellation makes no platform or cloud call.
- Avatar and nickname are optional and never block identity or cloud-project access.
- Pages and `src/domain` cannot import or call uniCloud or uni-id directly.
- The SDK-owned `uni_id_token` and `uni_id_token_expired` keys remain the official token store; Pindou stores only a minimal display snapshot under `pindou_identity_snapshot_v1`.
- UID is derived only from a successful server-side token check.
- Real DCloud AppID, WeChat AppID, AppSecret, space ID, client secret and tokens are never committed.
- Cloud-project CRUD remains outside scope and must never report a false save or list success.
- H5 and App builds remain usable and return `PLATFORM_UNSUPPORTED` for identity until providers are configured.
- `.superpowers/` remains local and is never staged.

---

### Task 1: Framework-Free Identity Contract and Profile Validation

**Files:**
- Create: `src/domain/identity/types.ts`
- Create: `src/domain/identity/service.ts`
- Create: `src/domain/identity/profile.ts`
- Create: `src/domain/identity/index.ts`
- Create: `tests/identity/profile-validation.test.ts`

**Interfaces:**
- Produces: `IdentityUser`, `IdentitySession`, `IdentityState`, `IdentityFailureCode`, `IdentityResult<T>`, `ProfileDraft`, `IdentityService`, `normalizeNickname(value)` and `validateProfileDraft(draft)`.
- Consumes: no Vue, uni-app, uniCloud or uni-id APIs.

- [ ] **Step 1: Write failing profile behavior tests**

Create literal cases proving:

```ts
expect(normalizeNickname("  小 豆  ")).toBe("小 豆");
expect(validateProfileDraft({ nickname: "", avatar: null })).toEqual({
  ok: true,
  data: { nickname: undefined, avatar: undefined },
});
expect(validateProfileDraft({ nickname: "豆".repeat(21), avatar: null })).toEqual({
  ok: false,
  error: { code: "INVALID_PROFILE" },
});
expect(validateProfileDraft({
  nickname: "Pindou",
  avatar: { mimeType: "image/gif", size: 30, base64: "R0lGODlh" },
})).toEqual({ ok: false, error: { code: "INVALID_PROFILE" } });
```

Avatar validation accepts only `image/jpeg` or `image/png`, non-empty base64 and byte sizes from 1 through 1,048,576.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/identity/profile-validation.test.ts`

Expected: FAIL because `src/domain/identity` does not exist.

- [ ] **Step 3: Add exact domain contracts**

Define:

```ts
export type IdentityFailureCode =
  | "USER_CANCELLED"
  | "PLATFORM_UNSUPPORTED"
  | "CLOUD_NOT_CONFIGURED"
  | "LOGIN_FAILED"
  | "SESSION_EXPIRED"
  | "INVALID_PROFILE"
  | "INTERNAL_ERROR";

export interface IdentityUser {
  uid: string;
  nickname?: string;
  avatarUrl?: string;
}

export interface IdentitySession {
  user: IdentityUser;
  expiresAt: number;
}

export interface ProfileDraft {
  nickname: string;
  avatar: null | { mimeType: "image/jpeg" | "image/png" | string; size: number; base64: string };
}

export type IdentityResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: IdentityFailureCode } };

export interface IdentityService {
  restore(): Promise<IdentityResult<IdentitySession | null>>;
  signIn(): Promise<IdentityResult<IdentitySession>>;
  updateProfile(draft: ProfileDraft): Promise<IdentityResult<IdentityUser>>;
  signOut(): Promise<void>;
}
```

`IdentityState` has `status`, `session` and `failure`; its status union is `guest | restoring | signing-in | authenticated | error`.

- [ ] **Step 4: Implement minimal normalization and validation**

Trim leading/trailing whitespace, collapse internal whitespace to one space, count Unicode code points with `Array.from`, treat an empty nickname as unset and validate avatar metadata without decoding it in domain code.

- [ ] **Step 5: Run focused tests, lint and type checking**

Run: `npm test -- tests/identity/profile-validation.test.ts && npm run lint && npm run type-check`

Expected: all commands exit `0`.

---

### Task 2: Consent-Gated Identity Controller

**Files:**
- Create: `src/application/identity/controller.ts`
- Create: `src/application/identity/index.ts`
- Create: `tests/identity/identity-controller.test.ts`

**Interfaces:**
- Consumes: `IdentityService`, `IdentityState`, `IdentityResult`, `ProfileDraft` from Task 1 and an injected `confirmConsent(): Promise<boolean>`.
- Produces: `createIdentityController(service, state)` with `initialize()`, `requestAuthenticatedAccess(confirmConsent)`, `saveProfile(draft)` and `logout()`.

- [ ] **Step 1: Write failing controller tests**

Use small behavior fakes and literal outcomes to prove:

- `initialize()` maps `restore(null)` to `guest` without calling `signIn`.
- A restored session maps to `authenticated`.
- Consent rejection returns `USER_CANCELLED`, leaves `guest` and never calls `signIn`.
- Consent approval calls `signIn` once and stores the authenticated session.
- Two simultaneous access requests share one in-flight login.
- `SESSION_EXPIRED` clears the session and returns `guest` with the failure available for retry messaging.
- `logout()` invokes service logout, clears only identity state and returns `guest`.
- Profile success replaces only the authenticated user fields.

The cancellation assertion must observe the controller result and service call count; it must not assert only that a mock exists.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/identity/identity-controller.test.ts`

Expected: FAIL because the controller module does not exist.

- [ ] **Step 3: Implement the minimal state machine**

Mutate the provided state object in place so the same controller works with a plain test object and a Vue `reactive` object. Keep one private `loginPromise`; clear it in `finally`. Return existing authenticated sessions without asking for consent again.

- [ ] **Step 4: Run controller and domain tests**

Run: `npm test -- tests/identity/identity-controller.test.ts tests/identity/profile-validation.test.ts`

Expected: all cases PASS.

---

### Task 3: uniCloud Identity Adapter and SDK Storage Boundary

**Files:**
- Create: `src/adapters/identity/platform.ts`
- Create: `src/adapters/identity/uni-cloud-identity-service.ts`
- Create: `src/adapters/identity/index.ts`
- Create: `tests/identity/uni-cloud-identity-service.test.ts`

**Interfaces:**
- Consumes: Task 1 `IdentityService` and injected `IdentityPlatformDependencies`.
- Produces: `createUniCloudIdentityService(dependencies): IdentityService` and stable external-error mapping.

Define the dependency boundary:

```ts
export interface IdentityPlatformDependencies {
  platform: "mp-weixin" | "h5" | "app" | "other";
  now(): number;
  loginWeixin(): Promise<{ code: string }>;
  loginByWeixin(code: string): Promise<{ errCode: string | number; newToken?: { token: string; tokenExpired: number } }>;
  getProfile(): Promise<{ ok: boolean; data?: { uid: string; nickname?: string; avatarUrl?: string }; error?: { code: string } }>;
  updateProfile(draft: ProfileDraft): Promise<{ ok: boolean; data?: IdentityUser; error?: { code: string } }>;
  readStorage(key: string): unknown;
  writeStorage(key: string, value: unknown): void;
  removeStorage(key: string): void;
}
```

- [ ] **Step 1: Write failing adapter tests**

Prove these real adapter outcomes:

- H5/App returns `PLATFORM_UNSUPPORTED` without invoking `loginWeixin` or cloud dependencies.
- An unexpired standard uni-id token plus valid Pindou snapshot restores a session.
- Missing, malformed or expired token metadata clears `uni_id_token`, `uni_id_token_expired` and `pindou_identity_snapshot_v1` and restores as guest.
- WeChat login calls `loginByWeixin` with the exact temporary code, then calls `getProfile`; it never constructs a UID from client input.
- Login saves only the minimal snapshot itself; official token persistence is left to the uniCloud SDK response handling.
- Cloud import/missing-space failures map to `CLOUD_NOT_CONFIGURED` and other rejected login responses map to `LOGIN_FAILED`.
- Logout removes only the two standard uni-id keys and the Pindou snapshot.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/identity/uni-cloud-identity-service.test.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the pure adapter**

Use the injected dependencies only. Treat `uni_id_token_expired` as epoch milliseconds. Never log raw responses. After `loginByWeixin`, require the SDK-managed token metadata and call `pindou-profile.getProfile()` to obtain the verified UID and profile.

- [ ] **Step 4: Add the runtime platform dependency factory**

Under `#ifdef MP-WEIXIN`, wrap `uni.login({ provider: "weixin" })`, `uniCloud.importObject("uni-id-co").loginByWeixin({ code })` and `uniCloud.importObject("pindou-profile")`. Under other platform branches, expose `platform` but make login dependencies reject with the adapter's unsupported path. Use `uni.getStorageSync`, `uni.setStorageSync` and `uni.removeStorageSync` only in this file.

- [ ] **Step 5: Run adapter tests, lint and type checking**

Run: `npm test -- tests/identity/uni-cloud-identity-service.test.ts && npm run lint && npm run type-check`

Expected: all commands exit `0`.

---

### Task 4: Protected Profile Cloud Object

**Files:**
- Create: `uniCloud-aliyun/cloudfunctions/pindou-profile/profile-core.js`
- Create: `uniCloud-aliyun/cloudfunctions/pindou-profile/index.obj.js`
- Create: `uniCloud-aliyun/cloudfunctions/pindou-profile/package.json`
- Create: `tests/cloud/profile-core.test.ts`
- Modify: `uniCloud-aliyun/cloudfunctions/common/pindou-cloud-common/index.js`
- Modify: `tests/cloud/cloud-common.test.ts`

**Interfaces:**
- Consumes: `uni-id-common.createInstance({ clientInfo })`, `this.getUniIdToken()`, `pindou-cloud-common` envelopes and the `uni-id-users` collection.
- Produces: `pindou-profile.getProfile()` and `pindou-profile.updateProfile({ nickname, avatar })`; pure exports `normalizeCloudNickname`, `decodeAvatar`, `buildProfileUpdate` for Node tests.

- [ ] **Step 1: Write failing cloud-core tests**

Use real base64 fixtures for a minimal JPEG header and PNG signature. Prove:

- Nickname normalization matches the domain contract and rejects 21 code points.
- GIF, empty data, declared sizes over 1 MiB and signature/mime mismatches return `INVALID_PROFILE`.
- A valid JPEG or PNG produces a Buffer and a fixed extension.
- `buildProfileUpdate` includes no `_id`, `uid`, token or unapproved field.
- An empty normalized nickname produces a `clearNickname` instruction so an existing optional nickname can be removed deliberately.
- Identity resolution ignores a second client-supplied UID argument.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/cloud/profile-core.test.ts tests/cloud/cloud-common.test.ts`

Expected: FAIL because `pindou-profile` does not exist.

- [ ] **Step 3: Implement the pure validation core**

Decode base64 once, compare the decoded byte count with the declared size, check JPEG bytes `FF D8 FF` or PNG bytes `89 50 4E 47 0D 0A 1A 0A`, and return only sanitized nickname/avatar metadata. Represent an explicitly empty nickname as `clearNickname: true`; the cloud wrapper converts that flag to `db.command.remove()` and never stores the control flag.

- [ ] **Step 4: Implement authenticated cloud-object methods**

In `_before`, create the uni-id instance from `this.getClientInfo()`, obtain the token with `this.getUniIdToken()`, call `checkToken(token)` and store only the verified UID. `getProfile()` queries `uni-id-users.doc(uid)` and returns UID, optional nickname and a temporary avatar URL. `updateProfile()` validates input, uploads avatar bytes on the server to `pindou/avatars/<verified-uid>/profile.<ext>` with `cloudPathAsRealPath: true`, stores the resulting file ID, and updates only `nickname` and `avatar`.

No method accepts a UID parameter. Map missing/invalid tokens to `IDENTITY_REQUIRED`, malformed profiles to `INVALID_REQUEST`/`INVALID_PROFILE`, and unexpected errors to `INTERNAL_ERROR` without returning the caught message.

- [ ] **Step 5: Declare exact cloud dependencies**

`package.json` is private and declares `uni-id-common` and `pindou-cloud-common` as cloud common-module dependencies using the dependency format present in the imported official module. Do not add registry packages for modules supplied by uniCloud common directories.

- [ ] **Step 6: Run cloud tests and cloud foundation validation**

Run: `npm test -- tests/cloud/profile-core.test.ts tests/cloud/cloud-common.test.ts && npm run check:cloud && npm run lint`

Expected: all commands exit `0`.

---

### Task 5: Reactive Runtime, Consent UI and Optional Profile Editor

**Files:**
- Create: `src/application/identity/runtime.ts`
- Create: `src/application/identity/presentation.ts`
- Create: `src/components/identity/ConsentDialog.vue`
- Create: `src/components/identity/ProfileEditor.vue`
- Modify: `src/main.ts`
- Modify: `src/pages/my/index.vue`
- Modify: `src/pages/create/index.vue`
- Create: `tests/identity/identity-ui-contract.test.ts`

**Interfaces:**
- Consumes: Tasks 1-3 controller and adapter.
- Produces: singleton `identityRuntime` with reactive `state`, `initialize`, `requestCloudAccess`, `saveProfile` and `logout`; UI emits `confirm`, `cancel`, `save` and `close`.

- [ ] **Step 1: Write failing UI contract tests**

Render-free tests exercise the real runtime facade and presentation state rather than grepping Vue source or asserting CSS text. Prove:

- `requestCloudAccess` returns immediately for an authenticated session.
- Guest access opens the consent state before controller login.
- Cancelling closes consent and leaves guest state without a service call.
- Profile Save cannot run while logged out or while a save is already in progress.
- A successful profile save closes the editor and updates the displayed user.

Keep wording assertions limited to the user-visible privacy statement that original creation photos are not uploaded by login.

- [ ] **Step 2: Run focused test and verify RED**

Run: `npm test -- tests/identity/identity-ui-contract.test.ts`

Expected: FAIL because the runtime and components do not exist.

- [ ] **Step 3: Create the reactive runtime**

Wrap one `IdentityState` in Vue `reactive`, construct the controller once, and initialize it from `src/main.ts` without blocking app creation. Keep consent visibility and profile-editor visibility in the runtime facade so pages do not duplicate flow logic. Put stable Chinese status labels and privacy copy in `presentation.ts`; both pages consume the same runtime methods and presentation values.

- [ ] **Step 4: Implement the consent dialog**

Use the existing warm off-white, blush, mint, rounded-card and typography tokens. The dialog explains that login identifies cloud works and does not upload original creation photos. It has `同意并继续` and `暂不登录`; cancellation is silent.

- [ ] **Step 5: Implement the profile editor**

For MP-WEIXIN, use a button with `open-type="chooseAvatar"` and an input with `type="nickname"`. Read the chosen temporary avatar as base64 in the runtime/platform helper, use `uni.getFileInfo` for byte size, derive JPEG/PNG MIME type from the decoded signature, pass those values through `ProfileDraft`, show a local preview, and upload only after `保存资料`. Other platforms show the default profile and a concise unsupported note without invoking pickers.

- [ ] **Step 6: Replace static page states surgically**

My page renders guest, busy, authenticated and error states without changing unrelated privacy/about rows. Create page makes the cloud card actionable. After identity success it displays `身份已就绪，云作品将在后续版本开放` and does not claim data was saved or loaded.

- [ ] **Step 7: Run identity tests and both production builds**

Run: `npm test -- tests/identity && npm run lint && npm run type-check && npm run build:mp-weixin && npm run build:h5`

Expected: all commands exit `0`; H5 does not attempt a WeChat login at build or startup.

---

### Task 6: Official uni-id Cloud Assets, Security Validation and Deployment Guide

**Files:**
- Create from official source: `uniCloud-aliyun/cloudfunctions/uni-id-co/**`
- Create from official source: `uniCloud-aliyun/cloudfunctions/common/uni-id-common/**`
- Create from official source: `uniCloud-aliyun/cloudfunctions/common/uni-config-center/**` except ignored real `uni-id/config.json`
- Create from official source as required by declared dependencies: `uniCloud-aliyun/cloudfunctions/common/uni-open-bridge-common/**`
- Create from official source: contents of `uni_modules/uni-id-pages/uniCloud/database/**` under `uniCloud-aliyun/database/`
- Create: `docs/vendor/dcloud-uni-id.md`
- Modify: `scripts/cloud/validate-foundations.mjs`
- Modify: `tests/cloud/cloud-config.test.ts`
- Modify: `docs/unicloud-aliyun-setup.md`
- Modify: `docs/superpowers/specs/2026-08-31-wechat-identity-profile-design.md`
- Modify: `docs/superpowers/plans/2026-08-31-wechat-identity-profile.md`

**Interfaces:**
- Consumes: official DCloud source repository `https://gitcode.com/dcloud/hello_uni-id-pages.git` and Milestone 4 config example.
- Produces: deployable official cloud dependencies, provenance record, stronger repository validation and an exact manual acceptance checklist.

- [ ] **Step 1: Add a failing official-module validation test**

Extend configuration tests to load official package metadata and assert that:

- `uni-id-co`, `uni-id-common`, `uni-config-center` and `uni-open-bridge-common` deployable roots exist.
- Their package metadata names match their directory names.
- The real `uni-config-center/uni-id/config.json` remains ignored and untracked.
- No imported official file contains a real Pindou AppID or AppSecret.
- `docs/vendor/dcloud-uni-id.md` records the upstream URL, resolved full commit SHA, imported paths and upstream license files.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/cloud/cloud-config.test.ts`

Expected: FAIL because official module roots and provenance record are absent.

- [ ] **Step 3: Import only deployable official cloud assets**

Clone the official repository to a temporary directory, resolve its current `dev` HEAD to a full SHA, and copy:

- `uni_modules/uni-id-pages/uniCloud/cloudfunctions/uni-id-co`
- `uni_modules/uni-id-common/uniCloud/cloudfunctions/common/uni-id-common`
- `uni_modules/uni-config-center/uniCloud/cloudfunctions/common/uni-config-center`
- `uni_modules/uni-open-bridge-common/uniCloud/cloudfunctions/common/uni-open-bridge-common`
- `uni_modules/uni-id-pages/uniCloud/database/**`
- every upstream license file governing the copied paths

Do not copy the `uni-id-pages` UI, demo pages, build output, account configuration or sample user data. Restore the ignored local `config.json` only from the Pindou example after copying so Git never sees upstream/sample credentials as a deployable configuration.

- [ ] **Step 4: Record provenance and validate dependency closure**

Write `docs/vendor/dcloud-uni-id.md` with the exact full SHA and file mapping. Recursively inspect the copied cloud `package.json` files and ensure every declared uniCloud common dependency has a copied root. Run each cloud object's required `npm install` only when it declares registry dependencies; never edit upstream source to silence an install error.

- [ ] **Step 5: Extend the executable cloud check**

Keep the five Pindou collection checks and add deterministic checks for required official roots, Pindou profile object files and the ignored secret path. The validator reports paths only, never file contents from real ignored configuration.

- [ ] **Step 6: Update deployment documentation**

Document the exact HBuilderX order:

1. Pull the Milestone 5 commit.
2. Associate `uniCloud-aliyun` with the Alibaba Cloud service space.
3. Set DCloud AppID and WeChat Mini Program AppID in `src/manifest.json` locally through HBuilderX.
4. Create ignored `uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json` from the independent example and enter WeChat AppID/AppSecret locally.
5. Upload DB Schemas, official common modules, `uni-id-co` and `pindou-profile`.
6. Confirm every upload succeeds before running the login flow in WeChat Developer Tools.

State that actual AppID/AppSecret entry and signed-in deployment remain the user's local step and are not complete merely because GitHub contains code.

- [ ] **Step 7: Mark the written spec implemented and the plan complete**

Change the spec status to `Implemented locally; cloud deployment pending user association` until manual cloud verification succeeds. Check each completed plan box only after its command/result has been observed.

- [ ] **Step 8: Run the complete quality gate**

Run: `npm run check && npm run build:h5`

Expected: 0 test failures; lint, type check, cloud validation, WeChat build and H5 build all exit `0`.

- [ ] **Step 9: Review, commit, tag and push**

Run `git diff --check`, inspect every staged file, scan for secrets and confirm `.superpowers/` is not staged.

Commit: `feat: add milestone 5 wechat identity and profile`

Tag: `milestone-05-wechat-identity-profile`

Push `main` and the tag. Verify remote `main` and the dereferenced tag both point to the new commit. Report code completion and real cloud-deployment status separately.
