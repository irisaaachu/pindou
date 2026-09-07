# Milestone 8 Local Photo Generation Design

## 1. Purpose and scope

Milestone 8 introduces the first photo-to-bead workflow. A user can take one photo or select one photo from the WeChat album, review an automatically corrected and cropped image, and generate a local preview mapped to the pinned MARD 221 palette.

The milestone includes photo intake, orientation correction, an automatically suggested crop with manual adjustment, a first bead-grid result, and three preview modes. It does not include cloud saving, long-term drafts, per-bead editing, PDF output, or a downloadable high-resolution construction chart. Those later features will consume the grid produced here.

Source photos and generated data stay in the current page session. The workflow does not call uniCloud, require login, or write the source image to application persistence. Leaving the generator releases the session.

## 2. User flow

The generator landing page offers `拍一张` and `从相册选择`. Camera permission is requested only after the user chooses the camera entry. Cancelling either picker is a neutral action and leaves the page unchanged. The page states that photos are processed locally and are not automatically uploaded.

After one image is selected, the application corrects its orientation and creates a processing copy whose longest side is at most 2048 pixels without modifying the source file. It proposes an aspect-preserving crop. The crop screen supports pan and pinch zoom and offers automatic fit, square, and original-ratio choices. The user can restore the suggested crop.

Confirming the crop creates the first preview automatically. The result screen defaults to a round-bead view and allows switching among original image, round-bead preview, and square-grid preview. Tapping a preview opens an enlarged inspection view. The square-grid preview does not show tiny color codes in this milestone.

The result screen exposes:

- short-side presets of 29, 58, and 87 beads, defaulting to 58 while preserving the crop aspect ratio;
- color limits of 12, 24, and 36 MARD colors, defaulting to 24;
- automatic, cartoon, and realistic processing modes;
- advanced switches for gentle dithering, solid-background removal, and light isolated-color cleanup.

Changing a setting does not discard the currently visible result or immediately start another expensive calculation. It marks the settings as pending and presents `重新生成`. The user may adjust the crop or replace the photo. The screen reports rows, columns, total beads, used-color count, estimated physical size, recommended mode, and measured generation time.

## 3. Architecture and platform boundary

The implementation uses a framework-independent TypeScript image engine behind explicit interfaces. The WeChat adapter handles media selection, image decoding, orientation normalization, and the platform canvas boundary. The application controller owns the page-local session, crop state, settings, task identity, and result state. Preview renderers consume the same grid without changing it.

The initial engine runs on the main JavaScript runtime. Its deterministic input and output interfaces must allow the same implementation to move to a Worker or WASM later without changing generated results. Milestone 8 prioritizes output quality and verifiability over choosing the fastest runtime prematurely. H5 and future App adapters can reuse the engine.

The units are:

- media adapter: acquire one camera or album image and report cancellation and permission failures;
- image normalizer: apply orientation, constrain the processing copy to 2048 pixels, and expose RGBA pixels;
- crop model: represent normalized crop bounds, scale, and translation independently of the UI;
- generation engine: sample regions, recommend a mode, select a constrained palette, match colors, and apply optional cleanup;
- generation controller: accept only the latest requested job and release session resources on page exit;
- preview renderers: original, round-bead, and square-grid views.

No module in this flow depends on identity or cloud repositories.

## 4. Session data contracts

`PhotoInput` contains normalized in-memory pixel data, dimensions, and whether the source came from camera or album. It does not expose a real local file path to domain code.

`CropTransform` contains the normalized crop rectangle plus display scale and translation. It records whether the current transform is the automatic suggestion, square, or original-ratio choice.

`GenerationSettings` contains the short-side preset, color limit, selected mode, background-removal flag, dithering flag, and isolated-color-cleanup flag.

`BeadGrid` contains exact rows and columns and one MARD code or `null` for each cell. It uses the same palette identity and cell semantics as the gallery payloads so later editing, usage reporting, and construction-chart rendering do not need a migration.

`GenerationSummary` contains bead count, used-color count, physical dimensions, recommended mode, and elapsed time. `PhotoSession` owns these objects only while the generator page is alive.

## 5. Generation pipeline

The pipeline operates deterministically for identical normalized pixels, crop, settings, and palette version.

1. Calculate rows and columns from the crop aspect ratio and selected short side. Never stretch the crop.
2. Sample the full source area represented by each bead cell instead of reading one center pixel.
3. In cartoon mode, favor the dominant regional color and edge retention. In realistic mode, use luminance-aware regional averaging to suppress sensor noise while retaining tonal structure.
4. Automatic mode measures color distribution, edge density, and gradient prevalence to recommend cartoon or realistic processing. The recommendation is reported and can be overridden.
5. Convert the pinned MARD 221 colors to Lab once and cache that immutable table. Select the 12, 24, or 36 MARD colors that best cover the sampled image, then map every occupied cell using CIEDE2000 perceptual distance.
6. When enabled, gentle dithering applies deterministic error diffusion before final mapping. It is off by default.
7. When enabled, background removal flood-fills similar colors connected to image edges. It removes only an approximately uniform exterior background; complex scenes remain intact. The user can disable removal and regenerate.
8. Light cleanup replaces only one-cell isolated components by default. Replacement uses the closest suitable neighboring MARD color. A high-contrast endpoint or locally significant feature is preserved so eyes, flower centers, and line tips are not erased solely because they occupy one cell.

Every non-empty output cell must reference the pinned MARD 221 registry. The engine never invents RGB-only bead identities.

## 6. Privacy and lifecycle

The source photo, normalized copy, crop preview, and `BeadGrid` remain in memory for the current generator page. The application does not upload them, place them in a database, or keep an application draft. Temporary platform resources are released on replacement and page unload. The application does not display local paths in UI errors or logs.

A future explicit `保存到云作品` action will be a separate milestone and authorization boundary. This design does not pre-authorize or silently prepare an upload.

## 7. Errors and concurrency

Picker cancellation is not an error. Unsupported or undecodable input asks the user to choose a readable JPG, PNG, or WeChat-supported image. Camera denial explains the reason and keeps the album entry available without forcing a settings jump.

If normalization encounters memory pressure, it retries once with a smaller processing copy. A second failure asks for another image. Generation failure retains the normalized image and crop so retry does not require reselection.

Every generation request receives an increasing task identity. Only the latest identity may update the result. Repeated taps cannot let an older result overwrite settings chosen later. While generating, the active action reports progress and prevents duplicate submission.

## 8. Verification and acceptance

Deterministic fixtures cover a photographic gradient, cartoon line art, transparent PNG, uniform exterior background, and rotated image metadata. Unit tests verify orientation, crop math, 29/58/87 sizing, palette limits, legal MARD identities, connected-background behavior, detail-preserving isolated cleanup, and deterministic output.

Adapter tests cover camera and album selection, cancellation, permission denial, decoding failure, and the one-time memory fallback. Controller tests cover the first automatic generation, pending-setting behavior, latest-task wins, three preview modes, crop adjustment, replacement, and page-unload cleanup. UI contract tests verify the privacy message and absence of login or cloud calls. Both WeChat mini-program and H5 builds must pass.

Real-device acceptance records generation time rather than imposing a flaky CI timing gate. The targets are at most three seconds for the default 58-bead short side and at most six seconds for 87 on a representative mainstream phone. If measured performance misses those targets, the identical engine boundary may move to a Worker or WASM without relaxing output-quality assertions.

Milestone 8 is accepted when one camera or album image can complete this workflow locally, all three previews are crisp and consistent, every occupied cell is a valid MARD code, repeated runs are identical, and leaving the page removes the session state.

## 9. Explicit non-goals

Milestone 8 does not implement:

- cloud works, login, sharing, or community publishing;
- persistent local drafts or background uploads;
- AI segmentation or a downloaded background-removal model;
- arbitrary row and column input;
- manual bead editing, undo/redo, layers, or text tools;
- high-resolution construction-chart, PNG, or PDF export;
- 3D preview;
- Worker or WASM execution unless real-device measurements prove the main-runtime implementation inadequate.

## 10. Implementation task boundaries

1. Define the Milestone 8 domain contracts and deterministic image fixtures.
2. Implement local media acquisition, orientation normalization, 2048-pixel processing copies, and cleanup.
3. Implement suggested and manually adjustable crop data plus grid-size calculation.
4. Implement area sampling, mode recommendation, and cartoon/realistic sampling.
5. Implement immutable MARD Lab caching, constrained palette selection, and CIEDE2000 matching.
6. Implement edge-connected background removal, optional dithering, and protected isolated-color cleanup.
7. Implement the generator page, settings, latest-task controller, lifecycle cleanup, and three previews.
8. Run complete automated checks and multi-platform builds, record real-device performance, review the change, and publish the milestone only after acceptance.
