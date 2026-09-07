import { ciede2000, rgbToLab } from "./color-space";
import { getMardLabPalette, type MardLabColor } from "./mard-palette";
import type { SampledCell } from "./sample";

interface WeightedSample { sample: SampledCell; weight: number; key: string }

export function nearestMardColor(sample: Pick<SampledCell, "red" | "green" | "blue">, palette: readonly MardLabColor[]): MardLabColor {
  if (palette.length === 0) throw new Error("EMPTY_PALETTE");
  const lab = rgbToLab(sample.red, sample.green, sample.blue);
  return palette.reduce((best, candidate) => ciede2000(lab, candidate) < ciede2000(lab, best) ? candidate : best);
}

export function selectPalette(samples: readonly SampledCell[], limit: number): MardLabColor[] {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("INVALID_COLOR_LIMIT");
  const weighted = distinctSamples(samples.filter(({ alpha }) => alpha > 0));
  const target = Math.min(limit, weighted.length);
  if (target === 0) return [];
  const available = [...getMardLabPalette()];
  const selected: MardLabColor[] = [];
  while (selected.length < target) {
    const focus = weighted.reduce((best, entry) => score(entry, selected) > score(best, selected) ? entry : best);
    const candidate = nearestMardColor(focus.sample, available.filter(({ code }) => !selected.some((color) => color.code === code)));
    selected.push(candidate);
  }
  return selected;
}

function distinctSamples(samples: readonly SampledCell[]): WeightedSample[] {
  const map = new Map<string, WeightedSample>();
  for (const sample of samples) {
    const key = `${sample.red},${sample.green},${sample.blue},${sample.alpha}`;
    const existing = map.get(key);
    if (existing) existing.weight += 1;
    else map.set(key, { sample, weight: 1, key });
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function score(entry: WeightedSample, selected: readonly MardLabColor[]): number {
  if (selected.length === 0) return entry.weight;
  const lab = rgbToLab(entry.sample.red, entry.sample.green, entry.sample.blue);
  return entry.weight * Math.min(...selected.map((color) => ciede2000(lab, color)));
}
