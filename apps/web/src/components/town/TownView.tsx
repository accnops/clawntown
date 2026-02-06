"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type { PhaserGameHandle } from "./phaser/PhaserGame";
import { Building } from "./types";

// Dynamic import to avoid SSR issues with Phaser
const PhaserGame = dynamic(() => import("./phaser/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gradient-to-b from-sky-400 via-cyan-500 to-blue-600">
      <div className="text-white font-pixel text-lg animate-pulse">
        Loading Clawntown...
      </div>
    </div>
  ),
});

interface TownViewProps {
  onBuildingClick?: (building: Building) => void;
}

export function TownView({ onBuildingClick }: TownViewProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);
  const phaserRef = useRef<PhaserGameHandle>(null);

  const handleBuildingClick = useCallback(
    (building: Building) => {
      onBuildingClick?.(building);
    },
    [onBuildingClick]
  );

  const handleBuildingHover = useCallback((building: Building | null) => {
    setHoveredBuilding(building);
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-400 via-cyan-500 to-blue-600 overflow-hidden relative">
      <PhaserGame
        ref={phaserRef}
        onBuildingClick={handleBuildingClick}
        onBuildingHover={handleBuildingHover}
      />

      {/* Town name overlay (HUD) */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
        <div className="flex items-center justify-center gap-2 mb-1">
          <img
            src="/assets/ui/sigil_64.png"
            alt="Clawntown Sigil"
            className="w-8 h-8 md:w-10 md:h-10 drop-shadow-lg"
          />
          <h1 className="font-pixel text-lg md:text-2xl text-white drop-shadow-lg">
            CLAWNTOWN
          </h1>
          <img
            src="/assets/ui/sigil_64.png"
            alt="Clawntown Sigil"
            className="w-8 h-8 md:w-10 md:h-10 drop-shadow-lg scale-x-[-1]"
          />
        </div>
        <p className="font-retro text-xs md:text-sm text-white/80 drop-shadow">
          Population: 42 | Treasury: 10,000
        </p>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
        <p className="font-retro text-xs text-white/70 drop-shadow bg-black/30 px-3 py-1 rounded">
          {hoveredBuilding
            ? `Click to visit ${hoveredBuilding.name}`
            : "Click building to interact \u2022 Drag to pan \u2022 Scroll to zoom"}
        </p>
      </div>
    </div>
  );
}

// Re-export types for convenience
export type { Building } from "./types";
export { BuildingType } from "./types";
