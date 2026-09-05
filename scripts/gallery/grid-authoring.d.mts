export type PilotColorId = "cream" | "blush" | "lavender" | "sage" | "butter" | "cocoa" | "white" | "coral" | "mint" | "gold" | "charcoal";

export interface PaletteRegistry {
  readonly id: string;
  readonly version: string;
  readonly colors: Readonly<Record<PilotColorId, string>>;
}

export interface Grid {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly (PilotColorId | null)[];
}

export interface GlyphRegistry {
  readonly id: string;
  readonly version: string;
  readonly width: number;
  readonly height: number;
  readonly glyphs: Readonly<Record<string, readonly string[]>>;
}

export function loadPalette(filePath?: string): PaletteRegistry;
export function createGrid(width: number, height: number): Grid;
export function setCell(grid: Grid, x: number, y: number, colorId: PilotColorId | null): Grid;
export function drawLine(grid: Grid, startX: number, startY: number, endX: number, endY: number, colorId: PilotColorId | null): Grid;
export function drawRect(grid: Grid, x: number, y: number, width: number, height: number, colorId: PilotColorId | null): Grid;
export function placeGlyph(grid: Grid, glyphRegistry: GlyphRegistry, glyphId: string, x: number, y: number, colorId: PilotColorId | null): Grid;
export function countBeads(grid: Grid): number;
export function collectColorIds(grid: Grid): PilotColorId[];
