import type {
  PindouProjectV1,
  PrintAnnotations,
  ProjectDirection,
} from "../project";

export type ExportFormat = "png" | "svg" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  direction: ProjectDirection;
  annotations: PrintAnnotations;
}

export interface ExportArtifact {
  fileName: string;
  mediaType: string;
  data: Uint8Array | string;
}

export interface ProjectExporter {
  export(project: PindouProjectV1, options: ExportOptions): Promise<ExportArtifact>;
}
