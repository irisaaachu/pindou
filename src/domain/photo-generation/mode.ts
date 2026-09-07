import type { SampledCell } from "./sample";

export function recommendMode(samples: readonly SampledCell[]): "cartoon" | "realistic" {
  if (samples.length === 0) return "realistic";
  const meanVariance = samples.reduce((sum, cell) => sum + cell.variance, 0) / samples.length;
  const edgeDensity = samples.filter((cell) => cell.edgeStrength >= 24).length / samples.length;
  const gradientSteps = samples.slice(1).filter((cell, index) => {
    const previous = samples[index];
    const delta = Math.abs(cell.red - previous.red) + Math.abs(cell.green - previous.green) + Math.abs(cell.blue - previous.blue);
    return delta >= 24 && delta <= 240;
  }).length;
  const gradientPrevalence = gradientSteps / Math.max(1, samples.length - 1);
  return meanVariance < 400 && edgeDensity >= 0.25 && gradientPrevalence < 0.6 ? "cartoon" : "realistic";
}
