import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  createGrid,
  drawLine,
  drawRect,
  placeGlyph,
  setCell,
} from "../../../scripts/gallery/grid-authoring.mjs";

const glyphs = JSON.parse(readFileSync(fileURLToPath(new URL("../glyphs/pindou-hanzi-12-v1.json", import.meta.url)), "utf8"));

export function createPilotPatterns() {
  return [
    createInsideCuteDogSign(),
    createDeliveryBlockDoorSign(),
    createBirthdayDogCakeBouquet(),
    createFarewellFortuneSign(),
  ];
}

function createInsideCuteDogSign() {
  let grid = createGrid(58, 29);
  grid = drawRect(grid, 2, 2, 54, 25, "cream");
  grid = drawLine(grid, 3, 2, 54, 2, "cocoa");
  grid = drawLine(grid, 3, 26, 54, 26, "cocoa");
  grid = drawLine(grid, 2, 3, 2, 25, "cocoa");
  grid = drawLine(grid, 55, 3, 55, 25, "cocoa");
  grid = setCell(grid, 2, 2, null);
  grid = setCell(grid, 55, 2, null);
  grid = setCell(grid, 2, 26, null);
  grid = setCell(grid, 55, 26, null);

  grid = drawRect(grid, 6, 8, 14, 12, "white");
  grid = drawLine(grid, 7, 7, 18, 7, "cocoa");
  grid = drawLine(grid, 5, 9, 5, 17, "cocoa");
  grid = drawLine(grid, 20, 9, 20, 17, "cocoa");
  grid = drawLine(grid, 7, 20, 18, 20, "cocoa");
  grid = drawRect(grid, 3, 6, 4, 9, "blush");
  grid = drawRect(grid, 19, 6, 4, 9, "blush");
  grid = drawRect(grid, 9, 20, 7, 3, "sage");
  grid = setCell(grid, 9, 8, "charcoal");
  grid = setCell(grid, 16, 8, "charcoal");
  grid = setCell(grid, 12, 12, "cocoa");
  grid = drawLine(grid, 10, 15, 14, 15, "charcoal");
  grid = setCell(grid, 8, 23, "cocoa");
  grid = setCell(grid, 17, 23, "cocoa");

  grid = placeGlyph(grid, glyphs, "内", 28, 3, "charcoal");
  grid = placeGlyph(grid, glyphs, "有", 41, 3, "charcoal");
  grid = placeGlyph(grid, glyphs, "萌", 28, 16, "charcoal");
  grid = placeGlyph(grid, glyphs, "犬", 41, 16, "charcoal");

  return payload("inside-cute-dog-sign", grid, [textRegion("message", "内有萌犬", 27, 3)]);
}

function createDeliveryBlockDoorSign() {
  let grid = createGrid(58, 29);
  grid = drawRect(grid, 1, 1, 56, 27, "cream");
  grid = drawLine(grid, 2, 1, 55, 1, "cocoa");
  grid = drawLine(grid, 2, 27, 55, 27, "cocoa");
  grid = drawLine(grid, 1, 2, 1, 26, "cocoa");
  grid = drawLine(grid, 56, 2, 56, 26, "cocoa");

  grid = drawLine(grid, 3, 4, 3, 23, "cocoa");
  grid = drawLine(grid, 4, 4, 7, 4, "cocoa");
  grid = drawLine(grid, 7, 4, 7, 11, "cocoa");
  grid = setCell(grid, 6, 13, "gold");
  grid = drawRect(grid, 2, 20, 6, 5, "butter");
  grid = drawLine(grid, 2, 20, 7, 20, "cocoa");
  grid = drawLine(grid, 2, 24, 7, 24, "cocoa");
  grid = drawLine(grid, 2, 21, 2, 23, "cocoa");
  grid = drawLine(grid, 7, 21, 7, 23, "cocoa");
  grid = setCell(grid, 3, 21, "coral");
  grid = setCell(grid, 4, 22, "coral");
  grid = setCell(grid, 5, 23, "coral");
  grid = setCell(grid, 6, 21, "coral");
  grid = setCell(grid, 5, 22, "coral");
  grid = setCell(grid, 4, 23, "coral");

  grid = placeGlyph(grid, glyphs, "快", 7, 2, "charcoal");
  grid = placeGlyph(grid, glyphs, "递", 19, 2, "charcoal");
  grid = placeGlyph(grid, glyphs, "挡", 31, 2, "charcoal");
  grid = placeGlyph(grid, glyphs, "在", 43, 2, "charcoal");
  grid = placeGlyph(grid, glyphs, "门", 13, 15, "charcoal");
  grid = placeGlyph(grid, glyphs, "口", 25, 15, "charcoal");

  return payload("delivery-block-door-sign", grid, [textRegion("message", "快递挡在门口", 7, 2)]);
}

function createBirthdayDogCakeBouquet() {
  let grid = createGrid(29, 29);
  grid = drawRect(grid, 1, 1, 27, 27, "cream");
  grid = drawLine(grid, 2, 1, 26, 1, "cocoa");
  grid = drawLine(grid, 2, 27, 26, 27, "cocoa");
  grid = drawLine(grid, 1, 2, 1, 26, "cocoa");
  grid = drawLine(grid, 27, 2, 27, 26, "cocoa");

  grid = drawRect(grid, 5, 7, 10, 10, "white");
  grid = drawLine(grid, 6, 6, 13, 6, "cocoa");
  grid = drawLine(grid, 4, 8, 4, 14, "cocoa");
  grid = drawLine(grid, 15, 8, 15, 14, "cocoa");
  grid = drawLine(grid, 6, 17, 13, 17, "cocoa");
  grid = drawRect(grid, 2, 5, 4, 7, "lavender");
  grid = drawRect(grid, 14, 5, 4, 7, "lavender");
  grid = setCell(grid, 7, 9, "charcoal");
  grid = setCell(grid, 12, 9, "charcoal");
  grid = setCell(grid, 9, 12, "cocoa");
  grid = drawLine(grid, 8, 14, 11, 14, "charcoal");
  grid = drawLine(grid, 7, 18, 7, 22, "cocoa");
  grid = drawLine(grid, 12, 18, 12, 22, "cocoa");
  grid = drawLine(grid, 7, 22, 12, 22, "sage");

  grid = drawRect(grid, 17, 16, 7, 6, "blush");
  grid = drawLine(grid, 17, 16, 23, 16, "cocoa");
  grid = drawLine(grid, 17, 21, 23, 21, "cocoa");
  grid = drawLine(grid, 17, 17, 17, 20, "cocoa");
  grid = drawLine(grid, 23, 17, 23, 20, "cocoa");
  grid = drawLine(grid, 20, 13, 20, 16, "gold");
  grid = setCell(grid, 20, 12, "coral");
  grid = setCell(grid, 18, 14, "butter");
  grid = setCell(grid, 22, 14, "butter");

  grid = setCell(grid, 18, 24, "sage");
  grid = setCell(grid, 19, 23, "sage");
  grid = setCell(grid, 20, 22, "sage");
  grid = setCell(grid, 21, 21, "sage");
  grid = setCell(grid, 22, 20, "sage");
  grid = setCell(grid, 23, 19, "sage");
  grid = setCell(grid, 24, 18, "sage");
  grid = setCell(grid, 18, 18, "coral");
  grid = setCell(grid, 24, 18, "lavender");
  grid = setCell(grid, 21, 20, "butter");
  grid = setCell(grid, 17, 20, "mint");
  grid = setCell(grid, 23, 22, "coral");

  return payload("birthday-dog-cake-bouquet", grid, []);
}

function createFarewellFortuneSign() {
  let grid = createGrid(58, 29);
  grid = drawRect(grid, 2, 2, 54, 25, "lavender");
  grid = drawLine(grid, 3, 2, 54, 2, "cocoa");
  grid = drawLine(grid, 3, 26, 54, 26, "cocoa");
  grid = drawLine(grid, 2, 3, 2, 25, "cocoa");
  grid = drawLine(grid, 55, 3, 55, 25, "cocoa");
  grid = setCell(grid, 2, 2, null);
  grid = setCell(grid, 55, 2, null);
  grid = setCell(grid, 2, 26, null);
  grid = setCell(grid, 55, 26, null);

  grid = placeGlyph(grid, glyphs, "脱", 5, 3, "charcoal");
  grid = placeGlyph(grid, glyphs, "离", 17, 3, "charcoal");
  grid = placeGlyph(grid, glyphs, "苦", 29, 3, "charcoal");
  grid = placeGlyph(grid, glyphs, "海", 41, 3, "charcoal");
  grid = placeGlyph(grid, glyphs, "发", 11, 16, "charcoal");
  grid = placeGlyph(grid, glyphs, "大", 23, 16, "charcoal");
  grid = placeGlyph(grid, glyphs, "财", 35, 16, "charcoal");

  grid = drawRect(grid, 4, 22, 5, 3, "gold");
  grid = drawLine(grid, 4, 22, 8, 22, "cocoa");
  grid = drawLine(grid, 4, 24, 8, 24, "cocoa");
  grid = drawRect(grid, 48, 22, 5, 3, "gold");
  grid = drawLine(grid, 48, 22, 52, 22, "cocoa");
  grid = drawLine(grid, 48, 24, 52, 24, "cocoa");
  grid = setCell(grid, 6, 19, "butter");
  grid = setCell(grid, 50, 19, "butter");
  grid = setCell(grid, 8, 5, "coral");
  grid = setCell(grid, 51, 7, "mint");

  return payload("farewell-fortune-sign", grid, [
    textRegion("farewell", "脱离苦海", 5, 3),
    textRegion("fortune", "发大财", 11, 16),
  ]);
}

function payload(contentId, grid, editableTextRegions) {
  return {
    format: "pindou-gallery-pattern",
    formatVersion: 1,
    contentId,
    contentVersion: "1.0.0",
    width: grid.width,
    height: grid.height,
    palette: { id: "pindou-soft-original", version: "1.0.0" },
    cells: grid.cells,
    direction: "normal",
    editableTextRegions,
  };
}

function textRegion(id, defaultText, x, y) {
  return {
    id,
    defaultText,
    x,
    y,
    fontId: "pindou-hanzi-12",
    size: 12,
    colorId: "charcoal",
    maxLength: defaultText.length,
  };
}
