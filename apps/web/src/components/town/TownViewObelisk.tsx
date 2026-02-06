'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Simple isometric renderer
const ISO = {
  // Draw a flat isometric tile (just the top diamond - no sides)
  drawFlatTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    depth: number,
    color: string
  ) {
    const w = width;
    const d = depth;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + w * 0.5);
    ctx.lineTo(x + w + d, y + (w - d) * 0.5);
    ctx.lineTo(x + d, y - d * 0.5);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  },

  // Draw an isometric cube
  drawCube(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    depth: number,
    height: number,
    topColor: string,
    leftColor: string,
    rightColor: string
  ) {
    const w = width;
    const d = depth;
    const h = height;

    // Top face (diamond)
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + w * 0.5);
    ctx.lineTo(x + w + d, y + (w - d) * 0.5);
    ctx.lineTo(x + d, y - d * 0.5);
    ctx.closePath();
    ctx.fillStyle = topColor;
    ctx.fill();
    ctx.strokeStyle = '#00000022';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Left face
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + w * 0.5);
    ctx.lineTo(x + w, y + w * 0.5 + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fillStyle = leftColor;
    ctx.fill();
    ctx.stroke();

    // Right face
    ctx.beginPath();
    ctx.moveTo(x + w, y + w * 0.5);
    ctx.lineTo(x + w + d, y + (w - d) * 0.5);
    ctx.lineTo(x + w + d, y + (w - d) * 0.5 + h);
    ctx.lineTo(x + w, y + w * 0.5 + h);
    ctx.closePath();
    ctx.fillStyle = rightColor;
    ctx.fill();
    ctx.stroke();
  },

  // Draw pyramid roof
  drawPyramid(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    baseWidth: number,
    height: number,
    leftColor: string,
    rightColor: string
  ) {
    const w = baseWidth;
    const h = height;
    const centerX = x + w;
    const peakY = y - h;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(centerX, peakY);
    ctx.lineTo(x + w, y + w * 0.5);
    ctx.closePath();
    ctx.fillStyle = leftColor;
    ctx.fill();
    ctx.strokeStyle = '#00000022';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + w, y + w * 0.5);
    ctx.lineTo(centerX, peakY);
    ctx.lineTo(x + w * 2, y);
    ctx.closePath();
    ctx.fillStyle = rightColor;
    ctx.fill();
    ctx.stroke();
  },

  // Draw a simple tree (trunk + foliage) - scaled down for higher res map
  drawTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number = 1
  ) {
    const treeScale = scale * 0.5;
    const trunkW = 3 * treeScale;
    const trunkH = 12 * treeScale;
    const foliageW = 10 * treeScale;
    const foliageH = 10 * treeScale;

    // In isometric, visual center of a cube is at x + width (the front-facing corner)
    // Position trunk first
    const trunkX = x + 10 * scale - trunkW;
    ISO.drawCube(ctx, trunkX, y, trunkW, trunkW, trunkH, '#8B5A2B', '#6B4423', '#4B2F1A');

    // Foliage centered on trunk's visual center (trunkX + trunkW)
    const trunkVisualCenter = trunkX + trunkW;
    const foliageX = trunkVisualCenter - foliageW;
    const foliageY = y - trunkH + treeScale * 4;
    ISO.drawCube(ctx, foliageX, foliageY, foliageW, foliageW, foliageH, '#4CAF50', '#388E3C', '#2E7D32');
  },

  // Draw a simple fishing boat
  drawBoat(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number = 1
  ) {
    const boatScale = scale * 0.6;
    const hullW = 16 * boatScale;
    const hullD = 8 * boatScale;
    const hullH = 4 * boatScale;
    const cabinW = 6 * boatScale;
    const cabinH = 5 * boatScale;
    const mastH = 14 * boatScale;

    // Hull (brown)
    ISO.drawCube(ctx, x, y, hullW, hullD, hullH, '#8B4513', '#6B3503', '#4B2503');

    // Small cabin (white)
    const cabinX = x + hullW * 0.3;
    const cabinY = y - hullH;
    ISO.drawCube(ctx, cabinX, cabinY, cabinW, cabinW, cabinH, '#f0f0f0', '#d0d0d0', '#b0b0b0');

    // Mast (thin brown pole)
    const mastX = x + hullW * 0.5;
    const mastY = y - hullH - mastH;
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(mastX, mastY, 2 * boatScale, mastH);

    // Simple sail (triangle)
    ctx.beginPath();
    ctx.moveTo(mastX + 2 * boatScale, mastY);
    ctx.lineTo(mastX + 2 * boatScale, mastY + mastH * 0.8);
    ctx.lineTo(mastX + 12 * boatScale, mastY + mastH * 0.6);
    ctx.closePath();
    ctx.fillStyle = '#f5f5dc';
    ctx.fill();
    ctx.strokeStyle = '#d0c8a0';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  },

  // Draw a larger cargo/fishing vessel (bigger design, same scale as small boat)
  drawLargeBoat(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number = 1
  ) {
    const s = scale * 0.6; // Same scaling as small boat
    const hullW = 24 * s;
    const hullD = 12 * s;
    const hullH = 5 * s;

    // Hull (dark wood)
    ISO.drawCube(ctx, x, y, hullW, hullD, hullH, '#6B4423', '#5B3413', '#4B2403');

    // Deck (lighter wood on top of hull)
    ISO.drawCube(ctx, x + 2 * s, y - hullH, hullW - 4 * s, hullD - 4 * s, 1.5 * s, '#a07040', '#906030', '#805020');

    // Cabin at back
    const cabinW = 8 * s;
    const cabinH = 6 * s;
    ISO.drawCube(ctx, x + 3 * s, y - hullH - 1.5 * s, cabinW, cabinW, cabinH, '#f0e8d8', '#d0c8b8', '#b0a898');

    // Cabin roof
    ISO.drawCube(ctx, x + 3 * s, y - hullH - 1.5 * s - cabinH, cabinW, cabinW, 1.5 * s, '#8B4513', '#6B3503', '#4B2503');

    // Mast
    const mastX = x + hullW * 0.6;
    const mastH = 16 * s;
    const mastY = y - hullH - 1.5 * s - mastH;
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(mastX, mastY, 2 * s, mastH);

    // Large sail
    ctx.beginPath();
    ctx.moveTo(mastX + 2 * s, mastY + 1 * s);
    ctx.lineTo(mastX + 2 * s, mastY + mastH * 0.8);
    ctx.lineTo(mastX + 14 * s, mastY + mastH * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#f5f5dc';
    ctx.fill();
    ctx.strokeStyle = '#d0c8a0';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
};

// Seeded random for consistent water variation
const seededRandom = (x: number, y: number) => {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

// Town grid data
type TileType = 'grass' | 'water' | 'sand' | 'road' | 'plaza' | 'rock';
type BuildingType = 'town_hall' | 'forum' | 'project_board' | 'dock' | 'lighthouse' | null;
type DecoType = 'tree' | null;

interface MapCell {
  ground: TileType;
  building: BuildingType;
  buildingHeight?: number;
  deco?: DecoType;
  elevation?: number; // 0 = sea level, 1+ = elevated terrain
}

interface Building {
  id: string;
  type: BuildingType;
  name: string;
  gridX: number;
  gridY: number;
}

// 32x32 town map with elevation (0=sea level, 1+=elevated)
// Helper to generate rows
const w: MapCell = { ground: 'water', building: null, elevation: 0 };
const s: MapCell = { ground: 'sand', building: null, elevation: 0 };
const g1: MapCell = { ground: 'grass', building: null, elevation: 1 };
const g2: MapCell = { ground: 'grass', building: null, elevation: 2 };
const g3: MapCell = { ground: 'grass', building: null, elevation: 3 };
const r1: MapCell = { ground: 'road', building: null, elevation: 1 };
const r2: MapCell = { ground: 'road', building: null, elevation: 2 };
const r3: MapCell = { ground: 'road', building: null, elevation: 3 };
const p3: MapCell = { ground: 'plaza', building: null, elevation: 3 };
const t1: MapCell = { ground: 'grass', building: null, deco: 'tree', elevation: 1 };
const t2: MapCell = { ground: 'grass', building: null, deco: 'tree', elevation: 2 };
const t3: MapCell = { ground: 'grass', building: null, deco: 'tree', elevation: 3 };
// Rocky outcrops
const k1: MapCell = { ground: 'rock', building: null, elevation: 1 };
const k2: MapCell = { ground: 'rock', building: null, elevation: 2 };

const TOWN_MAP: MapCell[][] = [
  // Rows 0-1: Water
  [w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w],
  [w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w],
  // Rows 2-3: North beach with rocky outcrops
  [w,w,w,w,s,s,s,k1,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,w,w,w,w],
  [w,w,w,s,s,s,k1,k1,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,w,w,w],
  // Rows 4-5: Beach to grass
  [w,w,s,s,s,s,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,s,s,s,s,s,w,w],
  [w,s,s,s,g1,g1,g1,t1,g1,g1,g1,g2,g2,g2,g2,g2,g2,g2,g2,g2,g1,g1,t1,g1,g1,g1,s,s,s,s,s,w],
  // Rows 6-7: Grass elevation rising - project board area
  [w,s,s,g1,g1,g1,{ ground: 'grass', building: 'project_board', buildingHeight: 2, elevation: 1 },g1,g2,g2,g2,g2,g2,g2,g2,g2,g2,g2,g2,g2,g2,g2,g1,g1,g1,g1,g1,s,s,s,s,w],
  [s,s,g1,g1,g1,t1,g1,g1,g2,g2,g2,t2,g2,g2,g3,g3,g3,g3,g2,t2,g2,g2,g2,g1,g1,g1,g1,g1,s,s,s,w],
  // Rows 8-9: Elevation 2-3 transition
  [s,s,g1,g1,g1,g1,g2,g2,g2,g2,g2,g2,g3,g3,g3,g3,g3,g3,g3,g3,g2,g2,g2,g2,g1,g1,g1,g1,s,s,s,w],
  [s,g1,g1,g1,t1,g1,g2,g2,g2,g2,g2,g3,g3,g3,r3,r3,r3,r3,g3,g3,g3,g2,g2,g2,g2,g1,g1,g1,g1,s,s,w],
  // Rows 10-11: Upper town - elevation 3
  [s,g1,g1,g1,g1,g2,g2,g2,g2,g2,g2,g3,g3,r3,p3,p3,p3,p3,r3,g3,g3,{ ground: 'grass', building: 'forum', buildingHeight: 3, elevation: 3 },g3,g2,g2,g1,g1,g1,g1,s,s,w],
  [s,g1,g1,g1,g1,g2,g2,t2,g2,g2,g3,g3,r3,p3,p3,p3,p3,p3,p3,r3,g3,g3,g3,g2,g2,g2,g1,g1,g1,s,s,w],
  // Rows 12-13: Town hall area - highest point
  [s,g1,g1,g1,g2,g2,g2,g2,g2,g3,g3,r3,p3,p3,{ ground: 'plaza', building: 'town_hall', buildingHeight: 5, elevation: 3 },p3,p3,p3,p3,p3,r3,g3,g3,t3,g2,g2,g1,g1,g1,s,s,w],
  [s,g1,g1,g1,g2,g2,g2,g2,g3,t3,g3,r3,p3,p3,p3,p3,p3,p3,p3,p3,r3,g3,g3,g3,g2,g2,g1,g1,g1,s,s,w],
  // Rows 14-15: Town hall lower + main road start
  [s,g1,g1,g1,g2,g2,g2,g2,g3,g3,g3,r3,p3,p3,p3,p3,p3,p3,p3,p3,r3,g3,g3,g2,g2,g2,g1,g1,g1,s,s,w],
  [s,g1,g1,g1,g1,g2,g2,g2,g2,g3,g3,r3,r3,r3,r3,r3,r3,r3,r3,r3,r3,g3,g2,g2,g2,g1,g1,g1,g1,s,s,w],
  // Rows 16-17: Main road descending
  [s,g1,g1,t1,g1,g1,g2,g2,g2,g2,r2,r2,g2,g2,g2,g2,g2,g2,g2,g2,r2,r2,g2,g2,g2,g1,g1,g1,s,s,s,w],
  [s,g1,g1,g1,g1,g1,g1,g2,g2,g2,r2,g2,g2,g2,t2,g2,g2,g2,g2,g2,g2,r2,r2,g2,g2,g1,g1,g1,s,s,s,w],
  // Rows 18-19: Road to dock
  [s,g1,g1,g1,g1,g1,g1,g1,g2,g2,r2,g2,g2,g2,g2,g2,g2,g2,g2,g2,g2,g2,r2,r2,g1,g1,g1,s,s,s,s,w],
  [s,g1,g1,g1,t1,g1,g1,g1,g1,g2,r1,g1,g1,g1,g1,g1,g1,t1,g1,g1,g1,g1,g1,r1,r1,r1,s,s,s,s,s,w],
  // Rows 20-21: South inland - dock moved right
  [s,g1,g1,g1,g1,g1,g1,g1,g1,g1,r1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,r1,r1,s,s,s,{ ground: 'sand', building: 'dock', buildingHeight: 1, elevation: 0 },s,w],
  [s,g1,g1,g1,g1,t1,g1,g1,g1,g1,g1,g1,g1,t1,g1,g1,g1,g1,g1,t1,g1,g1,g1,g1,s,s,s,s,s,s,w,w],
  // Rows 22-23: South area - lighthouse on rocky outcrop
  [s,s,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,s,k1,k1,s,s,s,s,w,w,w],
  [s,s,g1,g1,g1,g1,g1,t1,g1,g1,g1,g1,g1,g1,g1,g1,g1,t1,g1,g1,s,s,k1,{ ground: 'rock', building: 'lighthouse', buildingHeight: 10, elevation: 2 },k1,s,s,s,w,w,w,w],
  // Rows 24-25: Grass to beach - rocks near lighthouse
  [s,s,s,g1,g1,g1,g1,g1,g1,g1,g1,g1,t1,g1,g1,g1,g1,g1,g1,g1,g1,s,k1,k1,s,s,s,s,w,w,w,w],
  [s,s,s,s,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,g1,s,s,s,k1,s,s,s,w,w,w,w,w],
  // Rows 26-27: South beach with rocks
  [w,s,s,s,s,s,g1,g1,g1,g1,g1,t1,g1,g1,g1,g1,g1,g1,s,s,s,s,s,s,s,s,w,w,w,w,w,w],
  [w,s,s,k1,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,w,w,w,w,w,w,w],
  // Rows 28-29: Beach to water
  [w,w,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,w,w,w,w,w,w,w,w],
  [w,w,w,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,s,w,w,w,w,w,w,w,w,w,w],
  // Rows 30-31: Water
  [w,w,w,w,w,s,s,s,s,s,s,s,s,s,s,s,s,s,s,w,w,w,w,w,w,w,w,w,w,w,w,w],
  [w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w],
];

const BUILDING_NAMES: Record<string, string> = {
  town_hall: 'Town Hall',
  forum: 'Community Forum',
  project_board: 'Project Board',
  dock: 'Lobster Dock',
  lighthouse: 'Lighthouse',
};

// Base grid settings
const BASE_TILE_SIZE = 10; // Halved again for 4x resolution
const BASE_TILE_HEIGHT = 5; // Halved again for 4x resolution
const BASE_ELEVATION_HEIGHT = 4; // Height per elevation level
const GRID_SIZE = 32; // 32x32 grid
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 3.0;

const hexToCSS = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;

const COLORS = {
  grass: { top: 0x7ec850, left: 0x5a9a30, right: 0x4a8020 },
  water: { top: 0x4a90d9, left: 0x3a70b9, right: 0x2a5090 },
  sand: { top: 0xe8d4a0, left: 0xc8b480, right: 0xa89460 },
  road: { top: 0x606060, left: 0x505050, right: 0x404040 },
  plaza: { top: 0x808080, left: 0x606060, right: 0x505050 },
  cliff: { top: 0x8b7355, left: 0x6b5335, right: 0x5b4325 }, // Earth/cliff color for elevation
  rock: { top: 0x707070, left: 0x585858, right: 0x484848 }, // Rocky terrain
  town_hall: { top: 0xc04040, left: 0xa03030, right: 0x802020 },
  forum: { top: 0x4080c0, left: 0x3060a0, right: 0x204080 },
  project_board: { top: 0x80c040, left: 0x60a030, right: 0x408020 },
  dock: { top: 0x8b6914, left: 0x6b4904, right: 0x4b2904 },
  lighthouse: { top: 0xffffff, left: 0xe0e0e0, right: 0xc0c0c0 },
};

interface TownViewProps {
  onBuildingClick?: (building: Building) => void;
}

export function TownViewObelisk({ onBuildingClick }: TownViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Touch state for pinch zoom and pan
  const touchStateRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    centerX: number;
    centerY: number;
  } | null>(null);

  // Single touch pan state
  const touchPanRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    hasMoved: boolean;
  } | null>(null);

  // Pan state for mouse drag
  const panStateRef = useRef<{ isPanning: boolean; hasMoved: boolean; startX: number; startY: number; startPanX: number; startPanY: number }>({
    isPanning: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // Get current tile size based on zoom
  const tileSize = BASE_TILE_SIZE * zoom;
  const tileHeight = BASE_TILE_HEIGHT * zoom;
  const elevationHeight = BASE_ELEVATION_HEIGHT * zoom;

  // Convert grid to screen position (isometric)
  const gridToScreen = useCallback((gridX: number, gridY: number, currentZoom: number) => {
    const ts = BASE_TILE_SIZE * currentZoom;
    const isoX = (gridX - gridY) * ts;
    const isoY = (gridX + gridY) * (ts / 2);
    return { x: isoX, y: isoY };
  }, []);

  // Convert screen position to grid (for hit detection)
  const screenToGrid = useCallback((screenX: number, screenY: number, offsetX: number, offsetY: number, currentZoom: number) => {
    const ts = BASE_TILE_SIZE * currentZoom;

    // Adjust for canvas offset
    const adjustedX = screenX - offsetX;
    const adjustedY = screenY - offsetY;

    // Reverse isometric projection
    // isoX = (gridX - gridY) * ts
    // isoY = (gridX + gridY) * (ts / 2)
    // Solving: gridX = (isoX/ts + isoY/(ts/2)) / 2
    //          gridY = (isoY/(ts/2) - isoX/ts) / 2
    const gridX = (adjustedX / ts + adjustedY / (ts / 2)) / 2;
    const gridY = (adjustedY / (ts / 2) - adjustedX / ts) / 2;

    return { x: Math.floor(gridX), y: Math.floor(gridY) };
  }, []);

  // Find building at screen coordinates using simple tile-based detection
  const findBuildingAtPoint = useCallback((screenX: number, screenY: number): Building | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const offsetX = canvas.width / 2 + panOffset.x;
    const offsetY = canvas.height * 0.15 + panOffset.y;
    const ts = BASE_TILE_SIZE * zoom;

    // Convert screen point to grid coordinates
    const isoX = screenX - offsetX;
    const isoY = screenY - offsetY;

    // Check each building tile, front to back
    // We check in a range around the clicked point to account for building height
    for (let y = GRID_SIZE - 1; y >= 0; y--) {
      for (let x = GRID_SIZE - 1; x >= 0; x--) {
        const cell = TOWN_MAP[y]?.[x];
        if (!cell?.building) continue;

        const elevation = cell.elevation ?? 0;
        const elevOffset = elevation * BASE_ELEVATION_HEIGHT * zoom;
        const buildingHeight = (cell.buildingHeight || 2) * BASE_TILE_HEIGHT * zoom;

        // Get the tile's screen position
        const pos = gridToScreen(x, y, zoom);
        const tileScreenX = offsetX + pos.x;
        const tileScreenY = offsetY + pos.y;

        // Building sits on top of the tile, elevated
        const buildingTopY = tileScreenY - elevOffset - BASE_TILE_HEIGHT * zoom - buildingHeight;
        const buildingBottomY = tileScreenY - elevOffset + ts * 0.5;

        // Horizontal bounds of the tile (isometric diamond shape)
        const tileLeftX = tileScreenX;
        const tileRightX = tileScreenX + ts * 2;
        const tileCenterX = tileScreenX + ts;

        // Check if click is within the tile's horizontal bounds
        if (screenX < tileLeftX || screenX > tileRightX) continue;

        // Check if click is within the vertical bounds (top of building to bottom of tile)
        if (screenY < buildingTopY || screenY > buildingBottomY) continue;

        // More precise: check if within the isometric diamond shape for the tile
        const relX = screenX - tileCenterX;
        const relY = screenY - (tileScreenY - elevOffset);

        // Diamond check: |x|/halfWidth + |y|/halfHeight <= 1
        // But we extend upward to include the building
        if (screenY <= tileScreenY - elevOffset) {
          // Above the tile surface - check if within building vertical bounds
          if (Math.abs(relX) <= ts) {
            return {
              id: cell.building,
              type: cell.building,
              name: BUILDING_NAMES[cell.building] || cell.building,
              gridX: x,
              gridY: y,
            };
          }
        } else {
          // On or below tile surface - use diamond check
          const diamondDist = Math.abs(relX) / ts + Math.abs(relY) / (ts * 0.5);
          if (diamondDist <= 1) {
            return {
              id: cell.building,
              type: cell.building,
              name: BUILDING_NAMES[cell.building] || cell.building,
              gridX: x,
              gridY: y,
            };
          }
        }
      }
    }

    return null;
  }, [gridToScreen, zoom, panOffset]);

  // Render the town with infinite sea
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const offsetX = canvas.width / 2 + panOffset.x;
    const offsetY = canvas.height * 0.15 + panOffset.y;

    // Calculate visible grid range by converting screen corners to grid coordinates
    // In isometric: isoX = (gridX - gridY) * ts, isoY = (gridX + gridY) * (ts/2)
    // Inverse: gridX = (isoX/ts + isoY/(ts/2)) / 2, gridY = (isoY/(ts/2) - isoX/ts) / 2
    const ts = BASE_TILE_SIZE * zoom;

    const screenToGridCoord = (screenX: number, screenY: number) => {
      const isoX = screenX - offsetX;
      const isoY = screenY - offsetY;
      return {
        x: (isoX / ts + isoY / (ts / 2)) / 2,
        y: (isoY / (ts / 2) - isoX / ts) / 2,
      };
    };

    // Convert all 4 screen corners to grid coordinates
    const corners = [
      screenToGridCoord(0, 0),                          // top-left
      screenToGridCoord(canvas.width, 0),               // top-right
      screenToGridCoord(0, canvas.height),              // bottom-left
      screenToGridCoord(canvas.width, canvas.height),   // bottom-right
    ];

    // Find min/max grid coordinates from all corners
    const padding = 2; // Extra tiles for safety
    const minGridX = Math.floor(Math.min(...corners.map(c => c.x))) - padding;
    const maxGridX = Math.ceil(Math.max(...corners.map(c => c.x))) + padding;
    const minGridY = Math.floor(Math.min(...corners.map(c => c.y))) - padding;
    const maxGridY = Math.ceil(Math.max(...corners.map(c => c.y))) + padding;

    const waterColors = COLORS.water;

    // Render tiles back to front (painter's algorithm)
    for (let y = minGridY; y <= maxGridY; y++) {
      for (let x = minGridX; x <= maxGridX; x++) {
        const pos = gridToScreen(x, y, zoom);
        const screenX = offsetX + pos.x;
        const screenY = offsetY + pos.y;

        // Skip if completely off screen (with margin for tile size)
        if (screenX < -tileSize * 2 || screenX > canvas.width + tileSize * 2 ||
            screenY < -tileSize * 2 || screenY > canvas.height + tileSize * 2) {
          continue;
        }

        // Check if this is within the island bounds
        const isOnIsland = x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
        const cell = isOnIsland ? TOWN_MAP[y][x] : null;
        const elevation = cell?.elevation ?? 0;
        const elevOffset = elevation * elevationHeight;

        if (!isOnIsland || !cell) {
          // Draw infinite sea with color variation
          // Check if near shore (adjacent to island)
          const isNearShore = (
            (x >= -1 && x <= GRID_SIZE && y >= -1 && y <= GRID_SIZE) &&
            (TOWN_MAP[Math.max(0, Math.min(GRID_SIZE-1, y))]?.[Math.max(0, Math.min(GRID_SIZE-1, x))]?.ground === 'sand' ||
             TOWN_MAP[Math.max(0, Math.min(GRID_SIZE-1, y+1))]?.[Math.max(0, Math.min(GRID_SIZE-1, x))]?.ground === 'sand' ||
             TOWN_MAP[Math.max(0, Math.min(GRID_SIZE-1, y))]?.[Math.max(0, Math.min(GRID_SIZE-1, x+1))]?.ground === 'sand' ||
             TOWN_MAP[Math.max(0, Math.min(GRID_SIZE-1, y-1))]?.[Math.max(0, Math.min(GRID_SIZE-1, x))]?.ground === 'sand' ||
             TOWN_MAP[Math.max(0, Math.min(GRID_SIZE-1, y))]?.[Math.max(0, Math.min(GRID_SIZE-1, x-1))]?.ground === 'sand')
          );

          // Seeded random variation for this tile
          const variation = seededRandom(x, y);
          const colorShift = Math.floor((variation - 0.5) * 20);

          // Near shore: more white/foam, further: subtle blue variation
          let topColor = waterColors.top;
          let leftColor = waterColors.left;
          let rightColor = waterColors.right;

          if (isNearShore && variation > 0.6) {
            // Whitecap/foam effect
            topColor = 0x7ab8e8;
            leftColor = 0x5a98c8;
            rightColor = 0x4a78a8;
          } else {
            // Subtle variation
            topColor = Math.max(0, Math.min(0xffffff, waterColors.top + colorShift * 0x010101));
            leftColor = Math.max(0, Math.min(0xffffff, waterColors.left + colorShift * 0x010101));
            rightColor = Math.max(0, Math.min(0xffffff, waterColors.right + colorShift * 0x010101));
          }

          // Flat tile for sea (no sides visible at elevation 0)
          ISO.drawFlatTile(ctx, screenX, screenY, tileSize, tileSize, hexToCSS(topColor));

          // Draw fishing boats at specific locations (raised above water surface)
          if (x === -3 && y === 15) {
            ISO.drawBoat(ctx, screenX + tileSize * 0.2, screenY - tileHeight * 0.8, zoom);
          }
          // Larger cargo boat further out
          if (x === 35 && y === 10) {
            ISO.drawLargeBoat(ctx, screenX, screenY - tileHeight * 0.8, zoom);
          }

          continue;
        }

        // For elevated tiles, first draw the cliff/earth base
        if (elevation > 0) {
          const cliffColors = COLORS.cliff;
          ISO.drawCube(
            ctx, screenX, screenY,
            tileSize, tileSize, elevOffset,
            hexToCSS(cliffColors.top),
            hexToCSS(cliffColors.left),
            hexToCSS(cliffColors.right)
          );
        }

        // Draw ground tile at elevated position
        const groundColors = COLORS[cell.ground];
        const elevatedY = screenY - elevOffset;

        // Draw ground - use flat tile for elevation 0 (no sides visible)
        if (elevation === 0) {
          ISO.drawFlatTile(ctx, screenX, elevatedY, tileSize, tileSize, hexToCSS(groundColors.top));
        } else {
          ISO.drawCube(
            ctx, screenX, elevatedY,
            tileSize, tileSize, tileHeight,
            hexToCSS(groundColors.top),
            hexToCSS(groundColors.left),
            hexToCSS(groundColors.right)
          );
        }

        // Draw decoration (tree)
        if (cell.deco === 'tree') {
          const treeX = screenX + tileSize * 0.25;
          const treeY = elevatedY - tileHeight + tileSize * 0.1;
          ISO.drawTree(ctx, treeX, treeY, zoom);
        }

        // Draw building
        if (cell.building) {
          const buildingColors = COLORS[cell.building as keyof typeof COLORS];
          if (buildingColors) {
            const height = (cell.buildingHeight || 2) * tileHeight;
            const buildingY = elevatedY - tileHeight;

            if (cell.building === 'lighthouse') {
              // Lighthouse: tapered white tower with multiple layers and red lamp
              const layers = 5;
              const layerHeight = height / (layers + 1); // +1 for lamp
              const baseSize = tileSize * 0.8;
              const shrinkPerLayer = tileSize * 0.06;

              // Draw white tower layers (bottom to top, each slightly smaller)
              for (let i = 0; i < layers; i++) {
                const layerSize = baseSize - (i * shrinkPerLayer);
                const layerOffset = (tileSize - layerSize) / 2;
                const layerY = buildingY - (i * layerHeight);
                ISO.drawCube(
                  ctx, screenX + layerOffset, layerY,
                  layerSize, layerSize, layerHeight,
                  hexToCSS(buildingColors.top),
                  hexToCSS(buildingColors.left),
                  hexToCSS(buildingColors.right)
                );
              }

              // Red lamp on top
              const lampSize = baseSize - (layers * shrinkPerLayer);
              const lampOffset = (tileSize - lampSize) / 2;
              const lampY = buildingY - (layers * layerHeight);
              ISO.drawCube(
                ctx, screenX + lampOffset, lampY,
                lampSize, lampSize, layerHeight,
                '#c04040', '#a03030', '#802020'
              );
            } else if (cell.building === 'town_hall') {
              // Town hall: red building with brown roof
              const bodyHeight = height * 0.75;
              const roofHeight = height * 0.25;
              const bodySize = tileSize * 0.85;
              const bodyOffset = (tileSize - bodySize) / 2;

              // Main building body (red)
              ISO.drawCube(
                ctx, screenX + bodyOffset, buildingY,
                bodySize, bodySize, bodyHeight,
                hexToCSS(buildingColors.top),
                hexToCSS(buildingColors.left),
                hexToCSS(buildingColors.right)
              );
              // Brown roof on top - roof bottom should meet body top (buildingY)
              ISO.drawCube(
                ctx, screenX + bodyOffset, buildingY - roofHeight,
                bodySize, bodySize, roofHeight,
                '#8B4513', '#6B3503', '#4B2503'
              );
            } else if (cell.building === 'dock') {
              // Dock: wooden pier extending into the water
              const dockWidth = tileSize * 0.5;
              const dockHeight = tileHeight * 0.3;
              // Main dock platform on beach
              ISO.drawCube(
                ctx, screenX + tileSize * 0.25, buildingY + tileHeight * 0.5,
                dockWidth, tileSize, dockHeight,
                hexToCSS(buildingColors.top),
                hexToCSS(buildingColors.left),
                hexToCSS(buildingColors.right)
              );
              // Pier extending into water (3 sections)
              for (let p = 1; p <= 3; p++) {
                const pierY = buildingY + tileHeight * 0.5 + p * (tileSize * 0.5);
                ISO.drawCube(
                  ctx, screenX + tileSize * 0.25, pierY,
                  dockWidth, tileSize * 0.5, dockHeight,
                  '#7a5a1a', '#5a4010', '#3a2808'
                );
              }
              // Support posts
              for (let p = 1; p <= 3; p++) {
                const postY = buildingY + tileHeight * 0.5 + p * (tileSize * 0.5) + tileSize * 0.2;
                ISO.drawCube(
                  ctx, screenX + tileSize * 0.35, postY + dockHeight,
                  tileSize * 0.1, tileSize * 0.1, tileHeight * 0.5,
                  '#5a4010', '#4a3008', '#3a2008'
                );
              }
            } else if (cell.building === 'project_board') {
              // Project board: A-frame wooden sign board
              const frameWidth = tileSize * 0.7;
              const frameOffset = (tileSize - frameWidth) / 2;
              // Wooden frame/easel
              ISO.drawCube(ctx, screenX + frameOffset, buildingY, frameWidth, frameWidth * 0.3, height * 0.8, '#8B6914', '#6B4904', '#4B2904');
              // Green board face
              ISO.drawCube(ctx, screenX + frameOffset + tileSize * 0.05, buildingY - height * 0.1, frameWidth * 0.9, frameWidth * 0.15, height * 0.6,
                hexToCSS(buildingColors.top), hexToCSS(buildingColors.left), hexToCSS(buildingColors.right));
            } else if (cell.building === 'forum') {
              // Forum: blue building with darker blue roof
              const bodyHeight = height * 0.75;
              const roofHeight = height * 0.25;
              const bodySize = tileSize * 0.8;
              const bodyOffset = (tileSize - bodySize) / 2;

              // Main building body (blue)
              ISO.drawCube(ctx, screenX + bodyOffset, buildingY,
                bodySize, bodySize, bodyHeight,
                hexToCSS(buildingColors.top), hexToCSS(buildingColors.left), hexToCSS(buildingColors.right));
              // Darker blue roof on top - roof bottom should meet body top (buildingY)
              ISO.drawCube(ctx, screenX + bodyOffset, buildingY - roofHeight,
                bodySize, bodySize, roofHeight,
                '#3a5070', '#2a4060', '#1a3050');
            } else {
              const buildingSize = tileSize * 0.75;
              const offset = (tileSize - buildingSize) / 2;
              ISO.drawCube(
                ctx, screenX + offset, buildingY,
                buildingSize, buildingSize, height,
                hexToCSS(buildingColors.top),
                hexToCSS(buildingColors.left),
                hexToCSS(buildingColors.right)
              );
            }
          }
        }
      }
    }

    // Second pass: draw building labels on top of everything
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = TOWN_MAP[y]?.[x];
        if (!cell?.building) continue;

        const pos = gridToScreen(x, y, zoom);
        const labelScreenX = offsetX + pos.x + tileSize; // Center of tile
        const elevation = cell.elevation ?? 0;
        const elevOffset = elevation * elevationHeight;
        const buildingHeight = (cell.buildingHeight || 2) * tileHeight;

        // Position label above the building
        const labelScreenY = offsetY + pos.y - elevOffset - tileHeight - buildingHeight - 2 * zoom;

        const name = BUILDING_NAMES[cell.building] || cell.building;
        const fontSize = Math.max(6, Math.round(7 * zoom));

        // Draw text with outline for readability
        ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 2 * zoom;
        ctx.strokeText(name, labelScreenX, labelScreenY);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(name, labelScreenX, labelScreenY);
      }
    }
  }, [gridToScreen, canvasSize, zoom, tileSize, tileHeight, elevationHeight, panOffset]);

  // Mouse move for hover
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const building = findBuildingAtPoint(x, y);
    setHoveredBuilding(building?.id || null);
  }, [findBuildingAtPoint]);

  // Click handler - only triggers if we didn't drag
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // If we were dragging, don't treat as click
    if (panStateRef.current.hasMoved) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const building = findBuildingAtPoint(x, y);
    if (building && onBuildingClick) {
      onBuildingClick(building);
    }
  }, [findBuildingAtPoint, onBuildingClick]);

  // Wheel zoom (trackpad + mouse wheel) - zooms towards mouse position
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate zoom center relative to canvas center
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.15;
    const relX = mouseX - centerX;
    const relY = mouseY - centerY;

    let newZoom: number;
    if (e.ctrlKey) {
      // Trackpad pinch: use exponential scaling for natural feel
      const zoomFactor = Math.exp(-e.deltaY / 300);
      newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));
    } else {
      // Regular mouse wheel: use smaller step for smoother zoom
      const direction = e.deltaY > 0 ? -1 : 1;
      const step = 0.05;
      newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + direction * step));
    }

    // Adjust pan to zoom towards mouse position
    const zoomRatio = newZoom / zoom;
    const newPanX = relX * (1 - zoomRatio) + panOffset.x * zoomRatio;
    const newPanY = relY * (1 - zoomRatio) + panOffset.y * zoomRatio;

    setZoom(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  }, [zoom, panOffset]);

  // Touch handlers for pinch zoom and pan
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 2) {
      // Pinch zoom - store initial state
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // Center point of the pinch
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      touchStateRef.current = {
        initialDistance: distance,
        initialZoom: zoom,
        initialPan: { ...panOffset },
        centerX,
        centerY,
      };
      touchPanRef.current = null; // Cancel single-touch pan
    } else if (e.touches.length === 1) {
      // Single touch - pan
      touchPanRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startPanX: panOffset.x,
        startPanY: panOffset.y,
        hasMoved: false,
      };
    }
  }, [zoom, panOffset]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 2 && touchStateRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const scale = distance / touchStateRef.current.initialDistance;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, touchStateRef.current.initialZoom * scale));

      // Zoom towards pinch center
      const canvasCenterX = canvas.width / 2;
      const canvasCenterY = canvas.height * 0.15;
      const relX = touchStateRef.current.centerX - canvasCenterX;
      const relY = touchStateRef.current.centerY - canvasCenterY;
      const zoomRatio = newZoom / touchStateRef.current.initialZoom;
      const newPanX = relX * (1 - zoomRatio) + touchStateRef.current.initialPan.x * zoomRatio;
      const newPanY = relY * (1 - zoomRatio) + touchStateRef.current.initialPan.y * zoomRatio;

      setZoom(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    } else if (e.touches.length === 1 && touchPanRef.current) {
      // Single touch pan
      const dx = e.touches[0].clientX - touchPanRef.current.startX;
      const dy = e.touches[0].clientY - touchPanRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        touchPanRef.current.hasMoved = true;
      }
      if (touchPanRef.current.hasMoved) {
        e.preventDefault();
        setPanOffset({
          x: touchPanRef.current.startPanX + dx,
          y: touchPanRef.current.startPanY + dy,
        });
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStateRef.current = null;
    touchPanRef.current = null;
  }, []);

  // Pan handlers for mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Left mouse button for panning
    if (e.button === 0) {
      panStateRef.current = {
        isPanning: true,
        hasMoved: false,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: panOffset.x,
        startPanY: panOffset.y,
      };
    }
  }, [panOffset]);

  const handleMouseMoveForPan = useCallback((e: MouseEvent) => {
    if (panStateRef.current.isPanning) {
      const dx = e.clientX - panStateRef.current.startX;
      const dy = e.clientY - panStateRef.current.startY;
      // Only count as "moved" if dragged more than 5 pixels (to distinguish from click)
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        panStateRef.current.hasMoved = true;
      }
      if (panStateRef.current.hasMoved) {
        setPanOffset({
          x: panStateRef.current.startPanX + dx,
          y: panStateRef.current.startPanY + dy,
        });
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    panStateRef.current.isPanning = false;
  }, []);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Wheel for trackpad/mouse zoom
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Touch events for mobile pinch
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Mouse events for panning (on window to capture mouseup outside canvas)
    window.addEventListener('mousemove', handleMouseMoveForPan);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousemove', handleMouseMoveForPan);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseMoveForPan, handleMouseUp]);

  // Update canvas size on resize - full screen
  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-gradient-to-b from-sky-400 via-cyan-500 to-blue-600 overflow-hidden relative touch-none"
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={`${panStateRef.current.isPanning ? 'cursor-grabbing' : hoveredBuilding ? 'cursor-pointer' : 'cursor-grab'}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredBuilding(null)}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      />

      {/* Town name overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
        <h1 className="font-pixel text-lg md:text-2xl text-white drop-shadow-lg">
          CLAWNTAWN
        </h1>
        <p className="font-retro text-xs md:text-sm text-white/80 drop-shadow">
          Population: 42 | Treasury: 10,000
        </p>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-16 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-retro">
        {Math.round(zoom * 100)}%
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
        <p className="font-retro text-xs text-white/70 drop-shadow bg-black/30 px-3 py-1 rounded">
          Click building to interact • Drag to pan • Scroll to zoom
        </p>
      </div>
    </div>
  );
}

export type { Building, BuildingType };
