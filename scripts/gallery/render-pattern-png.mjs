import { readFileSync } from "node:fs";

import { PNG } from "pngjs";

const cardCellSize = 8;
const cellSize = 64;
const axisSize = 64;
const legendSideMargin = 64;
const legendTopGap = 64;
const legendBottomMargin = 64;
const legendItemWidth = 256;
const legendItemHeight = 128;
const legendColumnGap = 32;
const legendRowGap = 24;
const fontScale = 4;
const compactCellFontScale = 3;
const transparent = [0, 0, 0, 0];
const white = [255, 255, 255, 255];
const black = [0, 0, 0, 255];
const guideInk = [64, 64, 64, 255];
const bitmapRegistry = loadBitmapRegistry();

export function renderCardPng(payload, palette) {
  assertPayload(payload);
  assertPalette(palette);
  assertCellColors(payload, palette);

  const image = createImage(payload.width * cardCellSize, payload.height * cardCellSize, transparent);
  drawCardGuides(image, payload.width, payload.height);
  drawBeads(image, payload, palette);
  return encode(image);
}

export function renderConstructionChartPng(payload, palette, options = {}) {
  assertPayload(payload);
  assertPalette(palette);
  const direction = options.direction ?? payload.direction;
  assertDirection(direction);
  const legend = collectLegend(payload, palette);
  const width = payload.width * cellSize + axisSize * 2;
  const columns = Math.max(1, Math.floor((width - legendSideMargin * 2 + legendColumnGap) / (legendItemWidth + legendColumnGap)));
  const rows = Math.ceil(legend.length / columns);
  const legendHeight = legendTopGap + rows * legendItemHeight + Math.max(0, rows - 1) * legendRowGap + legendBottomMargin;
  const height = payload.height * cellSize + axisSize * 2 + legendHeight;
  const image = createImage(width, height, white);

  drawChartCells(image, payload, palette, direction);
  drawCoordinates(image, payload.width, payload.height);
  drawLegend(image, legend, payload.height, columns);
  drawConstructionGuides(image, payload.width, payload.height);
  return encode(image);
}

function loadBitmapRegistry() {
  const path = new URL("../../content/gallery/glyphs/chart-bitmap-v1.json", import.meta.url);
  const registry = JSON.parse(readFileSync(path, "utf8"));
  if (!Number.isInteger(registry.width) || !Number.isInteger(registry.height) || !Number.isInteger(registry.spacing) || !registry.glyphs || typeof registry.glyphs !== "object") throw new Error("Chart bitmap registry is invalid.");
  const expectedCharacters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-";
  for (const character of expectedCharacters) {
    const glyph = registry.glyphs[character];
    if (!Array.isArray(glyph) || glyph.length !== registry.height || glyph.some((row) => typeof row !== "string" || !new RegExp(`^[01]{${registry.width}}$`).test(row))) throw new Error(`Chart bitmap glyph is invalid: ${character}.`);
  }
  return registry;
}

function createImage(width, height, background) {
  const image = new PNG({ width, height, colorType: 6, inputHasAlpha: true });
  for (let offset = 0; offset < image.data.length; offset += 4) image.data.set(background, offset);
  return image;
}

function encode(image) {
  return PNG.sync.write(image, { colorType: 6, inputHasAlpha: true });
}

function assertPayload(payload) {
  if (!payload || !Number.isInteger(payload.width) || payload.width <= 0 || !Number.isInteger(payload.height) || payload.height <= 0 || !Array.isArray(payload.cells)) throw new Error("Payload must define positive grid dimensions and cells.");
  if (payload.cells.length !== payload.width * payload.height) throw new Error("Payload cells length must equal width × height.");
}

function assertPalette(palette) {
  if (!palette || !palette.colors || typeof palette.colors !== "object" || Array.isArray(palette.colors)) throw new Error("Palette must define colors.");
}

function assertCellColors(payload, palette) {
  for (const colorId of payload.cells) {
    if (colorId === null) continue;
    if (typeof colorId !== "string" || !palette.colors[colorId]) throw new Error(`Unknown palette color: ${colorId}.`);
    color(palette.colors[colorId]);
  }
}

function assertDirection(direction) {
  if (direction !== "normal" && direction !== "reverse") throw new Error("Chart direction must be normal or reverse.");
}

function collectLegend(payload, palette) {
  assertCellColors(payload, palette);
  const counts = new Map();
  for (const colorId of payload.cells) {
    if (colorId !== null) counts.set(colorId, (counts.get(colorId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => naturalCompare(left, right))
    .map(([code, count]) => ({ code, count, fill: color(palette.colors[code]) }));
}

function naturalCompare(left, right) {
  const leftParts = left.match(/\d+|\D+/g) ?? [left];
  const rightParts = right.match(/\d+|\D+/g) ?? [right];
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    if (leftParts[index] === undefined) return -1;
    if (rightParts[index] === undefined) return 1;
    if (leftParts[index] === rightParts[index]) continue;
    const leftNumber = /^\d+$/.test(leftParts[index]) ? Number(leftParts[index]) : null;
    const rightNumber = /^\d+$/.test(rightParts[index]) ? Number(rightParts[index]) : null;
    if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber;
    return leftParts[index] < rightParts[index] ? -1 : 1;
  }
  return 0;
}

function drawCardGuides(image, gridWidth, gridHeight) {
  for (let column = 0; column <= gridWidth; column += 1) {
    drawVerticalLine(image, column * cardCellSize, 0, gridHeight * cardCellSize, cardGuideColor(column));
  }
  for (let row = 0; row <= gridHeight; row += 1) {
    drawHorizontalLine(image, 0, gridWidth * cardCellSize, row * cardCellSize, cardGuideColor(row));
  }
}

function cardGuideColor(index) {
  if (index % 29 === 0) return [116, 91, 70, 255];
  if (index % 10 === 0) return [177, 151, 116, 255];
  return [225, 210, 187, 255];
}

function drawBeads(image, payload, palette) {
  payload.cells.forEach((colorId, index) => {
    if (colorId === null) return;
    const base = color(palette.colors[colorId]);
    const centerX = (index % payload.width) * cardCellSize + Math.floor(cardCellSize / 2);
    const centerY = Math.floor(index / payload.width) * cardCellSize + Math.floor(cardCellSize / 2);
    const radius = cardCellSize * 0.45;
    for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
      for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
        const distance = Math.hypot(x - centerX, y - centerY);
        if (distance <= radius) setPixel(image, x, y, blend(base, white, Math.max(0, 1 - distance / radius) * 0.28));
      }
    }
  });
}

function drawChartCells(image, payload, palette, direction) {
  for (let row = 0; row < payload.height; row += 1) {
    for (let displayX = 0; displayX < payload.width; displayX += 1) {
      const sourceX = direction === "reverse" ? payload.width - 1 - displayX : displayX;
      const code = payload.cells[row * payload.width + sourceX];
      const x = axisSize + displayX * cellSize;
      const y = axisSize + row * cellSize;
      if (code === null) {
        fillRect(image, x, y, cellSize, cellSize, white);
        continue;
      }
      const fill = color(palette.colors[code]);
      fillRect(image, x, y, cellSize, cellSize, fill);
      drawCenteredText(image, code, x, y, cellSize, cellSize, contrastInk(fill), cellTextScale(code));
    }
  }
}

function drawCoordinates(image, gridWidth, gridHeight) {
  for (let column = 0; column < gridWidth; column += 1) {
    const x = axisSize + column * cellSize;
    drawCenteredText(image, String(column + 1), x, 0, cellSize, axisSize, black);
    drawCenteredText(image, String(gridWidth - column), x, axisSize + gridHeight * cellSize, cellSize, axisSize, black);
  }
  for (let row = 0; row < gridHeight; row += 1) {
    const y = axisSize + row * cellSize;
    drawCenteredText(image, String(row + 1), 0, y, axisSize, cellSize, black);
    drawCenteredText(image, String(gridHeight - row), axisSize + gridWidth * cellSize, y, axisSize, cellSize, black);
  }
}

function drawLegend(image, legend, gridHeight, columns) {
  const top = axisSize + gridHeight * cellSize + axisSize + legendTopGap;
  legend.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = legendSideMargin + column * (legendItemWidth + legendColumnGap);
    const y = top + row * (legendItemHeight + legendRowGap);
    fillRect(image, x, y + 16, 96, 96, item.fill);
    drawBitmapText(image, item.code, x + 112, y + 24, black);
    drawBitmapText(image, String(item.count), x + 112, y + 76, black);
  });
}

function drawConstructionGuides(image, gridWidth, gridHeight) {
  const gridLeft = axisSize;
  const gridTop = axisSize;
  const gridRight = gridLeft + gridWidth * cellSize;
  const gridBottom = gridTop + gridHeight * cellSize;
  for (let column = 0; column <= gridWidth; column += 1) {
    const weight = guideWeight(column, gridWidth);
    fillRect(image, gridLeft + column * cellSize - Math.floor(weight / 2), gridTop, weight, gridBottom - gridTop + 1, guideInk);
  }
  for (let row = 0; row <= gridHeight; row += 1) {
    const weight = guideWeight(row, gridHeight);
    fillRect(image, gridLeft, gridTop + row * cellSize - Math.floor(weight / 2), gridRight - gridLeft + 1, weight, guideInk);
  }
}

function guideWeight(index, length) {
  if (index === 0 || index === length || index % 29 === 0) return 5;
  if (index % 10 === 0) return 3;
  return 1;
}

function contrastInk(fill) {
  const [red, green, blue] = fill.slice(0, 3).map((component) => {
    const channel = component / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.45 ? black : white;
}

function cellTextScale(label) {
  return bitmapTextWidth(label) <= cellSize ? fontScale : compactCellFontScale;
}

function drawCenteredText(image, label, x, y, width, height, ink, scale = fontScale) {
  drawBitmapText(
    image,
    label,
    x + Math.floor((width - bitmapTextWidth(label, scale)) / 2),
    y + Math.floor((height - bitmapRegistry.height * scale) / 2),
    ink,
    scale,
  );
}

function drawBitmapText(image, label, x, y, ink, scale = fontScale) {
  [...label].forEach((character, characterIndex) => {
    const glyph = bitmapRegistry.glyphs[character];
    if (!glyph) throw new Error(`Chart bitmap glyph is missing: ${character}.`);
    glyph.forEach((row, glyphY) => {
      [...row].forEach((bit, glyphX) => {
        if (bit === "1") fillRect(
          image,
          x + (characterIndex * (bitmapRegistry.width + bitmapRegistry.spacing) + glyphX) * scale,
          y + glyphY * scale,
          scale,
          scale,
          ink,
        );
      });
    });
  });
}

function bitmapTextWidth(label, scale = fontScale) {
  return (label.length * bitmapRegistry.width + Math.max(0, label.length - 1) * bitmapRegistry.spacing) * scale;
}

function drawVerticalLine(image, x, startY, endY, rgba) {
  const clampedX = Math.min(x, image.width - 1);
  for (let y = startY; y <= endY; y += 1) setPixel(image, clampedX, Math.min(y, image.height - 1), rgba);
}

function drawHorizontalLine(image, startX, endX, y, rgba) {
  const clampedY = Math.min(y, image.height - 1);
  for (let x = startX; x <= endX; x += 1) setPixel(image, Math.min(x, image.width - 1), clampedY, rgba);
}

function fillRect(image, x, y, width, height, rgba) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) setPixel(image, column, row, rgba);
  }
}

function setPixel(image, x, y, rgba) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  image.data.set(rgba, (y * image.width + x) * 4);
}

function color(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Palette color is invalid: ${hex}.`);
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16), 255];
}

function blend(base, highlight, amount) {
  return base.map((component, index) => Math.round(component + (highlight[index] - component) * amount));
}
