import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";
import { afterEach, describe, expect, test } from "vitest";

import { buildPilotContent } from "../../scripts/gallery/build-pilot-content.mjs";
import { renderCardPng, renderConstructionChartPng } from "../../scripts/gallery/render-pattern-png.mjs";

const axisSize = 64;
const cellSize = 64;
const fontScale = 4;
const legendItemWidth = 256;
const legendItemHeight = 128;
const legendColumnGap = 32;
const legendRowGap = 24;
const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const glyphs: Record<string, readonly string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
};
const palette = {
  colors: {
    A1: "#FAF4C8",
    A2: "#FFFFD5",
    A10: "#F77C31",
    A11: "#FFDD99",
    B1: "#F5A0C2",
    C1: "#C1C1C1",
    D1: "#D1D1D1",
    E1: "#E1E1E1",
    F1: "#818181",
    G1: "#717171",
    H7: "#1A1A1A",
    M1: "#616161",
  },
};
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

function fixture() {
  return {
    width: 3,
    height: 2,
    direction: "normal" as const,
    cells: ["A1", "H7", null, null, null, null],
  };
}

function decode(buffer: Buffer) {
  return PNG.sync.read(buffer);
}

function pixel(image: PNG, x: number, y: number) {
  const offset = (y * image.width + x) * 4;
  return [...image.data.subarray(offset, offset + 4)];
}

function rgb(hex: string) {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16), 255];
}

function bitmapSignature(label: string) {
  if (!label) return "";
  return Array.from({ length: 7 }, (_, row) => [...label].map((character) => glyphs[character][row]).join("0")).join("/");
}

function bitmapWidth(label: string, scale = fontScale) {
  return (label.length * 5 + Math.max(0, label.length - 1)) * scale;
}

function sampledSignature(image: PNG, x: number, y: number, characters: number, ink: readonly number[], scale = fontScale) {
  const rows: string[] = [];
  for (let glyphY = 0; glyphY < 7; glyphY += 1) {
    let row = "";
    for (let glyphX = 0; glyphX < characters * 5 + Math.max(0, characters - 1); glyphX += 1) {
      row += pixel(image, x + glyphX * scale + 1, y + glyphY * scale + 1).every((value, index) => value === ink[index]) ? "1" : "0";
    }
    rows.push(row);
  }
  return rows.join("/");
}

function centeredTextSignature(image: PNG, areaX: number, areaY: number, areaWidth: number, areaHeight: number, label: string, ink = [0, 0, 0, 255], scale = fontScale) {
  if (!label) return "";
  const x = areaX + Math.floor((areaWidth - bitmapWidth(label, scale)) / 2);
  const y = areaY + Math.floor((areaHeight - 7 * scale) / 2);
  return sampledSignature(image, x, y, label.length, ink, scale);
}

function cellTextSignature(image: PNG, column: number, row: number) {
  const x = axisSize + column * cellSize;
  const y = axisSize + row * cellSize;
  const background = pixel(image, x + 6, y + 6);
  const ink = background.slice(0, 3).every((value) => value === 255) || background[0] > 200
    ? [0, 0, 0, 255]
    : [255, 255, 255, 255];
  const candidates = ["A1", "A10", "A11", "H7"];
  for (const label of candidates) {
    const scale = label.length === 3 ? 3 : fontScale;
    const signature = centeredTextSignature(image, x, y, cellSize, cellSize, label, ink, scale);
    if (signature === bitmapSignature(label)) return signature;
  }
  return "";
}

function nonWhitePixelCount(image: PNG, startX: number, startY: number, endX: number, endY: number) {
  let count = 0;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (!pixel(image, x, y).every((value) => value === 255)) count += 1;
    }
  }
  return count;
}

function readBitmapText(image: PNG, x: number, y: number, maximumCharacters: number) {
  let result = "";
  for (let index = 0; index < maximumCharacters; index += 1) {
    const glyphX = x + index * 6 * fontScale;
    const signature = sampledSignature(image, glyphX, y, 1, [0, 0, 0, 255]);
    const character = Object.entries(glyphs).find(([, rows]) => rows.join("/") === signature)?.[0];
    if (!character) break;
    result += character;
  }
  return result;
}

function readLegend(image: PNG) {
  const columns = Math.max(1, Math.floor((image.width - 128 + legendColumnGap) / (legendItemWidth + legendColumnGap)));
  const gridHeight = fixture().height * cellSize;
  const legendTop = axisSize + gridHeight + axisSize + 64;
  const colorEntries = Object.entries(palette.colors);
  const items: Array<{ code: string; count: number }> = [];
  for (let index = 0; ; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const itemX = 64 + column * (legendItemWidth + legendColumnGap);
    const itemY = legendTop + row * (legendItemHeight + legendRowGap);
    if (itemY + legendItemHeight > image.height - 64 + 1) break;
    const swatch = pixel(image, itemX + 48, itemY + 64);
    const code = colorEntries.find(([, hex]) => rgb(hex).every((value, component) => swatch[component] === value))?.[0];
    if (!code) continue;
    items.push({
      code: readBitmapText(image, itemX + 112, itemY + 24, 3),
      count: Number(readBitmapText(image, itemX + 112, itemY + 76, 4)),
    });
  }
  return items;
}

function guideRunWidth(image: PNG, boundaryX: number, y: number) {
  let start = boundaryX;
  let end = boundaryX;
  while (pixel(image, start - 1, y).slice(0, 3).every((value) => value === 64)) start -= 1;
  while (pixel(image, end + 1, y).slice(0, 3).every((value) => value === 64)) end += 1;
  return end - start + 1;
}

function guideRunHeight(image: PNG, x: number, boundaryY: number) {
  let start = boundaryY;
  let end = boundaryY;
  while (pixel(image, x, start - 1).slice(0, 3).every((value) => value === 64)) start -= 1;
  while (pixel(image, x, end + 1).slice(0, 3).every((value) => value === 64)) end += 1;
  return end - start + 1;
}

describe("pattern PNG renderer", () => {
  test("keeps deterministic round beads exclusive to the compact card image", () => {
    const payload = { width: 2, height: 1, cells: ["A1", null] };
    const first = renderCardPng(payload, palette);
    const second = renderCardPng(payload, palette);
    const image = decode(first);

    expect(first.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(image).toMatchObject({ width: 16, height: 8 });
    expect(first.equals(second)).toBe(true);
    expect(pixel(image, 4, 4)).not.toEqual(pixel(image, 1, 4));
    expect(pixel(image, 12, 4)[3]).toBe(0);
  });

  test("renders square coded cells and a count-derived legend at the exact geometry", () => {
    const first = renderConstructionChartPng(fixture(), palette);
    const second = renderConstructionChartPng(fixture(), palette);
    const image = decode(first);

    expect(image).toMatchObject({ width: 320, height: 664 });
    expect(first.equals(second)).toBe(true);
    expect(cellTextSignature(image, 0, 0)).toBe(bitmapSignature("A1"));
    expect(cellTextSignature(image, 1, 0)).toBe(bitmapSignature("H7"));
    expect(cellTextSignature(image, 2, 0)).toBe(bitmapSignature(""));
    expect(pixel(image, axisSize + 2 * cellSize + 32, axisSize + 32)).toEqual([255, 255, 255, 255]);
    expect(readLegend(image)).toEqual([
      { code: "A1", count: 1 },
      { code: "H7", count: 1 },
    ]);
  });

  test("uses black glyphs on pale cells and white glyphs on dark cells", () => {
    const image = decode(renderConstructionChartPng(fixture(), palette));
    const paleOriginX = axisSize + Math.floor((cellSize - bitmapWidth("A1")) / 2);
    const darkOriginX = axisSize + cellSize + Math.floor((cellSize - bitmapWidth("H7")) / 2);
    const glyphY = axisSize + Math.floor((cellSize - 7 * fontScale) / 2);

    expect(pixel(image, paleOriginX + 2 * fontScale + 1, glyphY + 1)).toEqual([0, 0, 0, 255]);
    expect(pixel(image, darkOriginX + 1, glyphY + 1)).toEqual([255, 255, 255, 255]);
  });

  test("keeps a three-character MARD code inside its cell", () => {
    const image = decode(renderConstructionChartPng({ width: 2, height: 1, direction: "normal", cells: [null, "A11"] }, palette));

    expect(nonWhitePixelCount(image, axisSize + 3, axisSize + 3, axisSize + cellSize, axisSize + cellSize - 2)).toBe(0);
    expect(cellTextSignature(image, 1, 0)).toBe(bitmapSignature("A11"));
  });

  test("labels all four coordinate bands in their edge-reading order", () => {
    const image = decode(renderConstructionChartPng(fixture(), palette));
    const top = ["1", "2", "3"].map((label, column) => centeredTextSignature(image, axisSize + column * cellSize, 0, cellSize, axisSize, label));
    const bottom = ["3", "2", "1"].map((label, column) => centeredTextSignature(image, axisSize + column * cellSize, axisSize + 2 * cellSize, cellSize, axisSize, label));
    const left = ["1", "2"].map((label, row) => centeredTextSignature(image, 0, axisSize + row * cellSize, axisSize, cellSize, label));
    const right = ["2", "1"].map((label, row) => centeredTextSignature(image, axisSize + 3 * cellSize, axisSize + row * cellSize, axisSize, cellSize, label));

    expect(top).toEqual([bitmapSignature("1"), bitmapSignature("2"), bitmapSignature("3")]);
    expect(bottom).toEqual([bitmapSignature("3"), bitmapSignature("2"), bitmapSignature("1")]);
    expect(left).toEqual([bitmapSignature("1"), bitmapSignature("2")]);
    expect(right).toEqual([bitmapSignature("2"), bitmapSignature("1")]);
  });

  test("draws one-, three- and five-pixel guide runs at cell, ten-cell and board boundaries", () => {
    const vertical = decode(renderConstructionChartPng({ width: 30, height: 1, direction: "normal", cells: Array(30).fill(null) }, palette));
    const horizontal = decode(renderConstructionChartPng({ width: 1, height: 30, direction: "normal", cells: Array(30).fill(null) }, palette));

    expect(guideRunWidth(vertical, axisSize + cellSize, axisSize + 32)).toBe(1);
    expect(guideRunWidth(vertical, axisSize + 10 * cellSize, axisSize + 32)).toBe(3);
    expect(guideRunWidth(vertical, axisSize + 29 * cellSize, axisSize + 32)).toBe(5);
    expect(guideRunHeight(horizontal, axisSize + 32, axisSize + cellSize)).toBe(1);
    expect(guideRunHeight(horizontal, axisSize + 32, axisSize + 10 * cellSize)).toBe(3);
    expect(guideRunHeight(horizontal, axisSize + 32, axisSize + 29 * cellSize)).toBe(5);
  });

  test("sorts legend codes naturally and derives exact quantities", () => {
    const payload = {
      width: 3,
      height: 2,
      direction: "normal" as const,
      cells: ["B1", "A10", "A2", "A2", null, null],
    };
    const image = decode(renderConstructionChartPng(payload, palette));

    expect(readLegend(image)).toEqual([
      { code: "A2", count: 2 },
      { code: "A10", count: 1 },
      { code: "B1", count: 1 },
    ]);
  });

  test("uses the formula-derived dimensions for 58×29 and 29×29 charts", () => {
    const elevenCodes = ["A1", "A2", "A10", "B1", "C1", "D1", "E1", "F1", "G1", "H7", "M1"];
    const sevenCodes = elevenCodes.slice(0, 7);
    const wide = decode(renderConstructionChartPng({ width: 58, height: 29, direction: "normal", cells: [...elevenCodes, ...Array(58 * 29 - elevenCodes.length).fill(null)] }, palette));
    const square = decode(renderConstructionChartPng({ width: 29, height: 29, direction: "normal", cells: [...sevenCodes, ...Array(29 * 29 - sevenCodes.length).fill(null)] }, palette));

    expect(wide).toMatchObject({ width: 3840, height: 2240 });
    expect(square).toMatchObject({ width: 1984, height: 2392 });
  }, 20_000);

  test("mirrors only the displayed cells and leaves payload bytes unchanged", () => {
    const payload = { width: 3, height: 1, direction: "reverse" as const, cells: ["A1", null, "H7"] };
    const before = Buffer.from(JSON.stringify(payload));
    const reverse = decode(renderConstructionChartPng(payload, palette));
    const normal = decode(renderConstructionChartPng(payload, palette, { direction: "normal" }));

    expect(pixel(reverse, axisSize + 32, axisSize + 32)).toEqual(rgb(palette.colors.H7));
    expect(pixel(reverse, axisSize + 2 * cellSize + 32, axisSize + 32)).toEqual(rgb(palette.colors.A1));
    expect(pixel(normal, axisSize + 32, axisSize + 32)).toEqual(rgb(palette.colors.A1));
    expect(pixel(normal, axisSize + 2 * cellSize + 32, axisSize + 32)).toEqual(rgb(palette.colors.H7));
    expect(Buffer.from(JSON.stringify(payload))).toEqual(before);
  });

  test("rejects unknown colors, malformed grids and unsupported directions", () => {
    expect(() => renderConstructionChartPng({ width: 1, height: 1, direction: "normal", cells: ["missing"] }, palette)).toThrow("Unknown palette color: missing.");
    expect(() => renderCardPng({ width: 2, height: 2, cells: ["A1"] }, palette)).toThrow("Payload cells length must equal width × height.");
    expect(() => renderConstructionChartPng({ width: 1, height: 1, direction: "sideways" as never, cells: [null] }, palette)).toThrow("Chart direction must be normal or reverse.");
  });

  test("reproduces all four committed cards and construction charts byte-for-byte at their exact dimensions", async () => {
    const outputDirectory = await mkdtemp(resolve(tmpdir(), "pilot-previews-"));
    temporaryDirectories.push(outputDirectory);
    await buildPilotContent({ payloadRoot: resolve(outputDirectory, "payloads"), previewRoot: outputDirectory });

    const expectedArtifacts = [
      { id: "inside-cute-dog-sign", card: [464, 232], detail: [3840, 2240] },
      { id: "delivery-block-door-sign", card: [464, 232], detail: [3840, 2240] },
      { id: "birthday-dog-cake-bouquet", card: [232, 232], detail: [1984, 2392] },
      { id: "farewell-fortune-sign", card: [464, 232], detail: [3840, 2240] },
    ];
    for (const expected of expectedArtifacts) {
      const fileName = `${expected.id}-v1.png`;
      const [generatedCard, committedCard, generatedDetail, committedDetail] = await Promise.all([
        readFile(resolve(outputDirectory, "card", fileName)),
        readFile(resolve(rootDirectory, "content/gallery/previews/card", fileName)),
        readFile(resolve(outputDirectory, "detail", fileName)),
        readFile(resolve(rootDirectory, "content/gallery/previews/detail", fileName)),
      ]);

      expect(generatedCard).toEqual(committedCard);
      expect(generatedDetail).toEqual(committedDetail);
      expect(decode(generatedCard)).toMatchObject({ width: expected.card[0], height: expected.card[1] });
      expect(decode(generatedDetail)).toMatchObject({ width: expected.detail[0], height: expected.detail[1] });
    }
  }, 30_000);
});
