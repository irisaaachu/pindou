# Milestone 7.1 High-Resolution Construction Chart Design

## 1. Purpose and scope

Milestone 7.1 corrects the four Milestone 7 gallery patterns so that a detail image is a usable bead construction chart rather than an enlarged bead-effect preview. The user must be able to enlarge the chart in WeChat, identify every occupied cell by a real MARD color code, follow coordinates from any edge and verify the exact quantity of every color.

This is a correction to the existing four-record gallery pipeline, not a new editor or export subsystem. It replaces the four payloads and four detail PNGs, regenerates the four card PNGs from the corrected colors, and keeps the existing twelve-file upload contract:

- one lossless payload per pattern;
- one clean card preview per pattern;
- one high-resolution construction-chart PNG per pattern.

The old twelve files have not been uploaded to uniCloud, so no cloud migration or compatibility layer is required. Dynamic user-generated PNG, SVG and PDF export remains in Milestones 15–22.

## 2. Authoritative MARD palette

The four payloads use `mard-221` version `2026.09-pinned`. The palette is derived from `maxcleme/beadcolors` commit `29229889daab404fb30531d4bb785fd73f7f58e3`, file `raw/mard.csv`, which provides 291 MARD reference codes and RGB values under the MIT license.

The 221-color set is the strict subset whose code prefix is one of `A`, `B`, `C`, `D`, `E`, `F`, `G`, `H` or `M`. Import must assert exactly 221 unique codes. The source commit, source path, derivation rule, copyright notice and MIT license are committed in a third-party notice. Runtime generation does not access the network.

The repository stores the pinned palette data needed to reproduce builds. It does not copy another application's renderer, interface, artwork or algorithm. Screen RGB values are references only; the product must state that physical bead color can vary by screen, light and manufacturing batch and that the app is not an official MARD product.

Each of the four patterns uses at most eleven selected MARD codes. Existing semantic design roles such as cream, cocoa and blush are mapped once to verified MARD codes during authoring; generated payload cells contain only MARD codes. Internal color names never appear as construction instructions.

## 3. One payload is the source of truth

Each payload remains `pindou-gallery-pattern` version 1 and changes its palette reference to `mard-221@2026.09-pinned`. A non-empty cell contains a MARD code present in the pinned palette; an empty cell is `null`.

The renderer, card preview, color count, bead count, legend and cloud record metadata are all derived from the same payload. No count or color list is maintained by hand. Generation fails if a code is unknown, a cell count differs from `width × height`, a derived quantity differs from metadata, or a pattern exceeds eleven colors.

Ordinary empty space stays empty and is excluded from all quantities. The birthday composition has an empty outside area. A door-sign background may contain beads when that filled background is an intentional part of the design; those cells then carry real MARD codes and are counted.

## 4. Two deliberately different images

### 4.1 Gallery card

The card PNG remains a clean, lightweight visual preview. It may use the existing round-bead effect and does not show codes, coordinates or a legend. Its colors are regenerated from the corrected MARD-coded payload.

### 4.2 Detail construction chart

The detail PNG uses square cells and contains no decorative bead highlights. Every occupied cell has:

- a solid fill using the pinned RGB value;
- its MARD code centered in the cell;
- black or white code text chosen by a fixed luminance threshold for contrast.

An empty cell has a white fill, grid boundary and no code. This makes empty peg positions visible without falsely counting them as beads.

## 5. Exact chart geometry

The renderer uses 64 × 64 pixels per bead cell. For a pattern with `W` columns and `H` rows:

- grid width = `W × 64`;
- grid height = `H × 64`;
- coordinate band = 64 pixels on each of the four sides;
- canvas width = `W × 64 + 128`.

Coordinates are one-based. The top edge reads `1…W` from left to right; the bottom reads `W…1` from left to right. The left edge reads `1…H` from top to bottom; the right reads `H…1` from top to bottom. This mirrors the reference-chart convention and lets a user work from either edge.

Grid boundaries have three deterministic weights:

- every cell: 1 pixel;
- every tenth cell: 3 pixels;
- every 29th cell and the outer grid boundary: 5 pixels.

Lines are drawn on integer pixel coordinates without antialiasing. Board guides do not change cells or quantities.

The legend begins after the bottom coordinate band. It has a 64-pixel top gap and 64-pixel bottom margin. Each legend item is 256 × 128 pixels, with a 96 × 96 color swatch, MARD code and exact bead quantity. Items use a 32-pixel horizontal gap and a 24-pixel row gap. Available width is the canvas width minus 128 pixels of side margins. The deterministic column and height formulas are:

- columns = `max(1, floor((canvas width - 128 + 32) / 288))`;
- rows = `ceil(number of used colors / columns)`;
- legend height = `64 + rows × 128 + (rows - 1) × 24 + 64`;
- canvas height = `H × 64 + 128 + legend height`.

Legend items are sorted naturally by MARD series and number (`A2` before `A10`, then `B…`). Only used colors appear. The chart itself contains codes and quantities only; the existing detail page carries the Chinese pattern name and other descriptive copy, avoiding operating-system font differences inside generated PNGs.

Under these rules a 58 × 29 pattern with up to eleven colors produces a 3840 × 2240 PNG. A 29 × 29 pattern with seven to eleven colors produces a 1984 × 2328 PNG. These are lossless PNGs, large enough for the first real-device clarity test while remaining comfortably below common 4096-pixel texture limits on either dimension.

## 6. Text and deterministic rendering

Codes, axes and quantities use a committed bitmap font covering uppercase `A–Z`, digits `0–9` and the hyphen. Glyphs, spacing, centering and contrast selection are platform-independent. The renderer must produce byte-identical PNGs for identical inputs on Windows and CI.

The four existing Chinese messages remain grid-native artwork in their payloads. Their occupied cells receive MARD codes exactly like all other beads. Editable text-region metadata remains unchanged except that its `colorId` also becomes a MARD code.

## 7. Direction behavior

The payload remains authoritative and is never destructively mirrored. `normal` renders the stored cell matrix. `reverse` renders a horizontal view transform of that matrix, while leaving stored cells unchanged. Coordinates retain the edge convention defined above, and the detail page continues to state “正向拼制” or “反向拼制”.

All four pilot patterns remain `normal` in Milestone 7.1. Reverse rendering is covered by a small fixture test so the shared renderer is ready for later patterns without adding a second cloud asset now.

## 8. WeChat viewing behavior

The detail page first displays the high-resolution PNG fitted to the card width. Tapping it opens the platform-native image preview through uni-app so WeChat users can pinch to zoom and pan. This action is guest-accessible, creates no account, requests no identity permission and does not save a cloud project.

If native preview cannot open, the fitted image remains visible and a short non-blocking message is shown. Existing preview-load failure behavior remains unchanged. The page does not download the large image until its detail record is opened.

## 9. Files and cloud boundary

Implementation will make the smallest coherent changes to:

- add the pinned MARD 221 palette and its attribution;
- map the four grid-native designs to real MARD codes;
- replace the detail renderer with the construction-chart layout;
- regenerate four payloads, four cards and four detail charts;
- add tap-to-preview to the existing detail page;
- update validators, deterministic fixtures and import metadata.

This is a replacement, not a parallel renderer. The obsolete round-bead detail path, `showCoordinates` option, one-sided coordinate implementation, `pindou-soft-original` palette file and tests that assert the old detail geometry are removed. The round-bead drawing code is retained only inside the card renderer because cards still use it. No compatibility switch, unused export or duplicate palette remains after the regenerated assets and catalog have moved to MARD.

Logical remote keys and the local ignored uniCloud mapping mechanism remain unchanged. After verification, the user uploads the twelve regenerated files and imports the rebuilt JSONL-in-`.json` records. No AppSecret, service-space ID, cloud file ID or account-bound configuration is committed.

## 10. Verification and acceptance

Milestone 7.1 is accepted only when all of the following are verified:

1. The pinned source produces exactly 221 unique MARD codes and its checksum is asserted.
2. Every occupied cell in all four payloads contains a valid MARD 221 code; every empty cell is `null`.
3. All displayed dimensions, color totals and bead totals are derived from and equal to the payload.
4. The four detail PNG dimensions follow the formulas above, every occupied cell contains its code, all four coordinate edges are present, and the legend contains every used code exactly once with the correct quantity.
5. Empty cells contain no code and contribute zero to quantities.
6. The normal and reverse renderer fixtures prove non-destructive direction handling.
7. Two consecutive generation runs produce byte-identical payloads, card PNGs and detail PNGs.
8. Local visual inspection confirms that a pale, medium and dark cell all have readable code text and that 10-cell and 29-cell guides are visually distinct.
9. Full tests, lint, type checking, gallery validation, cloud validation, WeChat build and H5 build pass.
10. In WeChat Developer Tools, a guest can browse the four cards, open a detail, tap the chart, zoom/pan it and return without red console errors.
11. Only after the user sees the real WeChat preview do we decide whether 64 pixels per cell is sufficient. SVG/PDF work is not pulled into this correction unless the PNG fails that review.
