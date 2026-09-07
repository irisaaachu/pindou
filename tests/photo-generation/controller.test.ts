import { describe, expect, test, vi } from "vitest";
import { PhotoMediaError, type PhotoMediaAdapter } from "../../src/adapters/photo-generation";
import { createInitialPhotoGenerationState, createPhotoGenerationController } from "../../src/application/photo-generation";
import type { GenerationEngine } from "../../src/domain/contracts";
import { createFourColorCartoonPhotoInput } from "../fixtures/photo-generation/fixtures";

const image = createFourColorCartoonPhotoInput();
const result = { grid: { width: 29, height: 29, palette: { id: "mard-221" as const, version: "2026.09-pinned" as const }, cells: Array(841).fill("A1") }, summary: { beadCount: 841, colorCount: 1, physicalWidthMm: 145, physicalHeightMm: 145, recommendedMode: "cartoon" as const, elapsedMs: 1 } };
const adapter = (overrides: Partial<PhotoMediaAdapter> = {}): PhotoMediaAdapter => ({ choose: vi.fn().mockResolvedValue({ source: "album", filePath: "private" }), decode: vi.fn().mockResolvedValue(image), release: vi.fn(), ...overrides });

describe("photo generation controller", () => {
  test("keeps idle on cancellation then automatically generates after crop confirmation", async () => {
    const cancelled = createInitialPhotoGenerationState();
    await createPhotoGenerationController({ media: adapter({ choose: vi.fn().mockRejectedValue(new PhotoMediaError("CANCELLED")) }), engine: { generate: vi.fn() } }, cancelled).choosePhoto("album");
    expect(cancelled.view.status).toBe("idle");
    const state = createInitialPhotoGenerationState();
    const engine = { generate: vi.fn().mockResolvedValue(result) };
    const controller = createPhotoGenerationController({ media: adapter(), engine }, state);
    await controller.choosePhoto("album");
    expect(state.view.status).toBe("cropping");
    await controller.confirmCrop();
    expect(state.view.status).toBe("ready");
    expect(engine.generate).toHaveBeenCalledTimes(1);
  });

  test("retains result until explicit regeneration", async () => {
    const state = createInitialPhotoGenerationState();
    const controller = createPhotoGenerationController({ media: adapter(), engine: { generate: vi.fn().mockResolvedValue(result) } }, state);
    await controller.choosePhoto("album"); await controller.confirmCrop();
    controller.updateSettings({ colorLimit: 12 });
    expect(state.hasPendingSettings).toBe(true);
    expect(state.view.status).toBe("ready");
    await controller.regenerate();
    expect(state.hasPendingSettings).toBe(false);
  });

  test("ignores stale and post-dispose generation completions", async () => {
    const resolvers: Array<(value: typeof result) => void> = [];
    const engine: GenerationEngine = { generate: vi.fn().mockImplementation(() => new Promise((resolve) => { resolvers.push(resolve); })) };
    const media = adapter(); const state = createInitialPhotoGenerationState();
    const controller = createPhotoGenerationController({ media, engine }, state);
    await controller.choosePhoto("album");
    const first = controller.confirmCrop(); const second = controller.regenerate();
    resolvers[1](result); await second; resolvers[0]({ ...result, summary: { ...result.summary, beadCount: 1 } }); await first;
    expect(state.view.status === "ready" && state.view.result.summary.beadCount).toBe(841);
    const late = controller.regenerate(); controller.dispose(); resolvers[2](result); await late;
    expect(state.view.status).toBe("idle"); expect(media.release).toHaveBeenCalled();
  });
});
