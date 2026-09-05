export interface RenderPatternPayload {
  width: number;
  height: number;
  cells: readonly (string | null)[];
}

export interface RenderPalette {
  colors: Readonly<Record<string, string>>;
}

export interface RenderPatternOptions {
  pixelsPerCell: number;
  showCoordinates: boolean;
  majorGuideEvery: number;
  pegboardSize: number;
}

export function renderPatternPng(
  payload: RenderPatternPayload,
  palette: RenderPalette,
  options: RenderPatternOptions,
): Buffer;
