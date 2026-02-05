'use client';

import { useState } from 'react';

// Building types in the town
type BuildingType = 'town_hall' | 'forum' | 'project_board' | 'dock' | 'lighthouse';

interface Building {
  id: string;
  type: BuildingType;
  name: string;
  gridX: number;
  gridY: number;
  width: number;
  height: number;
  color: string;
  emoji: string;
}

// Initial town layout
const BUILDINGS: Building[] = [
  {
    id: 'town_hall',
    type: 'town_hall',
    name: 'Town Hall',
    gridX: 2,
    gridY: 2,
    width: 2,
    height: 2,
    color: '#c41e3a',
    emoji: '🏛️',
  },
  {
    id: 'forum',
    type: 'forum',
    name: 'Community Forum',
    gridX: 5,
    gridY: 1,
    width: 1,
    height: 1,
    color: '#4a7c59',
    emoji: '💬',
  },
  {
    id: 'project_board',
    type: 'project_board',
    name: 'Project Board',
    gridX: 0,
    gridY: 3,
    width: 1,
    height: 1,
    color: '#8b7355',
    emoji: '📋',
  },
  {
    id: 'dock',
    type: 'dock',
    name: 'Lobster Dock',
    gridX: 4,
    gridY: 4,
    width: 2,
    height: 1,
    color: '#654321',
    emoji: '🦞',
  },
  {
    id: 'lighthouse',
    type: 'lighthouse',
    name: 'Lighthouse',
    gridX: 6,
    gridY: 3,
    width: 1,
    height: 2,
    color: '#f5f5dc',
    emoji: '🗼',
  },
];

// Grid settings
const GRID_SIZE = 8;
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;

interface TownViewProps {
  onBuildingClick?: (building: Building) => void;
}

export function TownView({ onBuildingClick }: TownViewProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);

  // Convert grid coordinates to isometric screen position
  const gridToScreen = (gridX: number, gridY: number) => {
    const screenX = (gridX - gridY) * (TILE_WIDTH / 2);
    const screenY = (gridX + gridY) * (TILE_HEIGHT / 2);
    return { x: screenX, y: screenY };
  };

  // Calculate the center offset to position the grid
  const centerOffset = {
    x: (GRID_SIZE * TILE_WIDTH) / 2,
    y: TILE_HEIGHT * 2,
  };

  return (
    <div className="w-full h-full bg-gradient-to-b from-rct-sky via-rct-sky to-rct-water overflow-hidden relative">
      {/* Water layer at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-blue-900/50 to-transparent pointer-events-none" />

      {/* Isometric grid container */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: '1000px' }}
      >
        <div
          className="relative"
          style={{
            width: GRID_SIZE * TILE_WIDTH,
            height: GRID_SIZE * TILE_HEIGHT * 2,
          }}
        >
          {/* Ground tiles */}
          {Array.from({ length: GRID_SIZE }).map((_, y) =>
            Array.from({ length: GRID_SIZE }).map((_, x) => {
              const pos = gridToScreen(x, y);
              const isWater = y >= GRID_SIZE - 2;
              return (
                <div
                  key={`tile-${x}-${y}`}
                  className={`absolute transition-colors ${
                    isWater ? 'bg-rct-water/60' : 'bg-rct-sand/80'
                  }`}
                  style={{
                    left: pos.x + centerOffset.x,
                    top: pos.y + centerOffset.y,
                    width: TILE_WIDTH,
                    height: TILE_HEIGHT,
                    transform: 'rotateX(60deg) rotateZ(45deg)',
                    transformOrigin: 'center',
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                />
              );
            })
          )}

          {/* Buildings */}
          {BUILDINGS.map((building) => {
            const pos = gridToScreen(building.gridX, building.gridY);
            const isHovered = hoveredBuilding === building.id;
            const buildingHeight = building.height * 40 + 20;

            return (
              <button
                key={building.id}
                className={`absolute cursor-pointer transition-all duration-150 ${
                  isHovered ? 'scale-110 z-20' : 'z-10'
                }`}
                style={{
                  left: pos.x + centerOffset.x + (building.width * TILE_WIDTH) / 4,
                  top: pos.y + centerOffset.y - buildingHeight + TILE_HEIGHT,
                }}
                onMouseEnter={() => setHoveredBuilding(building.id)}
                onMouseLeave={() => setHoveredBuilding(null)}
                onClick={() => onBuildingClick?.(building)}
                aria-label={building.name}
              >
                {/* Building body */}
                <div
                  className="relative flex flex-col items-center justify-end"
                  style={{
                    width: building.width * TILE_WIDTH * 0.6,
                    height: buildingHeight,
                  }}
                >
                  {/* Building shape */}
                  <div
                    className="w-full flex-1 rounded-t-lg border-2 border-b-0 flex items-center justify-center text-2xl md:text-3xl"
                    style={{
                      backgroundColor: building.color,
                      borderColor: 'rgba(0,0,0,0.3)',
                      boxShadow: isHovered
                        ? '0 0 20px rgba(255,255,255,0.5)'
                        : '2px 4px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    {building.emoji}
                  </div>
                  {/* Building base */}
                  <div
                    className="w-full h-2 rounded-b"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.2)',
                    }}
                  />
                </div>

                {/* Building label */}
                {isHovered && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <div className="bg-retro-dark text-white px-2 py-1 rounded text-xs font-retro">
                      {building.name}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Town name overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
        <h1 className="font-pixel text-lg md:text-2xl text-white drop-shadow-lg">
          CLAWNTAWN
        </h1>
        <p className="font-retro text-xs md:text-sm text-white/80 drop-shadow">
          Population: 42 | Treasury: 10,000 🪙
        </p>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
        <p className="font-retro text-xs text-white/70 drop-shadow">
          Tap a building to interact
        </p>
      </div>
    </div>
  );
}

export type { Building, BuildingType };
