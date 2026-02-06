import * as Phaser from "phaser";
import {
  GridCell,
  Building,
  TileType,
  BuildingType,
  Direction,
  GRID_WIDTH,
  GRID_HEIGHT,
  TILE_WIDTH,
  TILE_HEIGHT,
  ELEVATION_HEIGHT,
  DEPTH_Y_MULT,
  gridToIso,
  isoToGrid,
} from "../types";
import { GRID_OFFSET_X, GRID_OFFSET_Y } from "./gameConfig";
import { BUILDINGS, getBuilding, getBuildingSprite } from "../data/buildings";
import { TOWN_MAP, extractBuildings } from "../data/townMap";
import {
  Character,
  CharacterType,
  CHARACTER_TYPES,
  getCharacterSpriteKey,
  createInitialBoats,
  updateCharacterPosition,
} from "../data/characters";

// Event types for React communication
export interface SceneEvents {
  onBuildingClick: (building: Building) => void;
  onBuildingHover: (building: Building | null) => void;
}

export class MainScene extends Phaser.Scene {
  // Sprite containers
  private tileSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private buildingSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private decoSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private waterSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private characterSprites: Map<string, Phaser.GameObjects.Image> = new Map();

  // Characters (moving entities with path loops)
  private characters: Character[] = [];

  // Track camera state for dynamic water rendering
  private lastCameraBounds: { x: number; y: number; zoom: number } = { x: 0, y: 0, zoom: 1 };

  // Town data (static, loaded once)
  private grid: GridCell[][] = [];
  private buildings: Building[] = [];

  // Event callbacks
  private events_: SceneEvents = {
    onBuildingClick: () => {},
    onBuildingHover: () => {},
  };

  // Zoom level
  private zoomLevel: number = 1;

  // Scene ready flag
  private isReady: boolean = false;

  // Camera panning state
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;
  private baseScrollX: number = 0;
  private baseScrollY: number = 0;

  // Hover state
  private hoveredBuilding: Building | null = null;

  // Touch state for pinch zoom (using native touch tracking for reliability)
  private lastPinchDistance: number = 0;
  private isPinching: boolean = false;
  private activeTouches: Map<number, { x: number; y: number }> = new Map();

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    // Load cube tile textures (3D tiles with top face and sides)
    this.load.image("grass", "/assets/tiles/grass_tile_cube.png");
    this.load.image("sand", "/assets/tiles/sand_tile_cube.png");
    this.load.image("water", "/assets/tiles/water_tile_cube.png");
    this.load.image("cobblestone", "/assets/tiles/cobblestone_tile_cube.png");
    this.load.image("dock_planks", "/assets/tiles/dock_planks_tile_cube.png");
    // Rock uses same texture as cobblestone for now (can be replaced)
    this.load.image("rock", "/assets/tiles/cobblestone_tile_cube.png");

    // Load building textures dynamically from registry
    for (const building of Object.values(BUILDINGS)) {
      for (const [dir, path] of Object.entries(building.sprites)) {
        const key = `${building.name}_${dir}`;
        this.load.image(key, path);
      }
    }

    // Load prop textures (including all tree types)
    const props = [
      "coastal_pine", "palm_tree", "oak_tree", "willow_tree",  // Trees
      "lobster_traps", "wooden_bench", "fishing_buoy"           // Other props
    ];
    const directions = [0, 90, 180, 270];
    for (const prop of props) {
      for (const dir of directions) {
        this.load.image(`${prop}_${dir}`, `/assets/props/${prop}_sprite_${dir}.png`);
      }
    }
  }

  create(): void {
    // Load town data
    this.grid = TOWN_MAP;
    this.buildings = extractBuildings();

    // Render the map
    this.renderGrid();
    this.renderBuildings();
    this.renderDecorations();

    // Initialize characters (boats, etc.)
    this.characters = createInitialBoats();
    this.renderCharacters();

    // Enable input
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointerup", this.handlePointerUp, this);
    this.input.on("wheel", this.handleWheel, this);

    // Native touch events for reliable multi-touch pinch zoom on mobile
    const canvas = this.game.canvas;
    canvas.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: false });
    canvas.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: false });
    canvas.addEventListener("touchend", this.handleTouchEnd.bind(this), { passive: false });
    canvas.addEventListener("touchcancel", this.handleTouchEnd.bind(this), { passive: false });

    // Handle clicks on interactive game objects (buildings)
    this.input.on("gameobjectup", (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      const dragDistance = Math.sqrt(
        Math.pow(pointer.x - this.panStartX, 2) +
        Math.pow(pointer.y - this.panStartY, 2)
      );
      // Only trigger click if we didn't drag much
      if (dragDistance < 10) {
        const building = gameObject.getData("building") as Building | undefined;
        if (building) {
          this.events_.onBuildingClick(building);
        }
      }
    });

    // Mark scene as ready
    this.isReady = true;

    // Center camera on the island
    this.centerCamera();
  }

  update(_time: number, delta: number): void {
    if (!this.isReady) return;

    // Update characters (boats, etc.) - convert delta from ms to seconds
    this.updateCharacters(delta / 1000);

    // Check if camera has moved significantly - update dynamic water tiles
    const camera = this.cameras.main;
    const cameraMoved =
      Math.abs(camera.scrollX - this.lastCameraBounds.x) > 50 ||
      Math.abs(camera.scrollY - this.lastCameraBounds.y) > 50 ||
      Math.abs(camera.zoom - this.lastCameraBounds.zoom) > 0.1;

    if (cameraMoved) {
      this.updateDynamicWater();
      this.lastCameraBounds = { x: camera.scrollX, y: camera.scrollY, zoom: camera.zoom };
    }
  }

  // Convert grid coordinates to screen coordinates
  private gridToScreen(gridX: number, gridY: number, elevation: number = 0): { x: number; y: number } {
    const iso = gridToIso(gridX, gridY);
    return {
      x: GRID_OFFSET_X + iso.x,
      y: GRID_OFFSET_Y + iso.y - elevation * ELEVATION_HEIGHT,
    };
  }

  // Convert screen coordinates to grid coordinates
  private screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
    const isoX = screenX - GRID_OFFSET_X;
    const isoY = screenY - GRID_OFFSET_Y;
    return isoToGrid(isoX, isoY);
  }

  // Render ground tiles
  private renderGrid(): void {
    // Clear existing tile sprites
    this.tileSprites.forEach((sprite) => sprite.destroy());
    this.tileSprites.clear();

    // Render water for areas outside the grid (infinite water effect)
    this.renderWaterBackground();

    // Render each tile with elevation
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cell = this.grid[y][x];
        this.renderTile(x, y, cell);
      }
    }
  }

  private renderWaterBackground(): void {
    // Create solid background for areas beyond water tiles
    const bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(0x4a90d9);
    bgGraphics.fillRect(-10000, -10000, 25000, 25000);
    bgGraphics.setDepth(-1000000);

    // Initial water tile render based on current viewport
    this.updateDynamicWater();
  }

  private updateDynamicWater(): void {
    const camera = this.cameras.main;
    // Non-uniform scaling to fix cube proportions (1.74:1 -> 2:1)
    const scaleX = TILE_WIDTH / 415;
    const scaleY = TILE_HEIGHT / 238;

    // Calculate visible screen bounds in world coordinates
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // Get world coordinates of screen corners
    const topLeft = camera.getWorldPoint(0, 0);
    const topRight = camera.getWorldPoint(screenWidth, 0);
    const bottomLeft = camera.getWorldPoint(0, screenHeight);
    const bottomRight = camera.getWorldPoint(screenWidth, screenHeight);

    // Convert to grid coordinates
    const corners = [
      this.screenToGrid(topLeft.x, topLeft.y),
      this.screenToGrid(topRight.x, topRight.y),
      this.screenToGrid(bottomLeft.x, bottomLeft.y),
      this.screenToGrid(bottomRight.x, bottomRight.y),
    ];

    // Find min/max grid coordinates with padding
    const padding = 3;
    const minGridX = Math.floor(Math.min(...corners.map((c) => c.x))) - padding;
    const maxGridX = Math.ceil(Math.max(...corners.map((c) => c.x))) + padding;
    const minGridY = Math.floor(Math.min(...corners.map((c) => c.y))) - padding;
    const maxGridY = Math.ceil(Math.max(...corners.map((c) => c.y))) + padding;

    // Track which water tiles we need
    const neededTiles = new Set<string>();

    for (let y = minGridY; y <= maxGridY; y++) {
      for (let x = minGridX; x <= maxGridX; x++) {
        // Skip tiles inside the grid (rendered by renderGrid)
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) continue;
        neededTiles.add(`water_${x}_${y}`);
      }
    }

    // Remove water sprites that are no longer visible
    for (const [key, sprite] of this.waterSprites) {
      if (!neededTiles.has(key)) {
        sprite.destroy();
        this.waterSprites.delete(key);
      }
    }

    // Add new water sprites for visible tiles
    for (let y = minGridY; y <= maxGridY; y++) {
      for (let x = minGridX; x <= maxGridX; x++) {
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) continue;

        const key = `water_${x}_${y}`;
        if (this.waterSprites.has(key)) continue; // Already exists

        const pos = this.gridToScreen(x, y, 0);
        const depth = (x + y) * DEPTH_Y_MULT;

        const sprite = this.add.image(pos.x, pos.y, "water");
        sprite.setOrigin(0.5, 0.148);
        sprite.setScale(scaleX, scaleY);
        sprite.setDepth(depth);

        // Apply water tint variation
        this.applyTileTint(sprite, TileType.Water, x, y);

        this.waterSprites.set(key, sprite);
      }
    }
  }

  private renderTile(x: number, y: number, cell: GridCell): void {
    const key = `tile_${x}_${y}`;
    const pos = this.gridToScreen(x, y, cell.elevation);
    const depth = (x + y) * DEPTH_Y_MULT + cell.elevation * 100;

    // Get texture key based on tile type
    const textureKey = this.getTileTextureKey(cell.ground);

    // Create or update tile sprite
    let sprite = this.tileSprites.get(key);
    if (!sprite) {
      sprite = this.add.image(pos.x, pos.y, textureKey);
      // Origin at the apex (top point) of the diamond for proper isometric alignment
      // Measured: apex is at y=76 of 512 = 0.148
      sprite.setOrigin(0.5, 0.148);
      this.tileSprites.set(key, sprite);
    } else {
      sprite.setTexture(textureKey);
      sprite.setPosition(pos.x, pos.y);
    }

    // Scale the cube tile to fit the isometric grid
    // Cube has 1.74:1 ratio instead of 2:1, so we need non-uniform scaling
    // Diamond: 415px wide, 238px tall. Target: 44px wide, 22px tall
    const scaleX = TILE_WIDTH / 415;    // 0.1060
    const scaleY = TILE_HEIGHT / 238;   // 0.0924 (compress height to match 2:1)
    sprite.setScale(scaleX, scaleY);
    sprite.setDepth(depth);

    // Apply tinting to darken sand/water and add water variation
    this.applyTileTint(sprite, cell.ground, x, y);
  }

  private applyTileTint(sprite: Phaser.GameObjects.Image, tileType: TileType, x: number, y: number): void {
    // Darken sand tiles slightly
    if (tileType === TileType.Sand) {
      sprite.setTint(0xe8dcc8); // Very subtle warm tint
      return;
    }

    // Add variation to water tiles - moderate range of blues
    if (tileType === TileType.Water) {
      const rand = Math.random();

      // Moderate variation - slightly lighter overall
      if (rand < 0.25) {
        sprite.setTint(0x98d0e8); // Slightly darker blue
      } else if (rand < 0.5) {
        sprite.setTint(0xa6d8ec); // Medium blue
      } else if (rand < 0.75) {
        sprite.setTint(0xb2e0f0); // Base blue
      } else {
        sprite.setTint(0xbee6f4); // Slightly lighter blue
      }
      return;
    }

    // Clear tint for other tile types
    sprite.clearTint();
  }

  private getTileTextureKey(tileType: TileType): string {
    const mapping: Record<TileType, string> = {
      [TileType.Grass]: "grass",
      [TileType.Water]: "water",
      [TileType.Sand]: "sand",
      [TileType.Cobblestone]: "cobblestone",
      [TileType.DockPlanks]: "dock_planks",
      [TileType.Rock]: "rock",
    };
    return mapping[tileType] || "grass";
  }

  private renderBuildings(): void {
    // Clear existing building sprites
    this.buildingSprites.forEach((sprite) => sprite.destroy());
    this.buildingSprites.clear();

    for (const building of this.buildings) {
      this.renderBuilding(building);
    }

  }

  private renderBuilding(building: Building): void {
    const key = `building_${building.id}`;
    const cell = this.grid[building.gridY][building.gridX];
    const buildingDef = getBuilding(building.type);
    if (!buildingDef) return;

    const orientation = cell.buildingOrientation || Direction.South;
    const spritePath = getBuildingSprite(building.type, orientation);
    if (!spritePath) return;

    const textureKey = `${buildingDef.name}_${orientation}`;
    const pos = this.gridToScreen(building.gridX, building.gridY, cell.elevation);

    // Depth based on position + render height for tall buildings
    const depth = (building.gridX + building.gridY) * DEPTH_Y_MULT +
                  cell.elevation * 100 +
                  buildingDef.renderHeight * 10;

    let sprite = this.buildingSprites.get(key);
    if (!sprite) {
      sprite = this.add.image(pos.x, pos.y, textureKey);
      sprite.setOrigin(0.5, 0.85); // Anchor near bottom center
      this.buildingSprites.set(key, sprite);
    } else {
      sprite.setTexture(textureKey);
      sprite.setPosition(pos.x, pos.y);
    }

    sprite.setScale(buildingDef.scale);
    sprite.setDepth(depth);

    // Store building data for click detection
    sprite.setData("building", building);

    // Set up interactive click handling for interactive buildings
    if (buildingDef.interactive) {
      sprite.setInteractive({ useHandCursor: true, pixelPerfect: false });

      // Add hover handlers for cursor changes
      sprite.on("pointerover", () => {
        this.hoveredBuilding = building;
        this.events_.onBuildingHover(building);
        this.game.canvas.style.cursor = "pointer";
      });

      sprite.on("pointerout", () => {
        if (this.hoveredBuilding === building) {
          this.hoveredBuilding = null;
          this.events_.onBuildingHover(null);
          this.game.canvas.style.cursor = "grab";
        }
      });
    }

    // Add building name label above the building
    const labelKey = `label_${building.id}`;
    // Position label above building based on visual height (scale * sprite size * origin offset)
    // Cap at reasonable height to prevent labels floating too high
    const visualHeight = Math.min(512 * buildingDef.scale * 0.7, 100);
    const labelY = pos.y - visualHeight - 10;
    const label = this.add.text(pos.x, labelY, building.name, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "8px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
      align: "center",
    });
    label.setOrigin(0.5, 1);
    label.setDepth(depth + 1000); // Always on top
  }

  private renderDecorations(): void {
    // Clear existing decoration sprites
    this.decoSprites.forEach((sprite) => sprite.destroy());
    this.decoSprites.clear();

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cell = this.grid[y][x];
        if (cell.deco) {
          this.renderDecoration(x, y, cell);
        }
      }
    }
  }

  // Simple seeded random for deterministic offsets
  private seededRandom(x: number, y: number, seed: number = 12345): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }

  private renderDecoration(x: number, y: number, cell: GridCell): void {
    if (!cell.deco) return;

    const key = `deco_${x}_${y}`;
    const isTree = cell.deco?.includes("tree") || cell.deco?.includes("pine");

    // Pick random orientation for trees (0, 90, 180, 270)
    const orientations = [0, 90, 180, 270];
    const orientationIndex = Math.floor(this.seededRandom(x, y, 3) * 4);
    const orientation = orientations[orientationIndex];
    let textureKey = `${cell.deco}_${orientation}`;

    // Fall back to coastal_pine for missing tree textures
    if (!this.textures.exists(textureKey)) {
      textureKey = `coastal_pine_${orientation}`;
      if (!this.textures.exists(textureKey)) {
        textureKey = "coastal_pine_0";
      }
    }

    const pos = this.gridToScreen(x, y, cell.elevation);

    // Add random offset to break up the grid pattern (trees only)
    let offsetX = 0;
    let offsetY = 0;
    if (isTree) {
      // Random offset up to ~40% of tile size in each direction
      offsetX = (this.seededRandom(x, y, 1) - 0.5) * TILE_WIDTH * 0.4;
      offsetY = (this.seededRandom(x, y, 2) - 0.5) * TILE_HEIGHT * 0.4;
    }

    const depth = (x + y) * DEPTH_Y_MULT + cell.elevation * 100 + 5;

    let sprite = this.decoSprites.get(key);
    if (!sprite) {
      sprite = this.add.image(pos.x + offsetX, pos.y + offsetY, textureKey);
      sprite.setOrigin(0.5, 0.85);
      this.decoSprites.set(key, sprite);
    } else {
      sprite.setTexture(textureKey);
      sprite.setPosition(pos.x + offsetX, pos.y + offsetY);
    }

    sprite.setScale(0.08); // Props are smaller
    sprite.setDepth(depth);
  }

  // Character movement system
  private updateCharacters(deltaSeconds: number): void {
    // Update each character's position along its path
    for (let i = 0; i < this.characters.length; i++) {
      this.characters[i] = updateCharacterPosition(this.characters[i], deltaSeconds);
    }

    // Re-render characters at new positions
    this.renderCharacters();
  }

  private renderCharacters(): void {
    for (const char of this.characters) {
      const key = `char_${char.id}`;
      const pos = this.gridToScreen(char.x, char.y, 0); // Characters are at elevation 0 (water level)
      const depth = (char.x + char.y) * DEPTH_Y_MULT + 50; // Slightly above water

      const textureKey = getCharacterSpriteKey(char.type, char.direction);
      const typeDef = CHARACTER_TYPES[char.type];

      let sprite = this.characterSprites.get(key);
      if (!sprite) {
        sprite = this.add.image(pos.x, pos.y, textureKey);
        sprite.setOrigin(0.5, 0.85);
        this.characterSprites.set(key, sprite);
      } else {
        sprite.setTexture(textureKey);
        sprite.setPosition(pos.x, pos.y);
      }

      sprite.setScale(char.scale ?? typeDef.defaultScale);
      sprite.setDepth(depth);
    }
  }

  // Input handlers
  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    // Skip if pinching (handled in update loop)
    if (this.isPinching) {
      return;
    }

    if (this.isPanning) {
      // Handle camera panning
      const dx = pointer.x - this.panStartX;
      const dy = pointer.y - this.panStartY;

      const camera = this.cameras.main;
      camera.scrollX = this.cameraStartX - dx / camera.zoom;
      camera.scrollY = this.cameraStartY - dy / camera.zoom;

      this.baseScrollX = camera.scrollX;
      this.baseScrollY = camera.scrollY;
      return;
    }

    // Check for building hover using Phaser's hit test first
    const hitObjects = this.input.hitTestPointer(pointer);
    let foundBuilding: Building | null = null;

    for (const obj of hitObjects) {
      const building = obj.getData("building") as Building | undefined;
      if (building) {
        const buildingDef = getBuilding(building.type);
        if (buildingDef?.interactive) {
          foundBuilding = building;
          break;
        }
      }
    }

    // Fallback: use grid-based detection if hit test didn't find anything
    if (!foundBuilding) {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const gridPos = this.screenToGrid(worldPoint.x, worldPoint.y);

      for (const building of this.buildings) {
        const buildingDef = getBuilding(building.type);
        if (!buildingDef || !buildingDef.interactive) continue;

        const bx = building.gridX;
        const by = building.gridY;
        const fw = buildingDef.footprint.width;
        const fh = buildingDef.footprint.height;

        if (gridPos.x >= bx && gridPos.x < bx + fw &&
            gridPos.y >= by && gridPos.y < by + fh) {
          foundBuilding = building;
          break;
        }
      }
    }

    if (foundBuilding !== this.hoveredBuilding) {
      this.hoveredBuilding = foundBuilding;
      this.events_.onBuildingHover(foundBuilding);

      // Update cursor
      this.game.canvas.style.cursor = foundBuilding ? "pointer" : "grab";
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    // Don't start panning if we're already pinching (handled in update)
    if (this.isPinching) {
      return;
    }

    // Start panning (single touch or mouse)
    this.isPanning = true;
    this.panStartX = pointer.x;
    this.panStartY = pointer.y;
    this.cameraStartX = this.cameras.main.scrollX;
    this.cameraStartY = this.cameras.main.scrollY;

    this.game.canvas.style.cursor = "grabbing";
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    // Reset pinch state
    if (this.isPinching) {
      this.isPinching = false;
      this.lastPinchDistance = 0;
      return;
    }

    const dragDistance = Math.sqrt(
      Math.pow(pointer.x - this.panStartX, 2) +
      Math.pow(pointer.y - this.panStartY, 2)
    );

    this.isPanning = false;

    // If we barely moved, treat as a click and check for building under pointer
    if (dragDistance < 10) {
      // Try Phaser's hit test first
      const hitObjects = this.input.hitTestPointer(pointer);
      let clickedBuilding: Building | undefined;

      for (const obj of hitObjects) {
        const building = obj.getData("building") as Building | undefined;
        if (building) {
          clickedBuilding = building;
          break;
        }
      }

      // Fallback: use grid-based detection if hit test didn't find anything
      if (!clickedBuilding) {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const gridPos = this.screenToGrid(worldPoint.x, worldPoint.y);

        for (const building of this.buildings) {
          const buildingDef = getBuilding(building.type);
          if (!buildingDef || !buildingDef.interactive) continue;

          const bx = building.gridX;
          const by = building.gridY;
          const fw = buildingDef.footprint.width;
          const fh = buildingDef.footprint.height;

          if (gridPos.x >= bx && gridPos.x < bx + fw &&
              gridPos.y >= by && gridPos.y < by + fh) {
            clickedBuilding = building;
            break;
          }
        }
      }

      if (clickedBuilding) {
        this.events_.onBuildingClick(clickedBuilding);
      }
    }

    this.game.canvas.style.cursor = this.hoveredBuilding ? "pointer" : "grab";
  }

  private handleWheel(
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number
  ): void {
    // Get the original event to check for trackpad pinch (ctrlKey)
    const event = pointer.event as WheelEvent | undefined;
    const isTrackpadPinch = event?.ctrlKey ?? false;

    const oldZoom = this.zoomLevel;
    let newZoom: number;
    if (isTrackpadPinch) {
      // Trackpad pinch: use exponential scaling for natural, smooth feel
      const zoomFactor = Math.exp(-deltaY / 300);
      newZoom = Phaser.Math.Clamp(oldZoom * zoomFactor, 0.8, 3);
    } else {
      // Regular mouse wheel: use smaller multiplicative step for smoother zoom
      const zoomFactor = deltaY > 0 ? 0.95 : 1.05;
      newZoom = Phaser.Math.Clamp(oldZoom * zoomFactor, 0.8, 3);
    }

    if (Math.abs(newZoom - oldZoom) > 0.001) {
      const camera = this.cameras.main;

      // Calculate offset from screen center (Phaser camera is center-based)
      const offsetX = pointer.x - camera.width / 2;
      const offsetY = pointer.y - camera.height / 2;

      // Adjust scroll to keep the world point under cursor fixed
      // Formula: newScroll = oldScroll + offset * (1/oldZoom - 1/newZoom)
      const zoomDiff = 1 / oldZoom - 1 / newZoom;
      camera.scrollX += offsetX * zoomDiff;
      camera.scrollY += offsetY * zoomDiff;

      this.zoomLevel = newZoom;
      camera.setZoom(newZoom);

      this.baseScrollX = camera.scrollX;
      this.baseScrollY = camera.scrollY;

      // Emit zoom change event
      this.events.emit("zoomChanged", newZoom);
    }
  }

  // Native touch handlers for reliable mobile pinch zoom
  private handleTouchStart(event: TouchEvent): void {
    // Track all active touches
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }

    // Start pinch if we have 2 touches
    if (this.activeTouches.size === 2) {
      event.preventDefault();
      const touches = Array.from(this.activeTouches.values());
      const dx = touches[0].x - touches[1].x;
      const dy = touches[0].y - touches[1].y;
      this.lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
      this.isPinching = true;
      this.isPanning = false;
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    // Update tracked touch positions
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (this.activeTouches.has(touch.identifier)) {
        this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }
    }

    // Handle pinch zoom
    if (this.isPinching && this.activeTouches.size >= 2) {
      event.preventDefault();

      const touches = Array.from(this.activeTouches.values());
      const dx = touches[0].x - touches[1].x;
      const dy = touches[0].y - touches[1].y;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);

      // Calculate current pinch center in canvas coordinates
      const canvas = this.game.canvas;
      const rect = canvas.getBoundingClientRect();
      const centerX = ((touches[0].x + touches[1].x) / 2 - rect.left) * (canvas.width / rect.width);
      const centerY = ((touches[0].y + touches[1].y) / 2 - rect.top) * (canvas.height / rect.height);

      if (this.lastPinchDistance > 0 && currentDistance > 0) {
        const oldZoom = this.zoomLevel;
        const scale = currentDistance / this.lastPinchDistance;
        const newZoom = Phaser.Math.Clamp(oldZoom * scale, 0.8, 3);

        if (Math.abs(newZoom - oldZoom) > 0.0001) {
          const camera = this.cameras.main;

          // Calculate offset from screen center (Phaser camera is center-based)
          const offsetX = centerX - camera.width / 2;
          const offsetY = centerY - camera.height / 2;

          // Adjust scroll to keep the world point under pinch center fixed
          const zoomDiff = 1 / oldZoom - 1 / newZoom;
          camera.scrollX += offsetX * zoomDiff;
          camera.scrollY += offsetY * zoomDiff;

          this.zoomLevel = newZoom;
          camera.setZoom(newZoom);

          this.baseScrollX = camera.scrollX;
          this.baseScrollY = camera.scrollY;
          this.events.emit("zoomChanged", newZoom);
        }

        this.lastPinchDistance = currentDistance;
      }
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    // Remove ended touches
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.activeTouches.delete(touch.identifier);
    }

    // End pinch if we no longer have 2 touches
    if (this.activeTouches.size < 2 && this.isPinching) {
      this.isPinching = false;
      this.lastPinchDistance = 0;
    }
  }

  // Public methods for React integration
  public setEventCallbacks(events: SceneEvents): void {
    this.events_ = events;
  }

  public setZoom(zoom: number): void {
    if (zoom !== this.zoomLevel) {
      this.zoomLevel = zoom;
      this.cameras.main.setZoom(zoom);
    }
  }

  public centerCamera(): void {
    // Center on the middle of the island (roughly grid center)
    const centerX = GRID_WIDTH / 2;
    const centerY = GRID_HEIGHT / 2;
    const pos = this.gridToScreen(centerX, centerY, 2); // Elevation 2 is middle height

    const camera = this.cameras.main;
    camera.centerOn(pos.x, pos.y);

    this.baseScrollX = camera.scrollX;
    this.baseScrollY = camera.scrollY;
  }

  public zoomAtPoint(zoom: number, screenX: number, screenY: number): void {
    const camera = this.cameras.main;
    const worldBefore = camera.getWorldPoint(screenX, screenY);

    this.zoomLevel = zoom;
    camera.setZoom(zoom);

    const worldAfter = camera.getWorldPoint(screenX, screenY);
    camera.scrollX += worldBefore.x - worldAfter.x;
    camera.scrollY += worldBefore.y - worldAfter.y;

    this.baseScrollX = camera.scrollX;
    this.baseScrollY = camera.scrollY;
  }

  public getZoom(): number {
    return this.zoomLevel;
  }
}
