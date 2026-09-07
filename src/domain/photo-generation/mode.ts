import type { SampledCell } from "./sample";

export function recommendMode(samples: readonly SampledCell[]): "cartoon" | "realistic" {
  if (samples.length === 0) return "realistic";
  const meanVariance = samples.reduce((sum, cell) => sum + cell.variance, 0) / samples.length;
  const edgeDensity = samples.filter((cell) => cell.edgeStrength >= 24).length / samples.length;
  return meanVariance < 400 && edgeDensity >= 0.25 ? "cartoon" : "realistic";
}
