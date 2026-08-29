import { validateProject } from "./validation";
import type { ProjectValidationResult } from "./validation";

export function migrateProject(input: unknown): ProjectValidationResult {
  return validateProject(input);
}
