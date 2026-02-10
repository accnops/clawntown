'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

// Game constants
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 320;
const CLAW_SPEED = 3;
const DROP_SPEED = 4;
const GRIP_SUCCESS_CHANCE = 0.4;
const STARTING_TOKENS = 3;
const TARGET_FPS = 30; // Lower FPS for mobile performance
const FRAME_TIME = 1000 / TARGET_FPS;

// Physics constants
const GRAVITY = 0.5; // Adjusted for lower FPS
const BOUNCE_DAMPING = 0.6;
const FRICTION = 0.96;

// Machine dimensions (scaled for smaller canvas)
const MACHINE_LEFT = 25;
const MACHINE_RIGHT = CANVAS_WIDTH - 25;
const MACHINE_TOP = 50;
const PIT_TOP = 220;
const PIT_BOTTOM = CANVAS_HEIGHT - 40;
const CLAW_WIDTH = 35;
const CLAW_MIN_X = MACHINE_LEFT + CLAW_WIDTH / 2 + 8;
const CLAW_MAX_X = MACHINE_RIGHT - CLAW_WIDTH / 2 - 8;
const CLAW_START_Y = MACHINE_TOP + 25;

// Prize types with emojis
const PRIZE_TYPES = [
  { emoji: '🦞', name: 'Lobster', rarity: 'rare' },
  { emoji: '🦀', name: 'Crab', rarity: 'common' },
  { emoji: '⭐', name: 'Starfish', rarity: 'common' },
  { emoji: '🐚', name: 'Shell', rarity: 'common' },
  { emoji: '🐙', name: 'Octopus', rarity: 'rare' },
] as const;

type GameState = 'ready' | 'dropping' | 'grabbing' | 'rising' | 'result';

interface Prize {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: typeof PRIZE_TYPES[number];
  grabbed: boolean;
}

// Draw a crab claw shape - more recognizable open/closed states
function drawLobsterClaw(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isOpen: boolean,
  scale: number = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Colors
  const clawColor = '#dc2626'; // Red
  const clawDark = '#991b1b'; // Darker red
  const clawHighlight = '#f87171'; // Light red
  const clawOutline = '#7f1d1d'; // Dark outline

  // Connector piece at top (attaches to cable)
  ctx.fillStyle = '#a855f7'; // Purple to match cable
  ctx.beginPath();
  ctx.roundRect(-6, -15, 12, 18, 3);
  ctx.fill();

  // Main arm/body segment
  ctx.fillStyle = clawColor;
  ctx.strokeStyle = clawOutline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 8, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Highlight on arm
  ctx.fillStyle = clawHighlight;
  ctx.beginPath();
  ctx.ellipse(-4, 4, 5, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  if (isOpen) {
    // OPEN STATE - claws spread outward (tips pointing away from each other)
    // Left pincer - rotated to point left/down
    ctx.save();
    ctx.translate(-6, 16);
    ctx.rotate(0.5); // Rotate outward
    drawClawPincer(ctx, clawColor, clawDark, clawHighlight, clawOutline);
    ctx.restore();

    // Right pincer - rotated to point right/down
    ctx.save();
    ctx.translate(6, 16);
    ctx.scale(-1, 1); // Mirror
    ctx.rotate(0.5); // Rotate outward
    drawClawPincer(ctx, clawColor, clawDark, clawHighlight, clawOutline);
    ctx.restore();
  } else {
    // CLOSED STATE - claws together, tips meeting
    // Left pincer
    ctx.save();
    ctx.translate(-3, 16);
    ctx.rotate(-0.05);
    drawClawPincer(ctx, clawColor, clawDark, clawHighlight, clawOutline);
    ctx.restore();

    // Right pincer
    ctx.save();
    ctx.translate(3, 16);
    ctx.scale(-1, 1); // Mirror
    ctx.rotate(-0.05);
    drawClawPincer(ctx, clawColor, clawDark, clawHighlight, clawOutline);
    ctx.restore();
  }

  ctx.restore();
}

function drawClawPincer(
  ctx: CanvasRenderingContext2D,
  mainColor: string,
  darkColor: string,
  highlightColor: string,
  outlineColor: string
) {
  // Main claw body - curved pincer shape pointing down
  ctx.fillStyle = mainColor;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, 8, 8, 25);
  ctx.quadraticCurveTo(6, 35, 2, 40);
  ctx.lineTo(0, 38);
  ctx.quadraticCurveTo(-4, 30, -5, 20);
  ctx.quadraticCurveTo(-4, 8, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner shadow/depth
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.moveTo(1, 8);
  ctx.quadraticCurveTo(6, 12, 5, 25);
  ctx.quadraticCurveTo(4, 32, 1, 35);
  ctx.quadraticCurveTo(-1, 28, -1, 18);
  ctx.quadraticCurveTo(0, 10, 1, 8);
  ctx.closePath();
  ctx.fill();

  // Highlight
  ctx.fillStyle = highlightColor;
  ctx.beginPath();
  ctx.ellipse(3, 14, 2, 5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Pointed tip
  ctx.fillStyle = mainColor;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(2, 40);
  ctx.lineTo(1, 48);
  ctx.lineTo(0, 38);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function ClawMachine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const prizesRef = useRef<Prize[]>([]);

  // Use refs for frequently changing values to avoid re-renders
  const clawXRef = useRef((CLAW_MIN_X + CLAW_MAX_X) / 2);
  const clawYRef = useRef(CLAW_START_Y);
  const clawOpenRef = useRef(true);
  const grabbedPrizeRef = useRef<Prize | null>(null);
  const gameStateRef = useRef<GameState>('ready');
  const movingLeftRef = useRef(false);
  const movingRightRef = useRef(false);
  const grabTimerRef = useRef<number | null>(null);

  // Only use React state for values that need to trigger UI updates
  const [tokens, setTokens] = useState(STARTING_TOKENS);
  const [winNotification, setWinNotification] = useState<{ emoji: string; name: string } | null>(null);
  const [showOutOfTokens, setShowOutOfTokens] = useState(false);

  // Initialize prizes once
  useEffect(() => {
    prizesRef.current = [];
    for (let i = 0; i < 12; i++) {
      prizesRef.current.push({
        x: MACHINE_LEFT + 40 + Math.random() * (MACHINE_RIGHT - MACHINE_LEFT - 80),
        y: PIT_TOP + 20 + Math.random() * (PIT_BOTTOM - PIT_TOP - 40),
        vx: 0,
        vy: 0,
        type: PRIZE_TYPES[Math.floor(Math.random() * PRIZE_TYPES.length)],
        grabbed: false,
      });
    }
  }, []);

  // Single unified game loop - handles physics, game logic, and rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pre-create gradient for performance
    const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGradient.addColorStop(0, '#1a0a2e');
    bgGradient.addColorStop(1, '#2d1b4e');

    const gameLoop = (currentTime: number) => {
      // Frame rate limiting
      const elapsed = currentTime - lastFrameTimeRef.current;
      if (elapsed < FRAME_TIME) {
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      lastFrameTimeRef.current = currentTime;

      const state = gameStateRef.current;
      const clawX = clawXRef.current;
      const clawY = clawYRef.current;

      // === GAME LOGIC ===

      // Handle claw movement in ready state
      if (state === 'ready') {
        if (movingLeftRef.current) {
          clawXRef.current = Math.max(CLAW_MIN_X, clawX - CLAW_SPEED);
        }
        if (movingRightRef.current) {
          clawXRef.current = Math.min(CLAW_MAX_X, clawX + CLAW_SPEED);
        }
      }

      // Handle dropping
      if (state === 'dropping') {
        const newY = clawY + DROP_SPEED;
        clawYRef.current = newY;
        if (newY >= PIT_TOP + 30) {
          gameStateRef.current = 'grabbing';
          clawOpenRef.current = false;

          // Check for prize grab
          const nearbyPrize = prizesRef.current.find(
            p => !p.grabbed && Math.abs(p.x - clawX) < 25 && Math.abs(p.y - (PIT_TOP + 30)) < 35
          );

          if (nearbyPrize && Math.random() < GRIP_SUCCESS_CHANCE) {
            grabbedPrizeRef.current = nearbyPrize;
            nearbyPrize.grabbed = true;
          }

          // Start rising after brief pause
          grabTimerRef.current = window.setTimeout(() => {
            gameStateRef.current = 'rising';
          }, 300);
        }
      }

      // Handle rising
      if (state === 'rising') {
        const newY = clawY - DROP_SPEED;
        clawYRef.current = newY;

        // Chance to drop prize
        const grabbed = grabbedPrizeRef.current;
        if (grabbed && Math.random() < 0.015) {
          grabbed.grabbed = false;
          grabbed.x = clawX;
          grabbed.y = clawY + 30;
          grabbed.vy = 3;
          grabbed.vx = (Math.random() - 0.5) * 4;
          grabbedPrizeRef.current = null;
        }

        if (newY <= CLAW_START_Y) {
          clawYRef.current = CLAW_START_Y;
          clawOpenRef.current = true;

          const wonPrize = grabbedPrizeRef.current;
          if (wonPrize) {
            setWinNotification({ emoji: wonPrize.type.emoji, name: wonPrize.type.name });
            setTimeout(() => setWinNotification(null), 2000);
            prizesRef.current = prizesRef.current.filter(p => p !== wonPrize);
          }

          // Cleanup
          prizesRef.current.forEach(p => { p.grabbed = false; });
          grabbedPrizeRef.current = null;

          // Replenish prizes
          if (prizesRef.current.length < 6) {
            for (let i = 0; i < 4; i++) {
              prizesRef.current.push({
                x: MACHINE_LEFT + 40 + Math.random() * (MACHINE_RIGHT - MACHINE_LEFT - 80),
                y: PIT_TOP + 10,
                vx: (Math.random() - 0.5) * 2,
                vy: 0,
                type: PRIZE_TYPES[Math.floor(Math.random() * PRIZE_TYPES.length)],
                grabbed: false,
              });
            }
          }

          // Check tokens and update state
          setTokens(currentTokens => {
            if (currentTokens > 0) {
              gameStateRef.current = 'ready';
            } else {
              gameStateRef.current = 'result';
              setShowOutOfTokens(true);
            }
            return currentTokens;
          });
        }
      }

      // === PHYSICS ===
      prizesRef.current.forEach(prize => {
        if (prize.grabbed) return;

        prize.vy += GRAVITY;
        prize.x += prize.vx;
        prize.y += prize.vy;
        prize.vx *= FRICTION;

        if (prize.y > PIT_BOTTOM) {
          prize.y = PIT_BOTTOM;
          prize.vy = -prize.vy * BOUNCE_DAMPING;
          prize.vx += (Math.random() - 0.5) * 2;
        }

        if (prize.x < MACHINE_LEFT + 20) {
          prize.x = MACHINE_LEFT + 20;
          prize.vx = -prize.vx * BOUNCE_DAMPING;
        }
        if (prize.x > MACHINE_RIGHT - 20) {
          prize.x = MACHINE_RIGHT - 20;
          prize.vx = -prize.vx * BOUNCE_DAMPING;
        }

        if (Math.abs(prize.vy) < 0.5 && prize.y >= PIT_BOTTOM - 1) prize.vy = 0;
        if (Math.abs(prize.vx) < 0.2) prize.vx = 0;
      });

      // === RENDERING ===
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Machine frame
      ctx.strokeStyle = '#9333ea';
      ctx.lineWidth = 4;
      ctx.strokeRect(MACHINE_LEFT, MACHINE_TOP, MACHINE_RIGHT - MACHINE_LEFT, CANVAS_HEIGHT - MACHINE_TOP - 20);

      // Glass window
      ctx.fillStyle = 'rgba(147, 51, 234, 0.1)';
      ctx.fillRect(MACHINE_LEFT + 4, MACHINE_TOP + 4, MACHINE_RIGHT - MACHINE_LEFT - 8, PIT_TOP - MACHINE_TOP - 8);

      // Prize pit
      ctx.fillStyle = 'rgba(88, 28, 135, 0.5)';
      ctx.fillRect(MACHINE_LEFT + 4, PIT_TOP, MACHINE_RIGHT - MACHINE_LEFT - 8, PIT_BOTTOM - PIT_TOP + 10);

      // Title
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText("CLAW'D NINE", CANVAS_WIDTH / 2, 28);
      ctx.font = '9px monospace';
      ctx.fillStyle = '#a855f7';
      ctx.fillText('Grab Your Prize!', CANVAS_WIDTH / 2, 42);

      // Prizes
      ctx.font = '20px serif';
      ctx.textBaseline = 'middle';
      for (const prize of prizesRef.current) {
        if (!prize.grabbed) {
          ctx.fillText(prize.type.emoji, prize.x, prize.y);
        }
      }

      // Cable
      const currentClawX = clawXRef.current;
      const currentClawY = clawYRef.current;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(currentClawX, MACHINE_TOP);
      ctx.lineTo(currentClawX, currentClawY);
      ctx.stroke();

      // Claw
      drawLobsterClaw(ctx, currentClawX, currentClawY, clawOpenRef.current, 0.65);

      // Grabbed prize
      if (grabbedPrizeRef.current) {
        ctx.font = '20px serif';
        ctx.fillText(grabbedPrizeRef.current.type.emoji, currentClawX, currentClawY + 50);
      }

      // Tokens - read from closure to avoid stale values
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (grabTimerRef.current) clearTimeout(grabTimerRef.current);
    };
  }, []);

  // Separate effect just for token display (lightweight)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Token display will be drawn by main loop, this just ensures re-render on token change
  }, [tokens]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'ready') return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        movingLeftRef.current = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        movingRightRef.current = true;
      } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleDrop();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        movingLeftRef.current = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        movingRightRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleDrop = useCallback(() => {
    if (gameStateRef.current !== 'ready') return;

    setTokens(t => {
      if (t <= 0) return t;
      gameStateRef.current = 'dropping';
      return t - 1;
    });
  }, []);

  const handlePlayAgain = useCallback(() => {
    setTokens(STARTING_TOKENS);
    setShowOutOfTokens(false);
    gameStateRef.current = 'ready';
  }, []);

  const handleLeftDown = useCallback(() => {
    if (gameStateRef.current === 'ready') movingLeftRef.current = true;
  }, []);

  const handleLeftUp = useCallback(() => {
    movingLeftRef.current = false;
  }, []);

  const handleRightDown = useCallback(() => {
    if (gameStateRef.current === 'ready') movingRightRef.current = true;
  }, []);

  const handleRightUp = useCallback(() => {
    movingRightRef.current = false;
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* Canvas container with overlay */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-4 border-purple-600 rounded-lg"
        />

        {/* Token display overlay */}
        <div className="absolute top-1 left-2 font-mono text-sm font-bold text-yellow-400">
          TOKENS: {tokens}
        </div>

        {/* Win notification - brief, non-blocking */}
        {winNotification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-yellow-500/90 rounded-lg text-center shadow-lg animate-bounce">
            <span className="text-2xl mr-2">{winNotification.emoji}</span>
            <span className="font-pixel text-sm text-yellow-900">{winNotification.name}!</span>
          </div>
        )}

        {/* Out of tokens overlay */}
        {showOutOfTokens && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
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
