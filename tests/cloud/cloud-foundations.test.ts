import { describe, expect, test } from "vitest";

import {
  EXPECTED_COLLECTIONS,
  validateFoundationSchemas,
} from "../../scripts/cloud/foundation-contract.mjs";

const publicRead = "doc.publish_status == 'published' && doc.license_status == 'approved' && doc.review_status == 'approved'";
const provenanceFields = [
  "creator",
  "source_type",
  "license_status",
  "review_status",
  "acquired_at",
  "publish_status",
  "order",
];

describe("validateFoundationSchemas", () => {
  test("includes a read-only gallery cloud object with its shared dependency", () => {
    const directory = "uniCloud-aliyun/cloudfunctions/pindou-gallery";
    for (const file of ["gallery-core.js", "index.obj.js", "package.json"]) {
      expect(existsSync(`${directory}/${file}`)).toBe(true);
    }
    const packageJson = JSON.parse(readFileSync(`${directory}/package.json`, "utf8"));
    expect(packageJson.dependencies).toMatchObject({
      "pindou-cloud-common": "file:../common/pindou-cloud-common",
    });
  });

  test("accepts the complete secure foundation", () => {
    expect(validateFoundationSchemas(validSchemas())).toEqual([]);
  });

  test("reports a missing collection", () => {
    const schemas = validSchemas();
    delete schemas["pindou-diy-elements"];

    expect(validateFoundationSchemas(schemas)).toContain(
      "Missing schema: pindou-diy-elements",
    );
  });

  test.each(["read", "create", "update", "delete"])(
    "rejects private project %s access",
    (operation) => {
      const schemas = validSchemas();
      schemas["pindou-projects"].permission[operation] = true;

      expect(validateFoundationSchemas(schemas)).toContain(
        `pindou-projects permission.${operation} must be false`,
      );
    },
  );

  test.each(["create", "update", "delete"])(
    "rejects public content %s access",
    (operation) => {
      const schemas = validSchemas();
      schemas["pindou-gallery-patterns"].permission[operation] = true;

      expect(validateFoundationSchemas(schemas)).toContain(
        `pindou-gallery-patterns permission.${operation} must be false`,
      );
    },
  );

  test.each(["publish_status", "license_status", "review_status"])(
    "requires the %s read gate",
    (field) => {
      const schemas = validSchemas();
      schemas["pindou-diy-elements"].permission.read = publicRead
        .split(" && ")
        .filter((clause) => !clause.includes(`doc.${field}`))
        .join(" && ");

      expect(validateFoundationSchemas(schemas)).toContain(
        `pindou-diy-elements permission.read must require approved ${field}`,
      );
    },
  );

  test("requires provenance fields on public content", () => {
    const schemas = validSchemas();
    delete schemas["pindou-gallery-patterns"].properties.review_status;

    expect(validateFoundationSchemas(schemas)).toContain(
      "pindou-gallery-patterns missing required property: review_status",
    );
  });

  test("requires gallery collections to deny direct client reads", () => {
    const schemas = validSchemas();
    schemas["pindou-gallery-categories"].permission.read = "doc.publish_status == 'published'";
    expect(validateFoundationSchemas(schemas)).toContain("pindou-gallery-categories permission.read must be false");
  });

  test.each([
    "original_photo",
    "original_photo_path",
    "original_photo_bytes",
    "export_file",
  ])("rejects forbidden private project field %s", (field) => {
    const schemas = validSchemas();
    schemas["pindou-projects"].properties[field] = { bsonType: "string" };

    expect(validateFoundationSchemas(schemas)).toContain(
      `pindou-projects contains forbidden property: ${field}`,
    );
  });
});

function validSchemas(): Record<string, FoundationSchema> {
  return Object.fromEntries(EXPECTED_COLLECTIONS.map((collection) => {
    if (collection === "pindou-projects") {
      return [collection, {
        permission: { read: false, create: false, update: false, delete: false },
        required: ["owner_id", "project_id"],
        properties: { owner_id: {}, project_id: {} },
      }];
    }

    return [collection, {
      permission: { read: collection.startsWith("pindou-gallery-") ? false : publicRead, create: false, update: false, delete: false },
      required: [...provenanceFields],
      properties: Object.fromEntries(provenanceFields.map((field) => [field, {}])),
    }];
  }));
}

interface FoundationSchema {
  permission: Record<string, boolean | string>;
  required: string[];
  properties: Record<string, { bsonType?: string }>;
}
import { existsSync, readFileSync } from "node:fs";
