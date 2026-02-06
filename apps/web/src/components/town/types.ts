// Tile types for the lobster town
export enum TileType {
  Grass = "grass",
  Water = "water",
  Sand = "sand",
  Cobblestone = "cobblestone",
  DockPlanks = "dock_planks",
  Rock = "rock",
}

// Building types (clickable structures)
export enum BuildingType {
  TownHall = "town_hall",
  Forum = "forum",
  ProjectBoard = "project_board",
  LobsterDock = "lobster_dock",
  Lighthouse = "lighthouse",
  LobsterRestaurant = "lobster_restaurant",
  Boat = "boat",
  FishermansCottage = "fishermans_cottage",
  BeachHouse = "beach_house",
  BaitTackleShop = "bait_tackle_shop",
  FishMarket = "fish_market",
  GeneralStore = "general_store",
}

// Direction for sprite orientation (matches generated asset naming)
export enum Direction {
  South = 0, // Front-facing (default)
  West = 90,
  North = 180,
  East = 270,
}

// Tree types for variety
export type TreeType =
  | "coastal_pine"   // Tall pine tree - common on elevated terrain
  | "palm_tree"      // Beach/coastal areas
  | "oak_tree"       // Fuller, rounder canopy - inland areas
  | "willow_tree";   // Elegant droopy branches - near water

// Decoration types
export type DecoType =
  | TreeType
  | "lobster_traps"
  | "wooden_bench"
  | "fishing_buoy"
  | null;

// Helper to check if a deco is a tree
export function isTreeType(deco: DecoType): deco is TreeType {
  return deco === "coastal_pine" || deco === "palm_tree" || deco === "oak_tree" || deco === "willow_tree";
}

// Grid cell structure
export interface GridCell {
  ground: TileType;
  building: BuildingType | null;
  buildingOrientation?: Direction;
  deco: DecoType;
  elevation: number; // 0-3 for clawntown (0 = sea level, 3 = highest)
}

// Building instance (for dialog interactions)
export interface Building {
  id: string;
  type: BuildingType;
  name: string;
  gridX: number;
  gridY: number;
}

// Grid dimensions
export const GRID_WIDTH = 32;
export const GRID_HEIGHT = 32;

// Isometric tile dimensions (match pogicity for consistency)
export const TILE_WIDTH = 44;
export const TILE_HEIGHT = 22;

// Elevation height per level (pixels)
export const ELEVATION_HEIGHT = 8;

// Depth multiplier for sorting
export const DEPTH_Y_MULT = 10000;

// Convert grid coordinates to isometric screen coordinates
export function gridToIso(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: (gridX - gridY) * (TILE_WIDTH / 2),
    y: (gridX + gridY) * (TILE_HEIGHT / 2),
  };
}

// Convert isometric screen coordinates back to grid coordinates
export function isoToGrid(isoX: number, isoY: number): { x: number; y: number } {
  return {
    x: (isoX / (TILE_WIDTH / 2) + isoY / (TILE_HEIGHT / 2)) / 2,
    y: (isoY / (TILE_HEIGHT / 2) - isoX / (TILE_WIDTH / 2)) / 2,
  };
}
