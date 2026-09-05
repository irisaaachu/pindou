import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";
import { afterEach, describe, expect, test } from "vitest";

import { buildPilotContent } from "../../scripts/gallery/build-pilot-content.mjs";
import { renderPatternPng } from "../../scripts/gallery/render-pattern-png.mjs";

const palette = {
  colors: {
    coral: "#E98278",
    cream: "#F7E8CB",
  },
};
const generatedPreviewRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../content/gallery/previews");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

function fixture(width = 3, height = 2) {
  return {
    width,
    height,
    cells: ["coral", ...Array(width * height - 1).fill(null)],
  };
}

function decode(buffer: Buffer) {
  return PNG.sync.read(buffer);
}

function pixel(image: PNG, x: number, y: number) {
  const offset = (y * image.width + x) * 4;
  return [...image.data.subarray(offset, offset + 4)];
}

describe("pattern PNG renderer", () => {
  test("renders a deterministic PNG with the requested grid dimensions", () => {
    const first = renderPatternPng(fixture(), palette, { pixelsPerCell: 8, showCoordinates: false, majorGuideEvery: 10, pegboardSize: 29 });
    const second = renderPatternPng(fixture(), palette, { pixelsPerCell: 8, showCoordinates: false, majorGuideEvery: 10, pegboardSize: 29 });
    const image = decode(first);

    expect(first.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(image).toMatchObject({ width: 24, height: 16 });
    expect(first.equals(second)).toBe(true);
  });

  test("uses exact detail margins and keeps empty peg centres transparent", () => {
    const image = decode(renderPatternPng(fixture(), palette, { pixelsPerCell: 32, showCoordinates: true, majorGuideEvery: 10, pegboardSize: 29 }));

    expect(image).toMatchObject({ width: 160, height: 128 });
    expect(pixel(image, 64 + 48, 64 + 16)[3]).toBe(0);
    expect(pixel(image, 16, 16)[3]).toBe(255);
  });

  test("renders circular bead centres differently from their edges", () => {
    const image = decode(renderPatternPng(fixture(1, 1), palette, { pixelsPerCell: 32, showCoordinates: false, majorGuideEvery: 10, pegboardSize: 29 }));

    expect(pixel(image, 16, 16)).not.toEqual(pixel(image, 3, 16));
    expect(pixel(image, 3, 16)[3]).toBe(255);
  });

  test("draws tenth-bead guides, 29-bead board boundaries, and shifted detail coordinates", () => {
    const guideImage = decode(renderPatternPng(fixture(30, 1), palette, { pixelsPerCell: 8, showCoordinates: false, majorGuideEvery: 10, pegboardSize: 29 }));
    const card = decode(renderPatternPng(fixture(1, 1), palette, { pixelsPerCell: 32, showCoordinates: false, majorGuideEvery: 10, pegboardSize: 29 }));
    const detail = decode(renderPatternPng(fixture(1, 1), palette, { pixelsPerCell: 32, showCoordinates: true, majorGuideEvery: 10, pegboardSize: 29 }));

    expect(pixel(guideImage, 80, 4)[3]).toBe(255);
    expect(pixel(guideImage, 232, 4)[3]).toBe(255);
    expect(pixel(detail, 64 + 16, 64 + 16)).toEqual(pixel(card, 16, 16));
    expect(pixel(detail, 16, 16)[3]).toBe(255);
  });

  test("rejects unknown palette colors and malformed payload cell counts", () => {
    expect(() => renderPatternPng({ width: 1, height: 1, cells: ["missing"] }, palette, { pixelsPerCell: 8, showCoordinates: false, majorGuideEvery: 10, pegboardSize: 29 })).toThrow("Unknown palette color: missing.");
    expect(() => renderPatternPng({ width: 2, height: 2, cells: ["coral"] }, palette, { pixelsPerCell: 8, showCoordinates: false, majorGuideEvery: 10, pegboardSize: 29 })).toThrow("Payload cells length must equal width × height.");
  });

  test("generates the eight committed card and detail previews from the pilot payloads", async () => {
    const outputDirectory = await mkdtemp(resolve(tmpdir(), "pilot-previews-"));
    temporaryDirectories.push(outputDirectory);
    await buildPilotContent({ payloadRoot: resolve(outputDirectory, "payloads"), previewRoot: outputDirectory });

    const expected = [
      ["inside-cute-dog-sign-v1", 464, 232, 1920, 992],
      ["delivery-block-door-sign-v1", 464, 232, 1920, 992],
      ["birthday-dog-cake-bouquet-v1", 232, 232, 992, 992],
      ["farewell-fortune-sign-v1", 464, 232, 1920, 992],
    ] as const;

    for (const [id, cardWidth, cardHeight, detailWidth, detailHeight] of expected) {
      const [generatedCard, generatedDetail, committedCard, committedDetail] = await Promise.all([
        readFile(resolve(outputDirectory, "card", `${id}.png`)),
        readFile(resolve(outputDirectory, "detail", `${id}.png`)),
        readFile(resolve(generatedPreviewRoot, "card", `${id}.png`)),
        readFile(resolve(generatedPreviewRoot, "detail", `${id}.png`)),
      ]);

      expect(decode(generatedCard)).toMatchObject({ width: cardWidth, height: cardHeight });
      expect(decode(generatedDetail)).toMatchObject({ width: detailWidth, height: detailHeight });
      expect(generatedCard.equals(committedCard)).toBe(true);
      expect(generatedDetail.equals(committedDetail)).toBe(true);
    }
  }, 15_000);
});
