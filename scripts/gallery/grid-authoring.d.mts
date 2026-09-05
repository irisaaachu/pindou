export type MardColorCode = string;

export interface PaletteRegistry {
  readonly id: "mard-221";
  readonly version: "2026.09-pinned";
  readonly colors: Readonly<Record<MardColorCode, string>>;
}

export interface Grid {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly (MardColorCode | null)[];
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
export function setCell(grid: Grid, x: number, y: number, colorId: MardColorCode | null): Grid;
export function drawLine(grid: Grid, startX: number, startY: number, endX: number, endY: number, colorId: MardColorCode | null): Grid;
export function drawRect(grid: Grid, x: number, y: number, width: number, height: number, colorId: MardColorCode | null): Grid;
export function placeGlyph(grid: Grid, glyphRegistry: GlyphRegistry, glyphId: string, x: number, y: number, colorId: MardColorCode | null): Grid;
export function countBeads(grid: Grid): number;
export function collectColorIds(grid: Grid): MardColorCode[];
