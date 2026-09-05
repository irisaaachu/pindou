export interface RenderPayload {
  width: number;
  height: number;
  direction?: "normal" | "reverse";
  cells: readonly (string | null)[];
}

export interface RenderPalette {
  colors: Readonly<Record<string, string>>;
}

export interface RenderConstructionChartOptions {
  direction?: "normal" | "reverse";
}

export function renderCardPng(
  payload: RenderPayload,
  palette: RenderPalette,
): Buffer;

export function renderConstructionChartPng(
  payload: RenderPayload,
  palette: RenderPalette,
  options?: RenderConstructionChartOptions,
): Buffer;
