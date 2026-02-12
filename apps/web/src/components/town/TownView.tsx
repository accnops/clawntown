"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type { PhaserGameHandle } from "./phaser/PhaserGame";
import { Building } from "./types";
import { BuildYourOwnTownDialog } from "@/components/ui";

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
  population?: number | null;
  isAuthenticated?: boolean;
}

export function TownView({ onBuildingClick, population, isAuthenticated }: TownViewProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);
  const [showBuildDialog, setShowBuildDialog] = useState(false);
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
        isAuthenticated={isAuthenticated}
      />

      {/* Header HUD */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center pointer-events-none z-10">
        {/* Town name */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl md:text-3xl drop-shadow-lg">🦀</span>
          <h1 className="font-pixel text-lg md:text-2xl text-white drop-shadow-lg">
            CLAWNTOWN
          </h1>
          <span className="text-2xl md:text-3xl drop-shadow-lg scale-x-[-1]">🦀</span>
        </div>

        {/* Population + Build your own */}
        <p className="font-pixel text-[8px] md:text-[10px] text-white/90 drop-shadow font-normal">
          Population: {population ?? '--'}
          <span className="mx-2 text-white/50">•</span>
          <button
            onClick={() => setShowBuildDialog(true)}
            className="pointer-events-auto text-white/90 hover:text-white underline decoration-dashed decoration-white/50 hover:decoration-white cursor-pointer"
          >
            Build your own town
          </button>
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

      <BuildYourOwnTownDialog
        isOpen={showBuildDialog}
        onClose={() => setShowBuildDialog(false)}
      />
    </div>
  );
}

// Re-export types for convenience
export type { Building } from "./types";
export { BuildingType } from "./types";
