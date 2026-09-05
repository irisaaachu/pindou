# Milestone 7 Gallery Pilot Content Design

## 1. Outcome

Milestone 7 publishes four original, production-quality bead patterns through the complete gallery pipeline before the remaining twenty patterns are produced. The release proves deterministic content creation, high-resolution previews, cloud-storage references, JSONL database import, guest discovery, detail viewing and creation of independent local project copies in the real WeChat environment.

The four records are version `1.0.0`:

| Content ID | Category | Name | Grid |
|---|---|---|---|
| `inside-cute-dog-sign` | `door-sign` | 内有萌犬 | 58 × 29 |
| `delivery-block-door-sign` | `delivery-sign` | 快递挡在门口 | 58 × 29 |
| `birthday-dog-cake-bouquet` | `birthday` | 生日小伙伴 | 29 × 29 |
| `farewell-fortune-sign` | `farewell` | 脱离苦海 发大财 | 58 × 29 |

The original target of twenty-four records is deliberately reduced for this release. The remaining twenty are added only after the user supplies or approves more source artwork and this pilot passes real-cloud acceptance.

## 2. Visual and copyright rules

- Artwork is grid-native and original. Raster images are outputs, never the editable source.
- The birthday dog may use a minimal cute line-art language, but must not reproduce the silhouette, face, pose, proportions or identifying details of “线条小狗” or another protected character.
- The shared look uses warm cream, pale blush, soft lavender, sage, butter yellow and restrained cocoa outlines.
- No brand logos, franchise names, copied poses or unlicensed reference images are stored.
- Provenance is `creator: "Pindou Studio"`, `sourceType: "original"`, with an internal source reference naming the grid-native design revision.

## 3. Authoritative assets

Each pattern has three files:

- `payload.json`: UTF-8 lossless `pindou-gallery-pattern` version 1 data.
- `card.png`: lightweight list cover rendered from the payload.
- `detail.png`: high-resolution detail preview rendered from the same payload.

Payloads use `pindou-soft-original@1.0.0`. The palette registry contains stable color IDs and hex values; payload cells store color IDs, not hex strings. Preview generation fails on an unknown color ID.

Detail PNGs render each bead cell at 32 × 32 pixels with a visible circular bead, centre highlight and grid separation. The exact grid drawing area is therefore 1856 × 928 pixels for a 58 × 29 pattern and 928 × 928 pixels for a 29 × 29 pattern. Detail files add a fixed 64-pixel coordinate margin on the top and left, producing final files of 1920 × 992 and 992 × 992 pixels respectively. Card PNGs have no coordinate margin and use 8 pixels per cell. PNG dimensions and pixel data are deterministic. The lossless payload remains the source for future print PNG, SVG and PDF export.

The detail renderer applies the strongest reusable ideas observed in established open-source bead tools without copying their code or artwork:

- a stronger guide at every tenth bead and every 29-bead pegboard boundary;
- clean limited-color clusters instead of noisy one-cell color changes;
- row/column coordinates that remain legible when the image is enlarged;
- color IDs and usage counts derived from the same payload as the visible grid;
- explicit transparent cells for empty pegs rather than painting them as a background color.

The pilot uses no dithering because these four assets are deliberately authored grid patterns, not photographs. Area sampling, perceptual CIEDE2000 matching, optional dithering, background flood fill, connected-region cleanup and verified multi-brand physical palettes are mandatory MVP capabilities. They begin immediately after this content-pipeline pilot in Milestones 8–14 rather than waiting until after DIY or being deferred beyond MVP.

## 4. Pattern content

### 4.1 内有萌犬

A rounded cream door-sign border, a small original floppy-ear dog at the left and the four-character text `内有萌犬`. The text region is recorded as editable metadata using `pindou-hanzi-12-v1`, but Milestone 7 does not add the text editor. Default direction is `normal`; advanced reverse use is supported by the project contract.

### 4.2 快递挡在门口

A parcel and doorway motif with the seven-character text `快递挡在门口`. The composition prioritizes legibility over decoration. It records one editable text region and uses default direction `normal`.

### 4.3 生日小伙伴

One original line-style dog grouped with a small cake and flowers. It contains no editable text, fits one 29 × 29 board and must remain recognisable when rendered without antialiasing.

### 4.4 脱离苦海 发大财

A two-line celebratory sign with the exact text `脱离苦海` and `发大财`, accompanied by original coin and sparkle motifs. The space between phrases is presentation copy; payload metadata uses two editable text regions so each line can later be edited independently.

## 5. Content generation

A deterministic Node script owns the four compositions. It uses small grid primitives (`setCell`, horizontal/vertical line, rectangle, glyph placement) and committed 12-pixel Chinese glyph matrices only for the characters required by this pilot. It writes the four payloads and eight PNG previews. Running it twice without source changes produces byte-identical payloads and PNGs.

The content validator additionally proves:

- metadata bead and color counts equal the payload;
- editable text regions stay inside the grid and match the intended defaults;
- card/detail PNG files exist and have the expected dimensions;
- payload byte size and SHA-256 match exact UTF-8 bytes;
- all four published records satisfy provenance and approval gates.
- every pattern stays within an explicit maximum of eleven colors;
- color usage totals sum to the bead count;
- occupied bounds do not contain accidental detached one-cell noise; intentional one-cell sparkles must be declared by the design and asserted by its fixture.

## 6. Cloud deployment boundary

Cloud file IDs are account-bound and must not be committed. The repository creates a deterministic upload manifest listing each local file and logical remote key. After the user uploads the twelve files, a locally ignored mapping file associates each logical key with the returned uniCloud file ID.

The import builder accepts that mapping and emits:

- `categories-import.json`: `.json` filename whose contents are JSONL, one category per line;
- `patterns-import.json`: `.json` filename whose contents are JSONL, one pattern per line.

Every record keeps the stable `_id` derived from `content_id + version`. Missing mappings, duplicate mappings, non-cloud references or conflicts fail before output. Repeated generation is byte-identical and repeated `insert` deployment is rejected by `_id` rather than silently duplicating content.

No script logs credentials, accesses the real uni-id configuration or uploads to the user’s cloud account. Upload and import remain explicit HBuilderX/uniCloud-console actions.

## 7. Application behavior

No new gallery page architecture is added. The existing Milestone 6 list/detail/controller path consumes the four cloud records.

- Guests see four cards without an identity prompt.
- Search can find the exact Chinese names and approved tags.
- Category filters show the corresponding record.
- Opening a card fetches only detail metadata and preview.
- “使用此图纸” downloads and validates the payload, then persists an independent local project.
- A failed preview or payload never creates a partial project.

## 8. Acceptance criteria

- Exactly four approved pattern records are generated and importable.
- All payloads and previews are derived deterministically from committed grid definitions.
- Detail images use a 32-pixels-per-cell grid plus the exact 64-pixel top/left coordinate margins above.
- The database import files are `.json` files containing JSONL rather than JSON arrays.
- No cloud file ID, service-space identifier, AppSecret or token secret is tracked.
- Full tests, lint, type checking, gallery validation, cloud validation, WeChat build and H5 build pass.
- In the real WeChat Developer Tools connected to `pindou-dev`, a guest can browse four patterns, open details and create a persistent local copy without console errors.
