export const EXPECTED_COLLECTIONS: string[];

export interface FoundationSchema {
  permission?: Record<string, boolean | string>;
  required?: string[];
  properties?: Record<string, unknown>;
}

export function validateFoundationSchemas(
  schemas: Record<string, FoundationSchema>,
): string[];
