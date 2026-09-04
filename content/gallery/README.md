# Gallery content catalog

`catalog.json` is the local source for approved gallery categories and patterns. Run `npm run validate:gallery` before building an import bundle, then run `npm run build:gallery-import` to produce local JSON files for the two gallery collections.

Every category and pattern requires a semantic version, creator, source type, license status, review status, acquisition date and publish status. Published records require both license and review approval. Pattern `usageTags` must reference a category slug. Pattern payloads live below this directory, are UTF-8 JSON assets, and must match their declared byte size and lowercase SHA-256 digest.

The generated import files contain only the field names accepted by the database schemas. They are local deployment artifacts: this tooling never stores credentials or uploads content.
