export const EXPECTED_COLLECTIONS = [
  "pindou-projects",
  "pindou-gallery-categories",
  "pindou-gallery-patterns",
  "pindou-diy-categories",
  "pindou-diy-elements",
];

const PUBLIC_COLLECTIONS = EXPECTED_COLLECTIONS.filter(
  (collection) => collection !== "pindou-projects" && !collection.startsWith("pindou-gallery-"),
);
const CLOUD_OBJECT_ONLY_COLLECTIONS = EXPECTED_COLLECTIONS.filter(
  (collection) => collection.startsWith("pindou-gallery-"),
);
const WRITE_OPERATIONS = ["create", "update", "delete"];
const PROVENANCE_FIELDS = [
  "creator",
  "source_type",
  "license_status",
  "review_status",
  "acquired_at",
  "publish_status",
  "order",
];
const FORBIDDEN_PROJECT_FIELDS = [
  "original_photo",
  "original_photo_path",
  "original_photo_bytes",
  "export_file",
];
const READ_GATES = {
  publish_status: "doc.publish_status == 'published'",
  license_status: "doc.license_status == 'approved'",
  review_status: "doc.review_status == 'approved'",
};

export function validateFoundationSchemas(schemas) {
  const issues = [];

  for (const collection of EXPECTED_COLLECTIONS) {
    if (!schemas[collection]) issues.push(`Missing schema: ${collection}`);
  }

  const projects = schemas["pindou-projects"];
  if (projects) {
    for (const operation of ["read", ...WRITE_OPERATIONS]) {
      if (projects.permission?.[operation] !== false) {
        issues.push(`pindou-projects permission.${operation} must be false`);
      }
    }
    for (const field of FORBIDDEN_PROJECT_FIELDS) {
      if (field in (projects.properties ?? {})) {
        issues.push(`pindou-projects contains forbidden property: ${field}`);
      }
    }
  }

  for (const collection of PUBLIC_COLLECTIONS) {
    const schema = schemas[collection];
    if (!schema) continue;

    for (const operation of WRITE_OPERATIONS) {
      if (schema.permission?.[operation] !== false) {
        issues.push(`${collection} permission.${operation} must be false`);
      }
    }

    const read = schema.permission?.read;
    for (const [field, expression] of Object.entries(READ_GATES)) {
      if (typeof read !== "string" || !read.includes(expression)) {
        issues.push(`${collection} permission.read must require approved ${field}`);
      }
    }

    for (const field of PROVENANCE_FIELDS) {
      if (!schema.required?.includes(field) || !(field in (schema.properties ?? {}))) {
        issues.push(`${collection} missing required property: ${field}`);
      }
    }
  }

  for (const collection of CLOUD_OBJECT_ONLY_COLLECTIONS) {
    const schema = schemas[collection];
    if (!schema) continue;
    for (const operation of ["read", ...WRITE_OPERATIONS]) {
      if (schema.permission?.[operation] !== false) {
        issues.push(`${collection} permission.${operation} must be false`);
      }
    }
    for (const field of PROVENANCE_FIELDS) {
      if (!schema.required?.includes(field) || !(field in (schema.properties ?? {}))) {
        issues.push(`${collection} missing required property: ${field}`);
      }
    }
  }

  return issues;
}
