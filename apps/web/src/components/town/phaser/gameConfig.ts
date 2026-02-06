import * as Phaser from "phaser";
import { GRID_WIDTH, GRID_HEIGHT, TILE_WIDTH, TILE_HEIGHT } from "../types";

// Calculate canvas size for isometric grid
const isoWidth = (GRID_WIDTH + GRID_HEIGHT) * (TILE_WIDTH / 2);
const isoHeight = (GRID_WIDTH + GRID_HEIGHT) * (TILE_HEIGHT / 2);

// Add padding for buildings that extend above their footprint
const CANVAS_PADDING_TOP = 200;
const CANVAS_PADDING_BOTTOM = 100;
const CANVAS_PADDING_SIDES = 200;

export const GAME_WIDTH = Math.ceil(isoWidth) + CANVAS_PADDING_SIDES * 2;
export const GAME_HEIGHT =
  Math.ceil(isoHeight) + CANVAS_PADDING_TOP + CANVAS_PADDING_BOTTOM;

// Offset to center the grid in the canvas
export const GRID_OFFSET_X = GAME_WIDTH / 2;
export const GRID_OFFSET_Y = CANVAS_PADDING_TOP;

export function createGameConfig(
  parent: HTMLElement,
  scene: Phaser.Scene
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#4a90d9", // Ocean blue background
    pixelArt: true, // Crisp pixel rendering
    roundPixels: true,
    antialias: false,
    scene,
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
  };
}
