# Gallery content catalog

`catalog.json` is the local source for approved gallery categories and patterns. Run `npm run validate:gallery` before building an import bundle, then run `npm run build:gallery-import` to produce local JSON files for the two gallery collections.

Every category and pattern requires a semantic version, creator, source type, license status, review status, acquisition date and publish status. Published records require both license and review approval. Pattern `usageTags` must reference a category slug. Pattern payloads live below this directory, are UTF-8 JSON assets, and must match their declared byte size and lowercase SHA-256 digest.

The four pilot records are original Pindou Studio work at version `1.0.0`. Their payload hashes, byte sizes, bead and color counts are verified from the committed lossless grid files; card and detail previews are verified as PNGs at their required grid dimensions. A maximum of eleven colors is enforced. Any one-cell color component is declared in the record so detached marks cannot silently enter the catalog.

Run `node scripts/gallery/build-gallery-upload-manifest.mjs` to create `generated/gallery-import/asset-upload-manifest.json`. It contains exactly twelve logical upload keys and repository-relative source paths: each pattern's payload, card preview and detail preview. It has no cloud file IDs, credentials or account-specific values.

The generated import files contain only the field names accepted by the database schemas. They are local deployment artifacts: this tooling never stores credentials or uploads content.
