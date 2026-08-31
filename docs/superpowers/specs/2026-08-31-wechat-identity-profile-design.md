# Milestone 5 WeChat Identity and Profile Design

**Status:** Approved in conversation; awaiting written-spec review

**Date:** 2026-08-31

**Parent specifications:**

- `docs/superpowers/specs/2026-08-29-pindou-mvp-design.md`
- `docs/superpowers/specs/2026-08-31-unicloud-foundations-design.md`

## 1. Decision

Pindou will use the official `uni-id-co`, `uni-id-common` and `uni-config-center` modules for WeChat Mini Program identity. Pindou will provide its own UI and a platform-independent identity service rather than importing the full `uni-id-pages` interface.

The first cloud-project action is protected by a Pindou consent gate. Identity is optional for local generation, editing and export. Avatar and nickname are optional profile fields and are never prerequisites for cloud-project access.

## 2. Milestone Scope

Milestone 5 implements:

- Guest, signing-in, authenticated and recoverable-error identity states.
- A consent explanation before the first cloud-project login attempt.
- WeChat code login through official uni-id modules.
- Local token persistence, session restoration, expiry handling and logout.
- Optional nickname and avatar editing from the My page.
- A protected profile cloud object that derives the user ID from verified identity.
- Platform-safe behavior for H5 and App builds without configured login providers.
- Deployment instructions for official modules and local secret configuration.

It does not implement cloud-project creation, update, deletion or listing. After authentication, unfinished cloud-project actions report that the identity is ready and the cloud-project feature is not yet available; they never report a false save or load success.

## 3. Architecture

### 3.1 Domain identity contract

`src/domain/identity` contains framework-independent types and contracts:

- `IdentityUser`: stable `uid`, optional `nickname` and optional `avatarUrl`.
- `IdentitySession`: authenticated user plus token expiry metadata.
- `IdentityStatus`: `guest`, `restoring`, `signing-in`, `authenticated` or `error`.
- `IdentityFailureCode`: `USER_CANCELLED`, `PLATFORM_UNSUPPORTED`, `CLOUD_NOT_CONFIGURED`, `LOGIN_FAILED`, `SESSION_EXPIRED`, `INVALID_PROFILE` or `INTERNAL_ERROR`.
- `IdentityService`: restore, sign in with the active platform, update profile and sign out.

The domain contract does not import Vue, uni-app, uniCloud or uni-id.

### 3.2 Client adapter

`src/adapters/identity` implements the contract. It owns calls to `uni.login`, `uniCloud.importObject`, local storage and platform conditionals. Page components and domain modules cannot call uniCloud or uni-id directly.

The WeChat adapter passes only the temporary login code to `uni-id-co`. The adapter persists the official token and expiry value under Pindou-owned storage keys. It never persists an AppSecret or accepts a UID supplied by a page.

On H5 or App without an explicitly configured login provider, the adapter returns `PLATFORM_UNSUPPORTED`. Local features and production builds remain available.

### 3.3 Identity state

A small application-level identity store owns the current snapshot and prevents pages from implementing separate session logic. Initialization restores local session metadata without opening a consent dialog or making an automatic cloud request.

The store exposes commands for consented login, profile update and logout. Concurrent login requests share one in-flight operation so repeated taps do not create duplicate sessions.

### 3.4 Cloud modules

Official DCloud modules remain the source of truth for token creation and validation. Pindou does not implement password hashing, token signing or WeChat code exchange.

The `pindou-profile` cloud object:

- Obtains the token from the cloud request context.
- Uses `uni-id-common` to validate it.
- Derives `uid` only from the successful validation result.
- Reads and updates only the authenticated user's profile fields.
- Never accepts a client-provided UID.
- Returns stable public error envelopes without SDK errors or stack traces.

## 4. Consent and Login Flow

Cloud-save and cloud-project-list entry points use this sequence:

1. If a valid authenticated session exists, continue to the requested feature boundary.
2. Otherwise show a Pindou explanation: login identifies the user's cloud projects; original photos are not uploaded by login.
3. If the user cancels, return to the current page as a guest with no error toast and no cloud request.
4. If the user agrees, call `uni.login` for the WeChat provider.
5. Pass the temporary code to the official uni-id login action.
6. Store the returned token, expiry and minimal user snapshot.
7. Continue to the feature boundary. In Milestone 5 this boundary displays an explicit not-yet-available message because cloud-project CRUD is outside scope.

Login itself does not request or require an avatar or nickname.

## 5. Session Lifecycle

- Application startup reads only local session metadata.
- A locally unexpired session restores the authenticated UI without an automatic cloud call.
- Before a protected cloud call, the adapter relies on the server to validate the token.
- An expired or rejected token clears the local session and returns `SESSION_EXPIRED`.
- Reauthorization is requested only when the user next invokes a protected cloud action.
- Logout clears Pindou's local identity keys and returns the UI to guest state.
- Logout does not delete the uni-id user, profile or future cloud projects.

## 6. Optional Profile Editing

The My page exposes profile editing only after login:

- Nickname uses the WeChat Mini Program nickname input capability where available.
- Avatar uses the WeChat Mini Program avatar selection capability where available.
- The user sees a local preview and must press Save before any upload occurs.
- Empty nickname means unset. A non-empty normalized nickname is 1 to 20 Unicode code points.
- The cloud object accepts JPEG or PNG avatar bytes up to 1 MiB and rejects other content.
- Avatar content is transmitted only for this explicit profile action and stored under an authenticated-user-owned cloud path.
- The profile record stores only the resulting cloud file reference, not base64 content.
- If neither field is set, the UI shows the default avatar and localized name `拼豆朋友`.

Profile editing is unavailable on platforms without a supported picker in this milestone. This does not block authentication or local features.

## 7. User Interface Changes

The existing visual system remains unchanged.

- The My page replaces the static guest card with state-driven guest, busy, authenticated and error presentations.
- Guest users see a login button with concise privacy copy.
- Authenticated users see their optional avatar and nickname, an Edit Profile action and Logout.
- The create-page cloud card invokes the same consented identity command as the My page.
- Buttons disable while their action is in progress.
- Cancellation is silent; actionable failures use short Chinese messages and a retry path.

No new navigation hierarchy or unrelated page redesign is introduced.

## 8. Error Mapping

Client-visible behavior is deterministic:

- User declines the Pindou explanation: `USER_CANCELLED`, handled silently.
- Platform has no configured provider: `PLATFORM_UNSUPPORTED`.
- uniCloud association or official module is missing: `CLOUD_NOT_CONFIGURED`.
- WeChat or uni-id rejects login: `LOGIN_FAILED`.
- Server rejects a token: `SESSION_EXPIRED`, followed by local session cleanup.
- Nickname or avatar fails validation: `INVALID_PROFILE`.
- Unexpected internal failure: `INTERNAL_ERROR`.

Client responses never expose AppSecret values, service-space IDs, tokens, SDK payloads, database queries or stack traces.

## 9. Security and Privacy Boundaries

- The real uni-id configuration stays at the ignored path defined in Milestone 4.
- Git contains only unmistakable placeholders.
- WeChat AppSecret exists only in the local/deployed server configuration.
- Tokens are never logged or embedded in URLs.
- UID is always derived from verified uni-id context on protected cloud operations.
- Login does not upload original creation photos, project payloads or exports.
- Profile upload accepts only the explicit avatar payload and applies type and size limits server-side.
- Direct client writes to `uni-id-users` remain disallowed; the protected cloud object performs bounded updates.

## 10. Official Module and Deployment Boundary

The repository will contain the official uni-id modules required to deploy Milestone 5 and Pindou-owned adapter/cloud code. Account-bound values remain local.

Real integration requires the user to:

1. Associate `uniCloud-aliyun` with an Alibaba Cloud-backed uniCloud service space in HBuilderX.
2. Set the DCloud application ID and WeChat Mini Program AppID in the project manifest.
3. Copy the example uni-id values into the ignored official configuration and enter the WeChat AppID and AppSecret locally.
4. Upload official common modules, `uni-id-co`, `pindou-profile` and required DB Schemas.
5. Confirm HBuilderX or the uniCloud console reports successful deployment.

Local tests and builds do not prove real WeChat code exchange or cloud deployment. Those are reported separately after signed-in manual acceptance.

## 11. Testing

Automated tests cover:

- Domain identity types and profile validation without platform imports.
- Guest initialization and local session restoration.
- Consent cancellation without a platform or cloud call.
- Successful login persistence.
- Login failure, unsupported platform and cloud-not-configured mapping.
- Expired-session cleanup and retry eligibility.
- Logout clearing only Pindou identity keys.
- UID injection being ignored by protected profile operations.
- Nickname normalization and avatar type/size rejection.
- Pages and domain modules remaining free of direct uniCloud and uni-id imports.
- Existing tests, lint, type checking, cloud-foundation validation and both WeChat/H5 builds remaining green.

Manual acceptance in WeChat Developer Tools verifies the consent dialog, successful first login, session restoration, optional profile save, logout and reauthorization after expiry or logout.

## 12. Completion Boundary

Milestone 5 code is complete when the approved identity and profile behavior passes automated review, is committed, tagged `milestone-05-wechat-identity-profile` and pushed to GitHub.

Cloud integration is complete only after the user associates and deploys the modules with their signed-in DCloud session and the manual acceptance flow succeeds. If account association is pending, the code milestone may be complete while deployment remains explicitly pending.
