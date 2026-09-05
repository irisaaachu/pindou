# Pindou MVP Product and Architecture Specification

**Status:** Approved for Milestone 0 implementation

**Date:** 2026-08-29

**Target platform:** WeChat Mini Program

**Application stack:** uni-app, Vue 3, TypeScript, Vite, uniCloud, uni-id

## 1. Product Goal

Pindou helps bead-art users create clear, printable and editable bead patterns on a phone. The MVP prioritizes the quality of usable bead patterns before supporting breadth around them. Its three creation paths are:

1. Convert a local photo into a bead pattern.
2. Start from a complete pattern in the pattern gallery.
3. Combine original reusable elements in the DIY composer.

The MVP does not implement the community. Its project model must remain suitable for a future community without adding speculative community behavior now.

The photo-to-pattern engine, perceptual color matching, optional dithering, background removal, connected-region cleanup, verified physical palettes, bead usage statistics and print-quality export are core MVP requirements rather than post-MVP enhancements. After the four-pattern gallery pilot proves the content pipeline, these generator and output capabilities are implemented before the DIY composer and before any community work.

## 2. Product Principles

- Guests can generate, edit and export without signing in.
- Selecting a photo generates the first preview immediately with sensible defaults.
- Original photos are processed locally and are not uploaded by default.
- WeChat identity authorization is required before saving to or viewing the cloud project library.
- Outputs must be suitable for high-resolution viewing and physical printing.
- Gallery patterns and DIY elements must be original or have a verified usable license.
- The mobile interaction must be usable beside a real bead board.
- Implementation must be independent. Reference products may inform behavior, but their code, data, copy and assets are not copied.

## 3. MVP Information Architecture

The primary navigation is:

- Home
- Create
- My

### 3.1 Home

Home exposes three creation entries:

- Photo Generator
- Bead Pattern Gallery
- DIY Patterns

### 3.2 Create

Create contains:

- Local drafts, available to guests and signed-in users.
- Cloud projects, available only after WeChat identity authorization.

### 3.3 My

My contains:

- Identity state.
- Optional avatar and nickname settings.
- Privacy and local-processing explanation.
- Local data management.
- Sign-out action.
- Product, palette and content-license information.

## 4. Confirmed User Flows

### 4.1 Photo Generator

1. The user takes a photo or selects one from the album.
2. The app validates and decodes the image locally.
3. The app applies default crop, size, scene preset and palette settings.
4. The app immediately generates the first editable bead-pattern preview locally.
5. The user adjusts crop, dimensions, scene, color count, brightness, contrast or dithering.
6. The preview regenerates automatically using debouncing and stale-request cancellation.
7. The user optionally enters the grid editor for manual corrections and text.
8. The user reviews direction and material usage.
9. The user exports locally or saves the project.
10. Cloud save requests WeChat identity authorization if the user is not signed in.

### 4.2 Pattern Gallery

1. The user opens the pattern gallery.
2. The user selects a usage-scenario category.
3. The user selects a complete bead pattern.
4. The app creates an independent editable copy.
5. The user edits text, colors, direction or individual cells.
6. The user exports locally or saves the project.

The first content release contains 24 original patterns: eight categories with three patterns per category.

The initial categories are:

- Door signs
- Delivery door signs
- Birthdays
- Holidays
- Farewells
- New jobs
- Anniversaries
- Gifts

Categories and patterns are cloud-configured rather than hard-coded into pages.

### 4.3 DIY Patterns

1. The user chooses a usage scenario or canvas size.
2. The user selects a background or border.
3. The user adds one or more reusable elements.
4. The user moves, deletes, duplicates, recolors, horizontally flips or reorders elements.
5. The user scales elements using fixed 50%, 75%, 100%, 125% or 150% steps.
6. Every element remains aligned to the bead grid.
7. The user adds editable text.
8. The composer produces a unified bead grid for cell-level editing.
9. The user exports locally or saves the project.

The first DIY release contains approximately 40 elements in eight categories:

- Borders
- Flowers and plants
- Hearts and stars
- Bows and gifts
- Cakes and birthdays
- Holiday decorations
- Small animals
- Arrows and practical signs

Twelve elements belong to three original character families, with four poses per family. They may use broad visual themes such as minimalist line-art dogs, playful everyday companions and coffee-loving cats, but must not reproduce recognizable protected characters, names, logos, slogans, silhouettes or signature color arrangements.

Uploading a user photo and embedding it as a generated DIY element is explicitly excluded from the MVP. The element model may support a future additional element type without exposing an unfinished UI.

### 4.4 Cloud Authorization

Cloud save and cloud-project viewing both require WeChat identity authorization.

If authorization is refused:

- No project data is uploaded.
- The cloud list remains unavailable.
- Local generation, local drafts, editing and export continue to work.
- The user may retry authorization later.

Avatar and nickname are optional and are never prerequisites for project saving.

### 4.5 Export

1. The user chooses front or reverse output.
2. The user chooses PNG, SVG or PDF.
3. The user configures optional title, author, dimensions, direction and notes.
4. The app generates the file locally.
5. The user saves or shares the generated file through supported platform behavior.

PDF supports a complete page and A4 automatic tiling with page numbers, alignment marks and overlap regions.

## 5. Visual Direction

The approved visual direction is Fashion Candy with:

- Warm beige application background.
- Blush-pink hero surfaces.
- Mist-lavender primary actions.
- Pale-mint supporting accents.
- White content cards.
- Slightly cute rounded display typography.
- Neutral, highly readable body typography.
- Soft pastel colors with lower saturation than the initial concept.

The interface must remain readable and usable; decorative typography is not used for long text or dense editing controls.

## 6. Architecture

### 6.1 Client

The client uses uni-app with Vue 3 and TypeScript. Product logic is separated into focused modules:

- Project domain and version migration.
- Local image intake and crop settings.
- Generation engine interface.
- Palette and color matching.
- Canvas renderer and touch interaction.
- Grid editor.
- DIY object composer.
- Usage calculation.
- Local draft repository.
- Cloud project repository.
- Exporters.

UI components must consume interfaces rather than depend directly on algorithm or uniCloud implementation details.

### 6.2 Generation Execution

The generation engine exposes one platform-neutral interface. Two execution adapters are evaluated:

- Worker-backed generation where supported and verified.
- Main-thread fallback with bounded work and responsive progress behavior.

Worker availability must not leak into page components. Performance feasibility is verified before the production engine is finalized.

### 6.3 Cloud

uniCloud provides:

- Minimal WeChat identity records through uni-id.
- Private cloud-project storage.
- Public gallery metadata and content delivery.
- Public DIY-element metadata and content delivery.
- Low-resolution project previews.

The cloud does not receive original photos in the MVP. Generated export files are not automatically persisted.

### 6.4 Content Operations

The MVP does not include a visual administration website. Gallery patterns and DIY elements are managed through:

- Structured content files.
- A validation tool.
- Controlled import into uniCloud.

The import process validates IDs, dimensions, grid data, palette references, assets, versions, ordering, publication status, provenance and copyright-review status.

## 7. Core Data Requirements

### 7.1 Project

Every editable project includes:

- Unique project ID.
- Data-format version.
- Owner ID when cloud-saved.
- User-editable name.
- Source type: photo, gallery or DIY.
- Grid width and height.
- Bead size, fixed to 5 mm in the MVP.
- Palette ID and palette version.
- Cell data.
- Crop and generation settings when applicable.
- DIY objects when applicable.
- Editable text objects.
- Front or reverse direction.
- Print annotations.
- Created, updated and first-upload timestamps.
- Low-resolution preview reference when cloud-saved.

`createdAt` records initial project creation. `uploadedAt` records first cloud upload. `updatedAt` records the most recent project update.

Duplicate project names are allowed because identity is based on project ID. An empty first-save name receives a localized default such as “Untitled Project” and remains editable.

### 7.2 Gallery Pattern

Every gallery pattern includes:

- Stable ID and version.
- Name and usage-scenario category.
- Cover image.
- Editable grid data.
- Default dimensions and palette.
- Optional editable-text regions.
- Default direction.
- Publication and ordering state.
- Creator, source type, license status and review status.

Opening a gallery pattern creates a copy. Later updates or removal of the source pattern do not alter the user's copy.

### 7.3 DIY Element

Every DIY element includes:

- Stable ID and version.
- Category and display name.
- Thumbnail and grid data.
- Grid anchor.
- Replaceable color roles.
- Allowed fixed scale steps.
- Horizontal-flip support.
- Creator, source type, license status and review status.

The project format uses a versioned element union so a future generated-image element can be added without changing existing element semantics.

## 8. Photo and Generation Requirements

### 8.1 Local Intake

- Accept supported WeChat photo and album formats.
- Correct orientation metadata.
- Downsample oversized images before expensive processing.
- Release temporary image resources when no longer needed.
- Explain that photos stay on the device during generation.

### 8.2 Crop and Size

- Users freely set width and height.
- Default mode preserves aspect ratio and crops to fill.
- Users can move and scale the crop.
- Advanced mode preserves the complete image and fills remaining space with a selected background or transparency.
- Stretching is not supported.
- Common alignment choices include center, top and bottom.
- The app estimates physical output size from the 5 mm bead size.

### 8.3 Scene Presets

The MVP presets are:

- Photo
- Portrait
- Pixel art
- Text and door sign

User-facing controls are limited to:

- Color count
- Brightness
- Contrast
- Dithering strength

Advanced implementation parameters remain inside presets unless user testing demonstrates a clear need to expose them.

### 8.4 Quality Selection

The production algorithm is chosen through a fixed golden-image benchmark rather than copied from a reference project. The benchmark compares:

- Area average, dominant-color and other justified sampling candidates.
- RGB and perceptual color-distance candidates.
- Dithering levels.
- Connected-region speckle cleanup.
- Boundary-connected background removal.
- Color exclusion and remapping.

Metrics include palette validity, fragment count, isolated-bead count, deterministic output and processing time. Human visual review supplements measurable results.

### 8.5 Instant Preview

- Selecting a photo triggers generation without a separate confirmation form.
- Parameter changes trigger debounced regeneration.
- Superseded jobs are cancelled or their results discarded.
- Interactive changes may use a fast preview.
- Stopping interaction triggers full-quality generation.
- Only the newest request may update the visible project.

## 9. Palette Requirements

The MVP supports:

- MARD
- Perler
- Hama

Each palette color has a stable internal ID, brand code, display name and color value. Palette versions are stored with projects and exports.

Palette data must come from a verified independent or officially permitted source. Data files from reference repositories are not copied.

The UI states that physical colors may vary by bead batch, lighting and display calibration.

## 10. Renderer and Editing

### 10.1 Renderer

The renderer supports:

- Round-bead and square-grid views.
- Pan and zoom.
- Coordinates or rulers.
- Standard grid lines.
- Stronger guides every 5 and 10 cells.
- Optional color codes.
- Fit-to-pattern.
- Highlight-all-cells for a selected color.
- Dimming of non-selected colors during highlight.
- Read-only lock mode for following a pattern while crafting.

3D preview is excluded from the MVP.

### 10.2 Mobile Interaction

A focused prototype verifies the final gesture rules before the full editor is implemented. It covers:

- Draw versus pan mode.
- Two-finger zoom.
- Accurate cell hit testing after transformation.
- Touch-target sizing.
- Prevention of page-scroll conflicts.
- Toolbars that do not obscure the working area.

Virtual joysticks are not part of the MVP unless direct device testing shows standard gestures are insufficient.

### 10.3 Grid Editor

The MVP editor provides:

- Pencil
- Eraser
- Fill
- Eyedropper
- Batch recolor
- Color exclusion and nearest-allowed-color remapping
- Undo and redo

The MVP does not provide free selection, cut, copy, paste, lines, rectangles, circles or a professional multi-layer workflow.

### 10.4 Text

Pattern text supports:

- Chinese, English and numeric input.
- A small approved font set.
- Size and color.
- Horizontal layout.
- Move and delete.
- Conversion to editable bead cells.

Print annotations support title, author, dimensions, direction and notes. Outlines, shadows and curved text are excluded.

### 10.5 Direction

- Normal is the default direction.
- Reverse mode is a horizontal mirror.
- Direction is stored in the project.
- Changing display or export direction must not destructively rewrite the source grid.
- Exports explicitly label the selected direction.

## 11. Saving and Identity

### 11.1 Local Drafts

- Guests and signed-in users can use local drafts.
- Drafts auto-save without blocking editing.
- Drafts have names, previews and last-edited timestamps.
- Original photos are not permanently retained as part of a draft.
- Version migration protects compatible older drafts.

### 11.2 Cloud Projects

- Authorization is requested before first cloud save or cloud-list access.
- Cloud projects can be named and renamed.
- First upload and last update dates are recorded.
- Users can create a copy rather than overwrite an existing project.
- Only the owner can read or mutate a private cloud project.
- Offline failure must not destroy the local draft.
- Conflicting updates must not silently overwrite newer data.

### 11.3 Portable Project Files

Users can export and import a versioned “Pindou project file” for editable backup. Import validates the schema and always creates a user-controlled copy rather than mutating a gallery source.

## 12. Usage and Crafting Support

Usage statistics include:

- Total beads.
- Number of colors.
- Quantity by palette code.
- Configurable beads per pack.
- Estimated packs rounded upward.
- Estimated board count where applicable.
- Isolated-bead warnings.

The user can select a color in the usage list to highlight all matching cells and can mark a color as materials-ready. Per-bead completion tracking is excluded.

The purchasing list can be exported as an image or included in PDF output.

## 13. Export Requirements

### 13.1 PNG

- User-selected high resolution.
- Optional bead shapes, grid, guides, coordinates and color codes.
- Optional print annotations.
- Bounded memory behavior for large outputs.

### 13.2 SVG

- Vector cells, grid, guides and text.
- Remains clear under zoom and print scaling.
- Uses the same palette codes and direction as the project.

### 13.3 PDF

- Vector-first pattern output.
- Complete-page option.
- A4 portrait and landscape tiling.
- Page numbers, alignment marks and configurable overlap.
- Physical-size and print-scale guidance.
- Optional material summary.

PNG, SVG and PDF must agree on grid data, palette version, annotations and direction.

## 14. Privacy and Security

- Original photos are processed locally and are not uploaded in the MVP.
- Cloud rules enforce project ownership server-side.
- Public gallery and DIY content are read-only to ordinary users.
- Secrets and environment identifiers are not committed to Git.
- Generated export files are not automatically uploaded.
- Authorization refusal is a supported state rather than an error that blocks local use.
- Privacy copy must match observable network and storage behavior.

## 15. Content and Intellectual-Property Controls

No unauthorized commercial IP is included.

Every published gallery pattern and DIY element records:

- Creator.
- Source type.
- Source reference where applicable.
- License status.
- Review status.
- Creation or acquisition date.

Content must not use recognizable protected character names, logos, slogans, signature silhouettes, signature expressions or confusingly similar overall presentation. Trend references are translated into broad original themes and independently designed character systems.

The project does not copy source code, palette datasets, copywriting, interface assets or pattern assets from the products reviewed during discovery.

## 16. Testing and Quality Gates

Every implementation milestone ends with relevant automated checks and manual acceptance evidence before the next milestone starts.

The overall test strategy includes:

- Unit tests for domain models, migrations, palettes, algorithms and usage calculations.
- Golden-image regression tests for generation behavior.
- Renderer and editor interaction tests where supported.
- Cloud authorization and ownership tests.
- Export data-consistency tests.
- WeChat developer build verification.
- Real-device checks for touch behavior, memory and output clarity.

Golden generation fixtures use fixed input, parameters and palette versions. Changes are checked for dimensions, valid palette IDs, transparency, fragment count, isolated beads, total usage and PNG/SVG/PDF consistency.

## 17. MVP Milestone Sequence

Each item is an independent review gate. Detailed file-level implementation plans are created immediately before execution of the relevant milestone.

0. Freeze the MVP product and architecture specification.
1. Establish the engineering quality baseline.
2. Build the application shell and visual system.
3. Define the versioned project domain model and module interfaces.
4. Establish uniCloud, database rules and content-security foundations.
5. Implement guest state and minimal WeChat identity authorization.
6. Implement pattern-gallery categories and content contracts.
7. Produce and import four original gallery pilot patterns, proving the complete content pipeline.
8. Implement local photo intake, orientation correction and privacy controls.
9. Implement crop, free dimensions, physical-size estimates and scene presets.
10. Run the generation-quality benchmark across area sampling, dominant-color sampling, perceptual distance, dithering, connected-region cleanup, boundary background removal and color remapping; select the production algorithms from evidence.
11. Verify WeChat generation performance and Worker/fallback feasibility.
12. Implement the production local image-to-bead engine, including the selected background and speckle cleanup behavior.
13. Implement upload-immediately-generates, debounced regeneration and fast/full-quality preview behavior.
14. Implement verified MARD, Perler and Hama palettes, CIEDE2000-class perceptual matching, color exclusion and remapping.
15. Validate the mobile canvas interaction prototype.
16. Implement the production bead-grid renderer with coordinates and 29 × 29 board boundaries.
17. Implement the basic manual grid editor.
18. Implement text-to-bead editing.
19. Implement front, reverse and non-destructive mirror behavior.
20. Implement usage statistics, color highlighting and purchasing lists.
21. Implement high-resolution PNG and SVG export with grid, color codes and usage legend.
22. Implement vector PDF and A4 automatic tiling.
23. Produce and import the remaining twenty approved gallery patterns from user-supplied or separately approved original sources.
24. Implement local drafts and portable project files.
25. Implement cloud project save, naming, timestamps and synchronization.
26. Implement the DIY element-library contract and first approximately 40 elements.
27. Implement the DIY pattern composer.
28. Reserve and validate the future generated-image DIY element boundary without exposing the feature.
29. Implement the Create project-management page.
30. Implement My, optional profile settings and privacy controls.
31. Complete end-to-end performance, compatibility, privacy and golden-fixture acceptance.
32. Prepare the WeChat Mini Program production release and review materials.

## 18. Explicit Non-Goals

The MVP excludes:

- Community publishing and public profiles.
- Likes, favorites, comments, follows, rankings and rewards.
- Downloading user-shared community patterns.
- Paid templates.
- Commercial IP content without authorization.
- AI text-to-image generation.
- User-photo embedding inside DIY patterns.
- 3D preview.
- Professional multi-layer editing.
- Reference-image tracing.
- Custom palette upload.
- H5 and App production releases.
- Multi-language localization.

## 19. Milestone 0 Acceptance Checklist

- [x] Product goal and three creation paths are explicit.
- [x] Guest, identity and cloud authorization rules are explicit.
- [x] Original-photo privacy behavior is explicit.
- [x] Gallery scope, categories and first content volume are explicit.
- [x] DIY operations, scale steps, content volume and future photo boundary are explicit.
- [x] Original-character and content-license rules are explicit.
- [x] Generation quality and performance validation precede production engine work.
- [x] Editor, crafting support and export formats are explicit.
- [x] Cloud project naming and timestamp semantics are explicit.
- [x] Community and other post-MVP work are excluded.
- [x] Every confirmed requirement maps to the milestone sequence.
