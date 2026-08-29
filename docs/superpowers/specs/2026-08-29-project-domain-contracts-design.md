# Milestone 3 Project Domain Contracts Design

**Status:** Approved in conversation; awaiting written-spec review

**Date:** 2026-08-29

**Parent specification:** `docs/superpowers/specs/2026-08-29-pindou-mvp-design.md`

## 1. Goal

Define one versioned, platform-neutral project format and the minimum module contracts needed by later photo, gallery, DIY, persistence and export milestones. This milestone does not add visible UI, generation algorithms, cloud services or persistence implementations.

## 2. Chosen Approach

Use focused domain files plus ports that depend only on domain types.

The alternatives were rejected for this milestone:

- A single large contract file would be initially shorter but would couple unrelated responsibilities as the product grows.
- A runtime-schema dependency such as Zod would provide richer schema tooling but would add a dependency and mini-program bundle cost before that capability is justified.

The implementation therefore uses TypeScript types and small handwritten runtime guards. It avoids framework, WeChat, uniCloud, browser and canvas APIs.

## 3. Domain Structure

The project domain is organized by responsibility:

- Project primitives and the version 1 project document.
- Source-specific data for photo, gallery and DIY projects.
- Runtime validation for portable or persisted unknown input.
- A migration boundary with current version `1` and no fabricated historical migrations.
- Module ports for generation, repositories, catalogs and export.

Every module imports inward from domain types. Page components and platform adapters are future consumers and do not become dependencies of the domain.

## 4. Version 1 Project Contract

`PindouProjectV1` contains:

- `version`, fixed to `1`.
- Stable `id` and user-editable `name`.
- `source`, a discriminated union with `type` equal to `photo`, `gallery` or `diy`.
- Positive integer `width` and `height` in bead cells.
- `beadSizeMm`, fixed to `5` in the MVP.
- A palette reference containing stable palette ID and version.
- Row-major `cells` whose length is exactly `width * height`; each entry is a stable palette-color ID or `null` for an empty cell.
- Editable text objects with stable IDs, content, grid position, font ID, size and palette-color ID.
- Non-destructive display/export `direction`, either `normal` or `reverse`.
- Print annotations for optional title, author and notes.
- ISO 8601 `createdAt` and `updatedAt`, plus optional `uploadedAt` for the first successful cloud upload.
- Optional `ownerId`, present only when ownership is associated with a cloud-saved copy.
- Optional low-resolution preview reference for a cloud-saved copy.

Duplicate names are valid because project identity uses `id`. Naming defaults belong to the future save workflow rather than the domain validator.

## 5. Source-Specific Data

The `source` union preserves information required to reopen each creation flow without coupling the common document to a UI implementation:

- Photo source: local generation and crop settings only; it never contains original-photo bytes or a permanent original-photo path.
- Gallery source: source pattern ID and source pattern version. Opening a pattern still produces an independent project ID and cell copy.
- DIY source: versioned DIY object data. Version 1 supports catalog elements and text through explicit object variants.

No generated-image DIY variant is exposed in version 1. A future project version may add another discriminant without changing the meaning of existing variants.

## 6. Validation and Migration Boundary

Runtime validation accepts `unknown` and returns a typed success or a structured failure. It verifies at minimum:

- The document is an object with version `1`.
- Width and height are positive integers.
- Bead size is exactly `5`.
- Cell count equals `width * height`.
- Direction and source discriminants are recognized.
- Required IDs, palette references and timestamps are non-empty strings.

The migration entry point returns a valid current project or an unsupported-version failure. Since there are no historical formats, Milestone 3 implements no version-to-version transformation. Future migrations can be registered when a real version 2 exists.

## 7. Module Interfaces

The milestone defines only contracts that have clear consumers in the approved MVP:

- `GenerationEngine`: transforms a platform-neutral generation request into grid cells and usage-neutral metadata.
- `ProjectRepository`: lists, reads, saves and deletes project documents; local and cloud adapters will implement the same behavior later.
- `GalleryRepository`: lists scenario categories and reads versioned gallery patterns.
- `DiyElementRepository`: lists categories and reads versioned DIY elements.
- `ProjectExporter`: converts a project plus export options into a platform-neutral artifact descriptor.

Cancellation mechanisms, cloud authorization, file selection, canvas drawing and filesystem delivery stay outside these ports until their own milestones establish concrete requirements.

## 8. Error Handling

Expected domain failures use discriminated result values rather than platform exceptions. Validation failures include a stable code and field path suitable for tests and future localized UI messages. Repository and exporter error taxonomies are not invented in this milestone; adapters will define them when real platform behavior is implemented.

## 9. Testing

Tests exercise real domain code and cover:

- A valid project for each of the three source types.
- Rejection of unknown versions.
- Rejection of non-positive or non-integer dimensions.
- Rejection when cell count does not match dimensions.
- Rejection of unsupported direction or source types.
- Confirmation that domain and port files contain no imports from Vue, uni-app, WeChat or uniCloud.

The milestone also passes the existing unit tests, lint, TypeScript check and WeChat mini-program production build.

## 10. Acceptance Criteria

- The three approved creation sources share one current project document.
- Invalid dimensions, cell counts and versions are detected at runtime.
- Original-photo data cannot be persisted through the version 1 photo-source contract.
- Domain types and ports remain platform-neutral and usable by future H5/App adapters.
- No visible feature, authentication, database, generator or exporter implementation is added.
- All automated quality gates and the WeChat build pass.
- The completed implementation is committed, tagged `milestone-03-project-domain-contracts` and pushed to GitHub.
