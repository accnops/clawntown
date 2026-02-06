import { BuildingType, Direction } from "../types";

export interface BuildingDefinition {
  id: BuildingType;
  name: string;
  displayName: string; // For dialog titles
  footprint: { width: number; height: number };
  sprites: {
    [Direction.South]: string;
    [Direction.West]?: string;
    [Direction.North]?: string;
    [Direction.East]?: string;
  };
  // For buildings taller than their footprint (affects depth sorting)
  renderHeight: number;
  // If true, this building triggers a dialog on click
  interactive: boolean;
  // Sprite scale (512x512 assets scaled down to fit tile grid)
  scale: number;
}

export const BUILDINGS: Record<BuildingType, BuildingDefinition> = {
  // Core Buildings
  [BuildingType.TownHall]: {
    id: BuildingType.TownHall,
    name: "town_hall",
    displayName: "Town Hall - Mayor Clawrence",
    footprint: { width: 2, height: 2 },
    sprites: {
      [Direction.South]: "/assets/buildings/core/town_hall_sprite_0.png",
      [Direction.West]: "/assets/buildings/core/town_hall_sprite_90.png",
      [Direction.North]: "/assets/buildings/core/town_hall_sprite_180.png",
      [Direction.East]: "/assets/buildings/core/town_hall_sprite_270.png",
    },
    renderHeight: 5,
    interactive: true,
    scale: 0.22,
  },

  [BuildingType.Forum]: {
    id: BuildingType.Forum,
    name: "forum",
    displayName: "Community Forum",
    footprint: { width: 2, height: 2 },
    sprites: {
      [Direction.South]: "/assets/buildings/core/forum_sprite_0.png",
      [Direction.West]: "/assets/buildings/core/forum_sprite_90.png",
      [Direction.North]: "/assets/buildings/core/forum_sprite_180.png",
      [Direction.East]: "/assets/buildings/core/forum_sprite_270.png",
    },
    renderHeight: 3,
    interactive: true,
    scale: 0.15,
  },

  [BuildingType.ProjectBoard]: {
    id: BuildingType.ProjectBoard,
    name: "project_board",
    displayName: "Project Board",
    footprint: { width: 1, height: 1 },
    sprites: {
      [Direction.South]: "/assets/buildings/core/project_board_sprite_0.png",
      [Direction.West]: "/assets/buildings/core/project_board_sprite_90.png",
      [Direction.North]: "/assets/buildings/core/project_board_sprite_180.png",
      [Direction.East]: "/assets/buildings/core/project_board_sprite_270.png",
    },
    renderHeight: 2,
    interactive: true,
    scale: 0.12,
  },

  [BuildingType.LobsterDock]: {
    id: BuildingType.LobsterDock,
    name: "lobster_dock",
    displayName: "Lobster Dock",
    footprint: { width: 2, height: 3 },
    sprites: {
      [Direction.South]: "/assets/buildings/core/lobster_dock_sprite_0.png",
      [Direction.West]: "/assets/buildings/core/lobster_dock_sprite_90.png",
      [Direction.North]: "/assets/buildings/core/lobster_dock_sprite_180.png",
      [Direction.East]: "/assets/buildings/core/lobster_dock_sprite_270.png",
    },
    renderHeight: 1,
    interactive: true,
    scale: 0.12,
  },

  [BuildingType.Lighthouse]: {
    id: BuildingType.Lighthouse,
    name: "lighthouse",
    displayName: "Lighthouse",
    footprint: { width: 1, height: 1 },
    sprites: {
      [Direction.South]: "/assets/buildings/core/lighthouse_sprite_0.png",
      [Direction.West]: "/assets/buildings/core/lighthouse_sprite_90.png",
      [Direction.North]: "/assets/buildings/core/lighthouse_sprite_180.png",
      [Direction.East]: "/assets/buildings/core/lighthouse_sprite_270.png",
    },
    renderHeight: 10,
    interactive: true,
    scale: 0.28,
  },

  [BuildingType.LobsterRestaurant]: {
    id: BuildingType.LobsterRestaurant,
    name: "lobster_restaurant",
    displayName: "The Claw & Tail Restaurant",
    footprint: { width: 2, height: 2 },
    sprites: {
      [Direction.South]: "/assets/buildings/core/lobster_restaurant_sprite_0.png",
      [Direction.West]: "/assets/buildings/core/lobster_restaurant_sprite_90.png",
      [Direction.North]: "/assets/buildings/core/lobster_restaurant_sprite_180.png",
      [Direction.East]: "/assets/buildings/core/lobster_restaurant_sprite_270.png",
    },
    renderHeight: 3,
    interactive: true,
    scale: 0.15,
  },

  [BuildingType.Boat]: {
    id: BuildingType.Boat,
    name: "boat",
    displayName: "Fishing Boat",
    footprint: { width: 1, height: 2 },
    sprites: {
      [Direction.South]: "/assets/buildings/core/boat_sprite_0.png",
      [Direction.West]: "/assets/buildings/core/boat_sprite_90.png",
      [Direction.North]: "/assets/buildings/core/boat_sprite_180.png",
      [Direction.East]: "/assets/buildings/core/boat_sprite_270.png",
    },
    renderHeight: 1,
    interactive: false,
    scale: 0.12,
  },

  // Residential Buildings
  [BuildingType.FishermansCottage]: {
    id: BuildingType.FishermansCottage,
    name: "fishermans_cottage",
    displayName: "Fisherman's Cottage",
    footprint: { width: 1, height: 1 },
    sprites: {
      [Direction.South]: "/assets/buildings/residential/fishermans_cottage_sprite_0.png",
      [Direction.West]: "/assets/buildings/residential/fishermans_cottage_sprite_90.png",
      [Direction.North]: "/assets/buildings/residential/fishermans_cottage_sprite_180.png",
      [Direction.East]: "/assets/buildings/residential/fishermans_cottage_sprite_270.png",
    },
    renderHeight: 2,
    interactive: false,
    scale: 0.12,
  },

  [BuildingType.BeachHouse]: {
    id: BuildingType.BeachHouse,
    name: "beach_house",
    displayName: "Beach House",
    footprint: { width: 2, height: 2 },
    sprites: {
      [Direction.South]: "/assets/buildings/residential/beach_house_sprite_0.png",
      [Direction.West]: "/assets/buildings/residential/beach_house_sprite_90.png",
      [Direction.North]: "/assets/buildings/residential/beach_house_sprite_180.png",
      [Direction.East]: "/assets/buildings/residential/beach_house_sprite_270.png",
    },
    renderHeight: 3,
    interactive: false,
    scale: 0.15,
  },

  // Commercial Buildings
  [BuildingType.BaitTackleShop]: {
    id: BuildingType.BaitTackleShop,
    name: "bait_tackle_shop",
    displayName: "Bait & Tackle Shop",
    footprint: { width: 1, height: 1 },
    sprites: {
      [Direction.South]: "/assets/buildings/commercial/bait_tackle_shop_sprite_0.png",
      [Direction.West]: "/assets/buildings/commercial/bait_tackle_shop_sprite_90.png",
      [Direction.North]: "/assets/buildings/commercial/bait_tackle_shop_sprite_180.png",
      [Direction.East]: "/assets/buildings/commercial/bait_tackle_shop_sprite_270.png",
    },
    renderHeight: 2,
    interactive: false,
    scale: 0.12,
  },

  [BuildingType.FishMarket]: {
    id: BuildingType.FishMarket,
    name: "fish_market",
    displayName: "Fish Market",
    footprint: { width: 1, height: 1 },
    sprites: {
      [Direction.South]: "/assets/buildings/commercial/fish_market_sprite_0.png",
      [Direction.West]: "/assets/buildings/commercial/fish_market_sprite_90.png",
      [Direction.North]: "/assets/buildings/commercial/fish_market_sprite_180.png",
      [Direction.East]: "/assets/buildings/commercial/fish_market_sprite_270.png",
    },
    renderHeight: 2,
    interactive: false,
    scale: 0.12,
  },

  [BuildingType.GeneralStore]: {
    id: BuildingType.GeneralStore,
    name: "general_store",
    displayName: "General Store",
    footprint: { width: 2, height: 1 },
    sprites: {
      [Direction.South]: "/assets/buildings/commercial/general_store_sprite_0.png",
      [Direction.West]: "/assets/buildings/commercial/general_store_sprite_90.png",
      [Direction.North]: "/assets/buildings/commercial/general_store_sprite_180.png",
      [Direction.East]: "/assets/buildings/commercial/general_store_sprite_270.png",
    },
    renderHeight: 3,
    interactive: false,
    scale: 0.15,
  },
};

export function getBuilding(type: BuildingType): BuildingDefinition | undefined {
  return BUILDINGS[type];
}

export function getBuildingSprite(
  type: BuildingType,
  direction: Direction = Direction.South
): string | undefined {
  const building = BUILDINGS[type];
  if (!building) return undefined;
  return building.sprites[direction] || building.sprites[Direction.South];
}
