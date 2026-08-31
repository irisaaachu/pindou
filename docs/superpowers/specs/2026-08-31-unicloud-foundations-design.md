# Milestone 4 uniCloud Foundations Design

**Status:** Approved in conversation; awaiting written-spec review

**Date:** 2026-08-31

**Parent specification:** `docs/superpowers/specs/2026-08-29-pindou-mvp-design.md`

## 1. Decision

Pindou will use Alibaba Cloud-backed uniCloud and the uni-id identity system. Cloud source lives under `uniCloud-aliyun`. The service space is created and managed through the DCloud uniCloud console; the user does not deploy or operate a separate traditional backend server.

The domain model and ports created in Milestone 3 remain independent of uniCloud. Client and cloud adapters may depend on uniCloud, while `src/domain` and page components do not.

## 2. Milestone Scope

Milestone 4 establishes cloud and content-security foundations only:

- The `uniCloud-aliyun` project layout.
- Database collection schemas and default-deny permissions.
- A non-secret uni-id configuration template.
- Content provenance, licensing and review contracts.
- Local validation tools for schema, permissions and secret hygiene.
- A documented service-space association and schema-upload workflow.

It does not implement a login page, profile editing, cloud project CRUD, gallery loading, DIY loading, content import or generated exports. Those remain in later milestones.

## 3. Service-Space and Configuration Boundary

The repository contains deployable cloud source but no account-bound service-space metadata. The developer creates an Alibaba Cloud uniCloud service space through DCloud and associates the `uniCloud-aliyun` directory using HBuilderX or the uniCloud console workflow.

The committed uni-id configuration is an example template only. The real configuration is developer-local or deployed through the cloud configuration workflow and includes:

- DCloud application ID.
- WeChat Mini Program AppID.
- WeChat Mini Program AppSecret.
- Token expiry and other identity settings when Milestone 5 enables login.

The real WeChat AppSecret, cloud space ID, client secret, access keys and tokens are never committed.

## 4. Identity Boundary

Milestone 5 will use `uni-id-co` for WeChat Mini Program identity. The client obtains a temporary WeChat login code through `uni.login`; the cloud identity object exchanges and validates that code using server-side credentials.

Page components do not handle tokens or call `uni-id-co` directly. A client identity adapter owns those details. Avatar and nickname remain optional profile fields and are not prerequisites for cloud project access.

Pindou still presents an explicit consent gate before the first cloud-project list or cloud-save request. If the user refuses, no project data is uploaded and all local creation, editing and export behavior remains available.

## 5. Database Collections

Milestone 4 defines these collections:

### 5.1 `uni-id-users`

The standard uni-id user collection is the identity source. Pindou does not create a parallel password or identity table. Optional avatar and nickname data may be stored through the standard profile fields in Milestone 5.

### 5.2 `pindou-projects`

Stores private cloud project copies and low-resolution preview references. Required lifecycle fields include:

- Owner user ID derived from authenticated uni-id context.
- Stable project ID and project-format version.
- User-editable name.
- Source type.
- Serialized, validated project payload.
- Creation, first-upload and latest-update timestamps.

Original photos and generated export files are prohibited.

### 5.3 Public Content Collections

- `pindou-gallery-categories`
- `pindou-gallery-patterns`
- `pindou-diy-categories`
- `pindou-diy-elements`

Ordinary clients may read only published content. Ordinary clients cannot create, update or delete public content.

Each publishable pattern or element records creator, source type, optional source reference, license status, review status and creation/acquisition date. Publication requires approved license and review states.

## 6. DB Schema Permissions

Permissions follow default denial:

- Direct client reads and writes to `pindou-projects` are denied in Milestone 4.
- Later project access goes through a cloud object that validates uni-id identity and ownership server-side.
- Public collections permit client reads only when publication, license and review states are approved.
- Direct client creates, updates and deletes on public collections are denied.
- Collections without an explicit checked-in permission remain inaccessible to ordinary clients.

All database access that relies on DB Schema uses JQL so validation and permission rules are applied. A rule is never loosened merely to simplify local development.

## 7. Content-Security Contract

Published gallery patterns and DIY elements require:

- Stable content ID and version.
- Creator identity or organization.
- Source type: original, commissioned or licensed.
- Source reference when applicable.
- License status.
- Copyright-review status.
- Creation or acquisition date.
- Publication state and ordering.

Only independently created or verified usable content can reach `published`. Recognizable unauthorized character names, logos, slogans, signature silhouettes or confusingly similar presentations are rejected by the content-validation workflow.

## 8. Cloud Code Boundary

Milestone 4 adds only the minimal shared cloud foundation needed by later cloud objects:

- Stable success and error envelopes.
- Retrieval of authenticated uni-id context.
- Safe public error mapping without internal stack traces or credentials.
- Shared collection-name constants.

No speculative project service or gallery API is implemented in this milestone. Shared cloud code does not log project payloads, images, tokens, secrets or unnecessary personal data.

## 9. Portability Boundary

- `src/domain` cannot import `uniCloud`, `uni-id`, Vue or platform APIs.
- Page components cannot call `uniCloud` or `uni-id-co` directly.
- Later client adapters implement the Milestone 3 repositories.
- Future H5 and App clients can use the same uniCloud backend with platform-appropriate identity configuration.
- The versioned project document remains unchanged by the backend choice.

## 10. Secrets and Repository Hygiene

The repository may contain collection schemas, safe constants and example configuration. It must not contain:

- WeChat AppSecret.
- Alibaba Cloud or uniCloud service-space secrets.
- Access keys, private keys or session tokens.
- Real production user or project data.
- Original user photos.
- Generated export files uploaded as fixtures.

Example secrets use unmistakable placeholder values and cannot be imported as a working production configuration by mistake.

## 11. Error Handling

Cloud foundations reserve stable adapter-facing error codes:

- `CLOUD_NOT_CONFIGURED`
- `IDENTITY_REQUIRED`
- `PERMISSION_DENIED`
- `INVALID_REQUEST`
- `INTERNAL_ERROR`

Client responses do not expose stack traces, database queries, service-space IDs or third-party SDK errors.

## 12. Testing and Acceptance

Automated checks cover:

- Every expected collection has a checked-in schema.
- Private project permissions deny direct client access.
- Public content writes are denied and reads require approved publication, license and review states.
- Project schemas exclude original-photo and generated-export fields.
- Content schemas require provenance and review metadata.
- No domain or page file imports uniCloud or uni-id APIs.
- No tracked configuration contains secret-shaped real values.
- Existing unit, lint, type and WeChat production-build checks remain green.

Manual acceptance requires:

- The user signs in to a DCloud account and creates or selects an Alibaba Cloud uniCloud service space.
- The `uniCloud-aliyun` directory is associated with that service space.
- Schema and cloud-module upload steps are documented, but no real deployment is claimed until the relevant console or development tool reports success.

## 13. Completion Boundary

Milestone 4 is complete when the local cloud foundation, schemas, permission checks, secret-hygiene tests and association guide pass review, and the implementation is committed, tagged `milestone-04-unicloud-foundations` and pushed to GitHub. Association with the user's real service space is reported separately because it requires their signed-in DCloud session.
