import { GridCell, TileType, BuildingType, Direction } from "../types";

// Helper functions to create cells
const w = (): GridCell => ({ ground: TileType.Water, building: null, deco: null, elevation: 0 });
const s = (): GridCell => ({ ground: TileType.Sand, building: null, deco: null, elevation: 0 });
const g1 = (): GridCell => ({ ground: TileType.Grass, building: null, deco: null, elevation: 1 });
const g2 = (): GridCell => ({ ground: TileType.Grass, building: null, deco: null, elevation: 2 });
const g3 = (): GridCell => ({ ground: TileType.Grass, building: null, deco: null, elevation: 3 });
const r1 = (): GridCell => ({ ground: TileType.Cobblestone, building: null, deco: null, elevation: 1 });
const r2 = (): GridCell => ({ ground: TileType.Cobblestone, building: null, deco: null, elevation: 2 });
const r3 = (): GridCell => ({ ground: TileType.Cobblestone, building: null, deco: null, elevation: 3 });
const p3 = (): GridCell => ({ ground: TileType.Cobblestone, building: null, deco: null, elevation: 3 }); // plaza = cobblestone
const k1 = (): GridCell => ({ ground: TileType.Rock, building: null, deco: null, elevation: 1 });
const k2 = (): GridCell => ({ ground: TileType.Rock, building: null, deco: null, elevation: 2 });

// Tree types at different elevations
// Palm trees - near coast on grass, or on beach (sand)
const pm1 = (): GridCell => ({ ground: TileType.Grass, building: null, deco: "palm_tree", elevation: 1 });
const pms = (): GridCell => ({ ground: TileType.Sand, building: null, deco: "palm_tree", elevation: 0 }); // Palm on sand (beach)
// Oak trees - inland, full canopy - good for forests
const ok1 = (): GridCell => ({ ground: TileType.Grass, building: null, deco: "oak_tree", elevation: 1 });
const ok2 = (): GridCell => ({ ground: TileType.Grass, building: null, deco: "oak_tree", elevation: 2 });
const ok3 = (): GridCell => ({ ground: TileType.Grass, building: null, deco: "oak_tree", elevation: 3 });
// Willow trees - elegant, near water on grass
const wl1 = (): GridCell => ({ ground: TileType.Grass, building: null, deco: "willow_tree", elevation: 1 });
// Coastal pine - sparingly, has rock at base (good near rocky outcrops)
const cp2 = (): GridCell => ({ ground: TileType.Grass, building: null, deco: "coastal_pine", elevation: 2 });

// Building cells
const projectBoard = (): GridCell => ({
  ground: TileType.Grass,
  building: BuildingType.ProjectBoard,
  buildingOrientation: Direction.South,
  deco: null,
  elevation: 1,
});

const forum = (): GridCell => ({
  ground: TileType.Grass,
  building: BuildingType.Forum,
  buildingOrientation: Direction.South,
  deco: null,
  elevation: 3,
});

const townHall = (): GridCell => ({
  ground: TileType.Cobblestone,
  building: BuildingType.TownHall,
  buildingOrientation: Direction.South,
  deco: null,
  elevation: 3,
});

const dock = (): GridCell => ({
  ground: TileType.DockPlanks,
  building: BuildingType.LobsterDock,
  buildingOrientation: Direction.East,
  deco: null,
  elevation: 0,
});

const lighthouse = (): GridCell => ({
  ground: TileType.Rock,
  building: BuildingType.Lighthouse,
  buildingOrientation: Direction.South,
  deco: null,
  elevation: 2,
});

const fishermansCottage = (): GridCell => ({
  ground: TileType.Grass,
  building: BuildingType.FishermansCottage,
  buildingOrientation: Direction.South,
  deco: null,
  elevation: 1,
});

// 32x32 town map with elevation (0=sea level, 1+=elevated)
// Tree variety: palms near coast (on grass), oaks inland/forests, willows near water, pines sparingly
// Features: Dense oak forest in southwest, scattered trees elsewhere
export const TOWN_MAP: GridCell[][] = [
  // Rows 0-1: Water
  [w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w()],
  [w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w()],
  // Rows 2-3: North beach with rocky outcrops
  [w(),w(),w(),w(),s(),s(),s(),k1(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),w(),w(),w(),w()],
  [w(),w(),w(),s(),s(),s(),k1(),k1(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),w(),w(),w()],
  // Rows 4-5: Beach to grass - palms near coast, willow near water
  [w(),w(),s(),s(),s(),s(),s(),pm1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),pm1(),g1(),s(),s(),s(),s(),s(),s(),w(),w()],
  [w(),s(),s(),s(),g1(),g1(),wl1(),g1(),g1(),g1(),g1(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g1(),g1(),g1(),wl1(),g1(),g1(),s(),s(),s(),s(),s(),w()],
  // Rows 6-7: Grass elevation rising - project board area
  [w(),s(),s(),g1(),g1(),g1(),projectBoard(),g1(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g1(),g1(),g1(),g1(),g1(),s(),s(),s(),s(),w()],
  [s(),s(),g1(),g1(),g1(),g1(),g1(),g1(),g2(),g2(),g2(),g2(),g2(),g2(),g3(),g3(),g3(),g3(),g2(),g2(),g2(),g2(),g2(),g1(),g1(),g1(),g1(),g1(),s(),s(),s(),w()],
  // Rows 8-9: Elevation 2-3 transition
  [s(),s(),g1(),g1(),g1(),g1(),g2(),g2(),g2(),g2(),g2(),g2(),g3(),g3(),g3(),g3(),g3(),g3(),g3(),g3(),g2(),g2(),g2(),g2(),g1(),g1(),g1(),g1(),s(),s(),s(),w()],
  [s(),g1(),g1(),g1(),wl1(),g1(),g2(),g2(),g2(),g2(),g2(),g3(),g3(),g3(),r3(),r3(),r3(),r3(),g3(),g3(),g3(),g2(),g2(),g2(),g2(),g1(),g1(),g1(),g1(),s(),s(),w()],
  // Rows 10-11: Upper town - elevation 3
  [s(),g1(),g1(),g1(),g1(),g2(),g2(),g2(),g2(),g2(),g2(),g3(),g3(),r3(),p3(),p3(),p3(),p3(),r3(),g3(),ok3(),forum(),g3(),g2(),g2(),g1(),g1(),g1(),g1(),s(),s(),w()],
  [s(),g1(),g1(),g1(),g1(),g2(),g2(),ok2(),g2(),g2(),g3(),g3(),r3(),p3(),p3(),p3(),p3(),p3(),p3(),r3(),g3(),g3(),g3(),g2(),g2(),g2(),g1(),g1(),g1(),s(),s(),w()],
  // Rows 12-13: Town hall area - highest point
  [s(),g1(),g1(),g1(),g2(),g2(),g2(),g2(),g2(),g3(),ok3(),r3(),p3(),p3(),townHall(),p3(),p3(),p3(),p3(),p3(),r3(),g3(),g3(),ok3(),g2(),g2(),g1(),g1(),g1(),s(),s(),w()],
  [s(),g1(),g1(),g1(),g2(),g2(),g2(),g2(),g3(),g3(),g3(),r3(),p3(),p3(),p3(),p3(),p3(),p3(),p3(),p3(),r3(),g3(),g3(),g3(),g2(),g2(),g1(),g1(),g1(),s(),s(),w()],
  // Rows 14-15: Town hall lower + main road start
  [s(),g1(),g1(),g1(),g2(),g2(),g2(),g2(),g3(),g3(),g3(),r3(),p3(),p3(),p3(),p3(),p3(),p3(),p3(),p3(),r3(),g3(),g3(),g2(),g2(),g2(),g1(),g1(),g1(),s(),s(),w()],
  [s(),g1(),g1(),g1(),g1(),g2(),g2(),g2(),g2(),g3(),g3(),r3(),r3(),r3(),r3(),r3(),r3(),r3(),r3(),r3(),r3(),g3(),g2(),g2(),g2(),g1(),g1(),g1(),g1(),s(),s(),w()],
  // Rows 16-17: Main road descending - CHAOTIC OAK FOREST begins
  [s(),g1(),ok1(),ok1(),g1(),ok1(),ok1(),g2(),g2(),g2(),r2(),r2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),r2(),r2(),g2(),g2(),g2(),g1(),g1(),g1(),s(),s(),s(),w()],
  [s(),g1(),g1(),ok1(),ok1(),ok1(),g1(),ok1(),g2(),g2(),r2(),g2(),g2(),g2(),ok2(),g2(),g2(),g2(),g2(),g2(),g2(),r2(),r2(),g2(),g2(),g1(),g1(),g1(),s(),s(),s(),w()],
  // Rows 18-19: Road to dock - IRREGULAR FOREST SHAPE
  [s(),g1(),g1(),g1(),ok1(),ok1(),ok1(),ok1(),g1(),g2(),r2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),g2(),r2(),r2(),g1(),g1(),g1(),s(),s(),s(),s(),w()],
  [s(),g1(),ok1(),ok1(),ok1(),g1(),ok1(),ok1(),ok1(),g2(),r1(),g1(),ok1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),r1(),r1(),r1(),s(),s(),s(),s(),s(),w()],
  // Rows 20-21: South inland - dock area, forest with clearings
  [s(),g1(),g1(),g1(),ok1(),ok1(),g1(),ok1(),g1(),g1(),r1(),g1(),g1(),ok1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),r1(),r1(),s(),s(),s(),s(),s(),dock()],
  [s(),g1(),g1(),ok1(),g1(),ok1(),ok1(),g1(),ok1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),s(),s(),s(),s(),s(),s(),w(),w()],
  // Rows 22-23: South area - lighthouse, forest thins out irregularly
  [s(),s(),g1(),ok1(),ok1(),g1(),ok1(),ok1(),g1(),g1(),g1(),ok1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),s(),k1(),k1(),s(),s(),s(),s(),w(),w(),w()],
  [s(),s(),g1(),g1(),ok1(),ok1(),g1(),g1(),ok1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),wl1(),g1(),g1(),s(),s(),k1(),lighthouse(),k1(),s(),s(),s(),w(),w(),w(),w()],
  // Rows 24-25: Grass to beach - scattered trees at forest edge
  [s(),s(),s(),ok1(),g1(),ok1(),g1(),ok1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),s(),k1(),k1(),s(),s(),s(),s(),w(),w(),w(),w()],
  [s(),s(),s(),s(),g1(),ok1(),wl1(),wl1(),g1(),ok1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),s(),s(),s(),k1(),s(),s(),s(),w(),w(),w(),w(),w()],
  // Rows 26-27: South beach with rocks
  [w(),s(),s(),pms(),s(),s(),g1(),g1(),fishermansCottage(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),g1(),s(),s(),s(),s(),s(),s(),s(),s(),w(),w(),w(),w(),w(),w()],
  [w(),s(),s(),k1(),s(),s(),s(),pms(),s(),s(),s(),s(),s(),pms(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),w(),w(),w(),w(),w(),w(),w()],
  // Rows 28-29: Beach to water
  [w(),w(),s(),s(),s(),s(),s(),s(),s(),s(),pms(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),w(),w(),w(),w(),w(),w(),w(),w()],
  [w(),w(),w(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),pms(),s(),s(),s(),s(),s(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w()],
  // Rows 30-31: Water
  [w(),w(),w(),w(),w(),s(),s(),pms(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),s(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w()],
  [w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w(),w()],
];

// Extract buildings list with positions from the map
export function extractBuildings(): import("../types").Building[] {
  const buildings: import("../types").Building[] = [];

  for (let y = 0; y < TOWN_MAP.length; y++) {
    for (let x = 0; x < TOWN_MAP[y].length; x++) {
      const cell = TOWN_MAP[y][x];
      if (cell.building) {
        buildings.push({
          id: `${cell.building}_${x}_${y}`,
          type: cell.building,
          name: getBuildingDisplayName(cell.building),
          gridX: x,
          gridY: y,
        });
      }
    }
  }

  return buildings;
}

function getBuildingDisplayName(type: BuildingType): string {
  const names: Record<BuildingType, string> = {
    [BuildingType.TownHall]: "Town Hall",
    [BuildingType.Forum]: "Community Forum",
    [BuildingType.ProjectBoard]: "The Molt Board",
    [BuildingType.LobsterDock]: "Lobster Dock",
    [BuildingType.Lighthouse]: "Lighthouse",
    [BuildingType.LobsterRestaurant]: "The Claw & Tail Restaurant",
    [BuildingType.Boat]: "Fishing Boat",
    [BuildingType.FishermansCottage]: "Fisherman's Cottage",
    [BuildingType.BeachHouse]: "Beach House",
    [BuildingType.BaitTackleShop]: "Bait & Tackle Shop",
    [BuildingType.FishMarket]: "Fish Market",
    [BuildingType.GeneralStore]: "General Store",
  };
  return names[type] || type;
}
