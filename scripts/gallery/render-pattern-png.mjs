import { PNG } from "pngjs";

const coordinateMargin = 64;
const transparent = [0, 0, 0, 0];
const digitPixels = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
};

export function renderPatternPng(payload, palette, options) {
  assertPayload(payload);
  assertPalette(palette);
  assertOptions(options);

  const { pixelsPerCell, showCoordinates, majorGuideEvery, pegboardSize } = options;
  const offset = showCoordinates ? coordinateMargin : 0;
  const width = offset + payload.width * pixelsPerCell;
  const height = offset + payload.height * pixelsPerCell;
  const image = new PNG({ width, height, colorType: 6, inputHasAlpha: true });
  image.data.fill(0);

  const cream = color(palette.colors.cream);
  if (showCoordinates) drawCoordinateBacking(image, cream, offset);
  drawGuides(image, offset, payload.width, payload.height, pixelsPerCell, majorGuideEvery, pegboardSize);
  drawBeads(image, payload, palette, offset, pixelsPerCell);
  if (showCoordinates) drawCoordinates(image, offset, payload.width, payload.height, pixelsPerCell);

  return PNG.sync.write(image, { colorType: 6, inputHasAlpha: true });
}

function assertPayload(payload) {
  if (!payload || !Number.isInteger(payload.width) || payload.width <= 0 || !Number.isInteger(payload.height) || payload.height <= 0 || !Array.isArray(payload.cells)) throw new Error("Payload must define positive grid dimensions and cells.");
  if (payload.cells.length !== payload.width * payload.height) throw new Error("Payload cells length must equal width × height.");
}

function assertPalette(palette) {
  if (!palette || !palette.colors || typeof palette.colors !== "object" || !palette.colors.cream) throw new Error("Palette must define colors including cream.");
}

function assertOptions(options) {
  if (!options || !Number.isInteger(options.pixelsPerCell) || options.pixelsPerCell < 4 || typeof options.showCoordinates !== "boolean" || !Number.isInteger(options.majorGuideEvery) || options.majorGuideEvery <= 0 || !Number.isInteger(options.pegboardSize) || options.pegboardSize <= 0) throw new Error("Renderer options are invalid.");
}

function drawCoordinateBacking(image, cream, offset) {
  fillRect(image, 0, 0, image.width, offset, cream);
  fillRect(image, 0, offset, offset, image.height - offset, cream);
}

function drawGuides(image, offset, gridWidth, gridHeight, pixelsPerCell, majorGuideEvery, pegboardSize) {
  for (let column = 0; column <= gridWidth; column += 1) {
    const guide = guideColor(column, majorGuideEvery, pegboardSize);
    drawVerticalLine(image, offset + column * pixelsPerCell, offset, offset + gridHeight * pixelsPerCell, guide);
  }
  for (let row = 0; row <= gridHeight; row += 1) {
    const guide = guideColor(row, majorGuideEvery, pegboardSize);
    drawHorizontalLine(image, offset, offset + gridWidth * pixelsPerCell, offset + row * pixelsPerCell, guide);
  }
}

function guideColor(index, majorGuideEvery, pegboardSize) {
  if (index % pegboardSize === 0) return [116, 91, 70, 255];
  if (index % majorGuideEvery === 0) return [177, 151, 116, 255];
  return [225, 210, 187, 255];
}

function drawBeads(image, payload, palette, offset, pixelsPerCell) {
  payload.cells.forEach((colorId, index) => {
    if (colorId === null) return;
    if (typeof colorId !== "string" || !palette.colors[colorId]) throw new Error(`Unknown palette color: ${colorId}.`);
    const base = color(palette.colors[colorId]);
    const centerX = offset + (index % payload.width) * pixelsPerCell + Math.floor(pixelsPerCell / 2);
    const centerY = offset + Math.floor(index / payload.width) * pixelsPerCell + Math.floor(pixelsPerCell / 2);
    const radius = pixelsPerCell * 0.45;
    for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
      for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
        const distance = Math.hypot(x - centerX, y - centerY);
        if (distance <= radius) setPixel(image, x, y, blend(base, [255, 255, 255, 255], Math.max(0, 1 - distance / radius) * 0.28));
      }
    }
  });
}

function drawCoordinates(image, offset, gridWidth, gridHeight, pixelsPerCell) {
  const ink = [63, 58, 58, 255];
  for (let column = 0; column < gridWidth; column += 1) {
    const label = String(column + 1);
    drawNumber(image, label, offset + column * pixelsPerCell + Math.floor((pixelsPerCell - numberWidth(label)) / 2), 29, ink);
  }
  for (let row = 0; row < gridHeight; row += 1) {
    const label = String(row + 1);
    drawNumber(image, label, 51 - numberWidth(label), offset + row * pixelsPerCell + Math.floor((pixelsPerCell - 5) / 2), ink);
  }
}

function drawNumber(image, label, x, y, ink) {
  [...label].forEach((digit, index) => {
    digitPixels[digit].forEach((row, rowIndex) => {
      [...row].forEach((bit, columnIndex) => {
        if (bit === "1") setPixel(image, x + index * 4 + columnIndex, y + rowIndex, ink);
      });
    });
  });
}

function numberWidth(label) { return label.length * 4 - 1; }

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
