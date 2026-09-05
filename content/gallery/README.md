# Gallery content catalog

`catalog.json` is the local source for approved gallery categories and patterns. Run `npm run validate:gallery` before building an import bundle, then run `node scripts/gallery/build-gallery-import.mjs --cloud-file-map content/gallery/cloud-file-map.json` to produce cloud-safe local JSON files for the two gallery collections. A non-empty pattern catalog is never packaged without the complete ignored cloud-file mapping.

Every category and pattern requires a semantic version, creator, source type, license status, review status, acquisition date and publish status. Published records require both license and review approval. Pattern `usageTags` must reference a category slug. Pattern payloads live below this directory, are UTF-8 JSON assets, and must match their declared byte size and lowercase SHA-256 digest.

The four pilot records are original Pindou Studio work at version `1.0.0` and use the pinned `mard-221@2026.09-pinned` palette. Their payload hashes, byte sizes, bead and color counts are verified from the committed lossless grid files; card previews retain the compact 8-pixel cell format, while detail previews use 64-pixel construction cells, four coordinate axes and a used-color legend whose rows determine the final image height. A maximum of eleven colors is enforced. Any one-cell color component is declared in the record so detached marks cannot silently enter the catalog.

Run `node scripts/gallery/build-gallery-upload-manifest.mjs` to create `generated/gallery-import/asset-upload-manifest.json`. It contains exactly twelve logical upload keys and repository-relative source paths: each pattern's payload, card preview and detail preview. It has no cloud file IDs, credentials or account-specific values.

The generated import files contain only the field names accepted by the database schemas. They are local deployment artifacts: this tooling never stores credentials or uploads content.
