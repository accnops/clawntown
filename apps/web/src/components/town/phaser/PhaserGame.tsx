"use client";

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import * as Phaser from "phaser";
import { MainScene, SceneEvents } from "./MainScene";
import { createGameConfig } from "./gameConfig";
import { Building } from "../types";

// Exposed methods for parent component
export interface PhaserGameHandle {
  setZoom: (zoom: number) => void;
  centerCamera: () => void;
  zoomAtPoint: (zoom: number, screenX: number, screenY: number) => void;
}

interface PhaserGameProps {
  onBuildingClick: (building: Building) => void;
  onBuildingHover?: (building: Building | null) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  showStartHere?: boolean;
}

const PhaserGame = forwardRef<PhaserGameHandle, PhaserGameProps>(
  function PhaserGame(
    { onBuildingClick, onBuildingHover, zoom = 1, onZoomChange, showStartHere },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<MainScene | null>(null);
    // Track zoom value set via zoomAtPoint to skip re-centering in useEffect
    const zoomFromAtPoint = useRef<number | null>(null);
    // Track when scene is ready for safe updates
    const [sceneReady, setSceneReady] = useState(false);

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        setZoom: (zoom: number) => {
          if (sceneRef.current) {
            sceneRef.current.setZoom(zoom);
          }
        },
        centerCamera: () => {
          if (sceneRef.current) {
            sceneRef.current.centerCamera();
          }
        },
        zoomAtPoint: (zoom: number, screenX: number, screenY: number) => {
          if (sceneRef.current) {
            zoomFromAtPoint.current = zoom;
            sceneRef.current.zoomAtPoint(zoom, screenX, screenY);
          }
        },
      }),
      []
    );

    // Initialize Phaser game
    useEffect(() => {
      if (!containerRef.current || gameRef.current) return;

      const scene = new MainScene();
      sceneRef.current = scene;

      const config = createGameConfig(containerRef.current, scene);
      const game = new Phaser.Game(config);
      gameRef.current = game;

      // Wait for the game to boot and scene to be ready
      game.events.once("ready", () => {
        // Set up event callbacks once scene is created
        const events: SceneEvents = {
          onBuildingClick: (building) => onBuildingClick(building),
          onBuildingHover: (building) => onBuildingHover?.(building),
        };
        scene.setEventCallbacks(events);

        // Mark scene as ready - visibility will be set by useEffect
        setSceneReady(true);

        // Listen for zoom changes from Phaser (wheel zoom handled in scene)
        scene.events.on("zoomChanged", (newZoom: number) => {
          onZoomChange?.(newZoom);
        });
      });

      return () => {
        gameRef.current?.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      };
    }, []); // Only run once on mount

    // Update zoom (skip if zoomAtPoint already handled it)
    useEffect(() => {
      if (zoomFromAtPoint.current === zoom) {
        zoomFromAtPoint.current = null;
        return;
      }
      zoomFromAtPoint.current = null;
      if (sceneRef.current) {
        sceneRef.current.setZoom(zoom);
      }
    }, [zoom]);

    // Update "Start Here" arrow visibility when showStartHere prop changes or scene becomes ready
    useEffect(() => {
      if (sceneReady && sceneRef.current) {
        sceneRef.current.setShowStartHere(!!showStartHere);
      }
    }, [showStartHere, sceneReady]);

    // Update event callbacks when they change
    useEffect(() => {
      if (sceneRef.current) {
        const events: SceneEvents = {
          onBuildingClick: (building) => onBuildingClick(building),
          onBuildingHover: (building) => onBuildingHover?.(building),
        };
        sceneRef.current.setEventCallbacks(events);
      }
    }, [onBuildingClick, onBuildingHover]);

    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <style jsx global>{`
          canvas {
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
          }
        `}</style>
      </div>
    );
  }
);

export default PhaserGame;
