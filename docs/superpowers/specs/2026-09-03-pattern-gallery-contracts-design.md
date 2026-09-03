# Milestone 6 Pattern Gallery Categories and Content Contracts Design

**Status:** Approved for specification; implementation requires a separate approved plan

**Date:** 2026-09-03

**Target:** uni-app Vue 3, WeChat Mini Program first, H5-compatible architecture

## 1. Goal

Milestone 6 establishes the complete read-only pattern-gallery subsystem before the first production content batch is imported in Milestone 7. Guests can browse, search, filter and inspect published patterns without signing in. Selecting a pattern creates an independent local project copy through the existing project-domain boundary.

The gallery must preserve lossless bead-grid data as the authoritative source. Raster covers are discovery assets only and must never become the source for editing or high-resolution export.

## 2. Scope

Milestone 6 includes:

- Cloud-configured quick navigation and usage categories.
- Multi-dimensional pattern tags.
- Versioned category, pattern-summary, pattern-detail and lossless payload contracts.
- Public read-only gallery queries through a cloud object.
- Search, combined filters, editorial-featured ordering, newest ordering and pagination.
- A lightweight gallery list that does not download grid payloads.
- A pattern detail page with on-demand preview and statistics.
- Versioned local caching and content-integrity checks.
- A boundary that creates an independent local project copy.
- Validation and import tooling for later content operations.
- Automated contract, cloud, client and page-state tests.
- WeChat Mini Program and H5 build verification.

Milestone 6 does not include:

- Producing the first 24 production patterns; that is Milestone 7.
- Community publishing, public user profiles, comments, follows, rewards or rankings.
- Likes, favorites, view counters or a synthetic popular sort.
- The production grid editor or export renderer.
- Uploading user photos or generated images into gallery content.
- A visual administration site.

## 3. Product Research Decisions

High-interest open-source bead tools primarily optimize generation, palette matching, editing and export rather than content discovery. Community-oriented implementations add a material gallery, share links, likes and favorites, while pixel-art libraries commonly use name/tag search and multiple sort dimensions.

Pindou therefore does not copy a single competitor's navigation. It combines:

- A compact mobile-first discovery surface.
- Curated quick entries for immediate use.
- Multi-dimensional tags instead of one mutually exclusive category.
- A detail-first flow before creating an editable copy.
- Stable content provenance and review controls from the start.

The implementation must be independent. No source code, copy, palettes or pattern assets from researched repositories are copied.

## 4. User Experience

### 4.1 Gallery Home

The gallery home contains, in order:

1. A search field.
2. Horizontally scrollable quick entries.
3. Featured/newest ordering controls.
4. A two-column pattern-card grid.
5. An entry to complete multi-dimensional filters.

The initial quick entries are:

- Featured.
- Newest.
- Door signs.
- Birthdays.
- Holidays.
- Gifts.
- More filters.

The entries and their order are cloud-configured. Pages do not hard-code the category dataset.

Each card displays:

- Cover.
- Name.
- Grid dimensions.
- Difficulty.
- Compact feature badges such as editable text.

Color count, total bead count, palette and direction remain on the detail page to keep cards readable on a phone.

### 4.2 Search, Tags and Filters

Search matches normalized pattern names and approved searchable tags. It does not search raw grid payloads.

Filters can be combined across these dimensions:

- Usage: door sign, delivery door sign, birthday, holiday, farewell, new job, anniversary and gift.
- Theme: configurable values such as animals, people, plants, food, typography and geometry.
- Difficulty: beginner, standard or advanced.
- Size class: small, medium or large.
- Feature: configurable values such as editable text, keychain, coaster or ornament.

A pattern may contain multiple values within a dimension when valid. No single `category_id` owns the pattern.

No-result state explains that no pattern matches and offers a one-tap clear-filter action.

### 4.3 Ordering

Default ordering is editorial featured order, controlled by a non-negative recommendation weight and stable tie-breakers. Users may switch to newest-first.

The MVP does not offer popular ordering because it has no reliable engagement dataset. Popular ordering is added only after genuine community events exist.

### 4.4 Pattern Detail

The detail page presents:

- A high-quality preview.
- Pattern name and tags.
- Grid dimensions and estimated physical dimensions.
- Difficulty.
- Color count and total bead count.
- Default palette and palette version.
- Default normal/reverse direction.
- Editable-text capability and region summary when present.
- Creator, source type and approved license/review status.
- A primary `Use this pattern` action.

Opening a card does not create a project. The project is created only after the explicit primary action.

## 5. Authentication Boundary

These actions never require sign-in:

- Browse the gallery.
- Search and filter.
- View pattern details.
- Download a published payload for local use.
- Create and edit a local copy.
- Export locally when export capabilities become available.

Saving or viewing a cloud project continues through the Milestone 5 WeChat authorization boundary. Authorization refusal is a supported state and does not block local use.

## 6. Architecture and Dependency Direction

The gallery follows the existing domain/application/adapter/page boundaries:

```text
Gallery pages
  -> gallery application controller/use cases
    -> gallery repository and payload-cache ports
      -> uniCloud gallery adapter + platform cache adapter
        -> pindou-gallery cloud object + cloud storage
```

Domain contracts and application use cases do not import uniCloud or page APIs. The cloud adapter owns transport-envelope mapping. Pages render explicit controller states and do not query cloud databases directly.

The gallery cloud object is public for read methods but exposes only reviewed, licensed and published content. Client writes to gallery collections remain denied.

## 7. Content Model

### 7.1 Category Record

`pindou-gallery-categories` remains the source for usage categories and quick navigation. A category includes:

- Stable content ID and schema version.
- Display name and optional short label.
- Usage slug.
- Optional cover/icon reference.
- Quick-entry visibility and order.
- General display order.
- Creator, source type and optional source reference.
- License status and review status.
- Acquisition/creation timestamp.
- Draft, published or archived state.

Only approved, reviewed and published records are returned.

### 7.2 Pattern Summary

The list response contains only lightweight metadata:

- Stable content ID and content version.
- Name and normalized searchable name.
- Card-cover reference.
- Grid width and height.
- Difficulty and size class.
- Usage, theme and feature tag arrays.
- Editable-text indicator.
- Editorial recommendation weight.
- Publication timestamp and stable order key.

It explicitly excludes lossless cell data.

### 7.3 Pattern Detail

The detail response adds:

- Detail-preview reference.
- Estimated physical width and height.
- Default palette ID and version.
- Default direction.
- Color count and total bead count.
- Editable-text region summaries without mutable user values.
- Creator and provenance fields.
- Payload file reference, payload format version, byte size and SHA-256 content hash.

### 7.4 Lossless Pattern Payload

The payload is a separately stored, versioned JSON asset. It contains:

- Payload format identifier and version.
- Pattern content ID and matching content version.
- Grid width and height.
- Palette ID and palette version.
- Lossless indexed cell data, including transparent/empty cells.
- Default direction.
- Optional editable-text region definitions.
- Required project-template fields needed to create a valid local copy.

The chosen cell encoding must be deterministic, validate exact cell count and preserve every cell without raster conversion. Compression may be added only if it remains deterministic and independently validated.

### 7.5 Provenance

Every publishable category and pattern records:

- Creator.
- Original, commissioned or licensed source type.
- Source reference when applicable.
- License approval status.
- Content review status.
- Creation or acquisition date.

Recognizable unauthorized commercial IP, names, logos, slogans, signature silhouettes and confusingly similar presentations are rejected before import.

## 8. Storage and High-Resolution Strategy

Metadata lives in uniCloud database collections. Lossless pattern payloads and raster preview assets live separately in cloud storage.

Each pattern may reference:

- A small card cover optimized for the two-column list.
- A larger detail preview.
- One lossless pattern payload.

The authoritative payload is grid data, never a cover image. On-screen zoom and future exports re-render from this data.

Future output targets are reserved as follows:

- PNG defaults to print-quality 300 DPI.
- Advanced PNG supports 600 DPI.
- SVG and PDF use vector grid lines, labels and text and are not resolution-bound.
- Large patterns may be tiled across A4 portrait or landscape pages with page numbers, overlap and alignment marks.

Milestone 6 defines the data required by these outputs but does not implement the production exporters.

## 9. Gallery Cloud Object

`pindou-gallery` exposes three read-only methods:

- `listCategories()` returns approved published usage categories and quick-entry configuration.
- `listPatterns(query)` returns projected summaries with normalized search, combined filters, stable ordering and bounded cursor pagination.
- `getPattern(contentId)` returns one approved published detail and a time-limited or platform-supported reference for its published assets.

Input is strictly validated. Unknown filters, invalid cursor state, excessive page sizes and malformed IDs return stable application errors.

The cloud object applies publication, license and review predicates server-side for every method. A client cannot obtain draft, rejected or archived content by changing request parameters.

## 10. Caching and Integrity

Downloaded payloads are cached under a key derived from:

```text
content ID + content version + SHA-256 hash
```

Before use, the client verifies:

- Supported format identifier and version.
- Matching content ID and content version.
- Declared dimensions and exact decoded cell count.
- Supported palette reference.
- SHA-256 content hash.

A hash mismatch deletes the invalid cache entry and triggers one clean download. A second mismatch stops the operation and shows a retryable integrity error. Unsupported future formats prompt the user to update the app; they are never interpreted heuristically.

## 11. Independent Copy Semantics

`Use this pattern` downloads and validates the payload, then maps it through the existing versioned project factory. The new local project:

- Receives a new project ID.
- Records `sourceType: gallery` and source content ID/version for provenance.
- Owns its own editable name and grid state.
- Does not retain a mutable link to cloud pattern data.
- Is not changed or deleted when the source is updated, archived or removed.

If the production editor is not yet available, the UI reaches an explicit future-feature boundary after successful copy creation. It must not claim that a nonexistent editing workflow is complete.

## 12. Failure Handling

- List failure preserves the page and offers retry without prompting for login.
- Empty search/filter results offer clear filters.
- Cover failure uses a consistent placeholder and does not block other cards.
- Detail or payload download failure creates no partial project and allows retry.
- Integrity failure removes invalid cache data and never opens corrupted content.
- Unsupported payload version asks the user to update the app.
- Archived content disappears from new discovery, while existing user copies remain intact.
- Cloud-save actions continue to use the existing authorization flow.

## 13. Content Operations

The MVP has no administration site. Content is managed through structured metadata and payload files plus a validator/import script.

Validation must reject:

- Missing or unknown fields.
- Duplicate stable IDs or invalid versions.
- Unknown category/tag values.
- Invalid dimensions, cell counts or palette references.
- Invalid editable-text regions.
- Missing previews or payload files.
- Payload hashes or declared byte sizes that do not match.
- Content lacking approved license and review status for publication.
- Unsafe recognizable IP indicators recorded by the content review process.

Import is explicit and idempotent for the same content ID/version. It must not silently mutate an already published version.

## 14. Testing Strategy

Automated coverage includes:

- Category, summary, detail and payload contract validation.
- Multi-dimensional tag combinations.
- Name/tag search normalization.
- Featured/newest stable sorting and cursor pagination.
- Server-side exclusion of draft, rejected, unlicensed and archived content.
- Projection tests proving list responses exclude cell data.
- Payload dimensions, cell count, palette, version and SHA-256 verification.
- Cache hit, version change, invalidation and retry behavior.
- Independent-copy identity and source-version behavior.
- Loading, success, empty, image-failure, network-failure and unsupported-version page states.
- Guest browsing without identity calls and cloud-save authorization boundaries.
- Existing quality gates, WeChat Mini Program build and H5 build.

Fixtures use independently created synthetic grids and do not introduce production artwork before Milestone 7.

## 15. Implementation Tasks

1. Implement gallery domain contracts and validation.
2. Upgrade gallery database schemas for multi-dimensional metadata and split payload references.
3. Define the lossless payload format and deterministic integrity validation.
4. Implement content validation and idempotent import tooling.
5. Implement the public read-only `pindou-gallery` cloud object.
6. Implement the client gallery adapter and versioned payload cache.
7. Implement the gallery home search, quick entries, filters, ordering and card states.
8. Implement pattern detail and the independent-copy application boundary.
9. Complete automated tests and WeChat/H5 verification.
10. Update deployment instructions, review, commit, tag `milestone-06-pattern-gallery-contracts` and push GitHub.

## 16. Acceptance Criteria

Milestone 6 is complete when:

- Guests can browse, search, combine filters and view details without authorization.
- List requests never download lossless grid payloads.
- Only approved, licensed and published records are externally readable.
- Explicit use downloads and validates the payload before creating a valid independent local project.
- Cache invalidation and format incompatibility fail safely.
- Raster covers are never used as editable or export sources.
- Loading, empty and error states are usable on the WeChat Mini Program.
- All relevant tests, lint, type checks, cloud validation, WeChat build and H5 build pass.
- The reviewed implementation is tagged and pushed to GitHub.
