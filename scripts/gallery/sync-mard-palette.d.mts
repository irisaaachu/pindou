export type MardColorCode = string;

export interface MardPalette {
  readonly id: "mard-221";
  readonly version: "2026.09-pinned";
  readonly source: Readonly<{
    readonly repository: "https://github.com/maxcleme/beadcolors";
    readonly commit: "29229889daab404fb30531d4bb785fd73f7f58e3";
    readonly path: "raw/mard.csv";
    readonly license: "MIT";
  }>;
  readonly colors: Readonly<Record<MardColorCode, string>>;
}

export function syncMardPalette(csvText: string): MardPalette;
