'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

const STARTING_TOKENS = 3;

export function ClawMachine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);

  const [tokens, setTokens] = useState(STARTING_TOKENS);
  const [winNotification, setWinNotification] = useState<{ emoji: string; name: string } | null>(null);
  const [showOutOfTokens, setShowOutOfTokens] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Helper to get fresh scene reference
  const getScene = useCallback(() => {
    if (!gameRef.current) return null;
    return gameRef.current.scene.getScene('ClawMachineScene');
  }, []);

  // Initialize Phaser game (dynamic import to avoid SSR issues)
  useEffect(() => {
    if (!containerRef.current) return;

    // Prevent duplicate game creation (React Strict Mode calls useEffect twice)
    if (gameRef.current) return;

    let mounted = true;

    // Dynamic import of Phaser and our scene
    Promise.all([
      import('phaser'),
      import('./ClawMachineScene'),
    ]).then(([Phaser, { ClawMachineScene, createClawMachineConfig }]) => {
      // Check if component unmounted during async import or game was already created
      if (!mounted || !containerRef.current || gameRef.current) return;

      const config = createClawMachineConfig(containerRef.current);
      const game = new Phaser.Game(config);
      gameRef.current = game;

      // Get scene reference once it's created
      game.events.once('ready', () => {
        if (!mounted) return;

        const scene = game.scene.getScene('ClawMachineScene') as typeof ClawMachineScene.prototype;
        sceneRef.current = scene;

        scene.setCallbacks({
          onTokenChange: (newTokens: number) => {
            setTokens(newTokens);
          },
          onWin: (prize: { emoji: string; name: string }) => {
            setWinNotification(prize);
            setTimeout(() => setWinNotification(null), 2000);
          },
          onOutOfTokens: () => {
            setShowOutOfTokens(true);
          },
        });

        setIsLoaded(true);
      });
    });

    return () => {
      mounted = false;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
  }, []);

  const handleDrop = useCallback(() => {
    getScene()?.handleDrop();
  }, [getScene]);

  const handlePlayAgain = useCallback(() => {
    setTokens(STARTING_TOKENS);
    setShowOutOfTokens(false);
    getScene()?.setTokens(STARTING_TOKENS);
  }, [getScene]);

  const handleLeftDown = useCallback(() => {
    getScene()?.startMoveLeft();
  }, [getScene]);

  const handleLeftUp = useCallback(() => {
    getScene()?.stopMoveLeft();
  }, [getScene]);

  const handleRightDown = useCallback(() => {
    getScene()?.startMoveRight();
  }, [getScene]);

  const handleRightUp = useCallback(() => {
    getScene()?.stopMoveRight();
  }, [getScene]);

  return (
    <div className="flex flex-col items-center">
      {/* Phaser container with overlay */}
      <div className="relative">
        <div
          ref={containerRef}
          className="border-4 border-purple-600 rounded-lg overflow-hidden bg-[#1a0a2e]"
          style={{ width: 300, height: 320 }}
        >
          {!isLoaded && (
            <div className="w-full h-full flex items-center justify-center">
              <p className="font-retro text-sm text-purple-400 animate-pulse">Loading...</p>
            </div>
          )}
        </div>

        {/* Token display overlay */}
        <div className="absolute top-1 left-2 font-mono text-sm font-bold text-yellow-400 z-10">
          TOKENS: {tokens}
        </div>

        {/* Win notification */}
        {winNotification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-yellow-500/90 rounded-lg text-center shadow-lg animate-bounce z-20">
            <span className="text-2xl mr-2">{winNotification.emoji}</span>
            <span className="font-pixel text-sm text-yellow-900">{winNotification.name}!</span>
          </div>
        )}

        {/* Out of tokens overlay */}
        {showOutOfTokens && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg z-20">
            <div className="p-6 bg-purple-900/95 rounded-lg text-center shadow-xl">
              <p className="font-pixel text-lg text-purple-300 mb-2">Out of tokens!</p>
              <button
                className="btn-retro mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white"
                onClick={handlePlayAgain}
              >
                Get More Tokens
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-4 mb-2">
        <button
          className="btn-retro px-6 py-3 text-xl"
          onMouseDown={handleLeftDown}
          onMouseUp={handleLeftUp}
          onMouseLeave={handleLeftUp}
          onTouchStart={handleLeftDown}
          onTouchEnd={handleLeftUp}
        >
          ◀
        </button>
        <button
          className="btn-retro px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold"
          onClick={handleDrop}
          disabled={tokens <= 0}
        >
          DROP!
        </button>
        <button
          className="btn-retro px-6 py-3 text-xl"
          onMouseDown={handleRightDown}
          onMouseUp={handleRightUp}
          onMouseLeave={handleRightUp}
          onTouchStart={handleRightDown}
          onTouchEnd={handleRightUp}
        >
          ▶
        </button>
      </div>

      {/* Instructions */}
      <p className="font-retro text-xs text-purple-300 text-center mt-1">
        Arrow keys or A/D to move, Down/Space to drop
      </p>
    </div>
  );
}
