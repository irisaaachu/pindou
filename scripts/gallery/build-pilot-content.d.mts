export interface PilotPatternPayload {
  contentId: string;
  width: number;
  height: number;
  cells: readonly (string | null)[];
}

export interface PilotContentBuildOptions {
  payloadRoot?: string;
  previewRoot?: string;
}

export function buildPilotPayloads(outputRoot?: string): Promise<PilotPatternPayload[]>;
export function buildPilotContent(options?: PilotContentBuildOptions): Promise<PilotPatternPayload[]>;
