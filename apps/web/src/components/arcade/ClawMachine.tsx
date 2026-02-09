'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

// Game constants
const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 400;
const CLAW_SPEED = 3;
const DROP_SPEED = 4;
const GRIP_SUCCESS_CHANCE = 0.4;
const STARTING_TOKENS = 3;

// Physics constants
const GRAVITY = 0.3;
const BOUNCE_DAMPING = 0.6;
const FRICTION = 0.98;

// Machine dimensions
const MACHINE_LEFT = 30;
const MACHINE_RIGHT = CANVAS_WIDTH - 30;
const MACHINE_TOP = 60;
const PIT_TOP = 280;
const PIT_BOTTOM = CANVAS_HEIGHT - 50;
const CLAW_WIDTH = 40;
const CLAW_MIN_X = MACHINE_LEFT + CLAW_WIDTH / 2 + 10;
const CLAW_MAX_X = MACHINE_RIGHT - CLAW_WIDTH / 2 - 10;
const CLAW_START_Y = MACHINE_TOP + 30;

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
  vx: number; // velocity x
  vy: number; // velocity y
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
  const prizesRef = useRef<Prize[]>([]);

  // Game state
  const [gameState, setGameState] = useState<GameState>('ready');
  const [tokens, setTokens] = useState(STARTING_TOKENS);
  const [clawX, setClawX] = useState((CLAW_MIN_X + CLAW_MAX_X) / 2);
  const [clawY, setClawY] = useState(CLAW_START_Y);
  const [clawOpen, setClawOpen] = useState(true);
  const [grabbedPrize, setGrabbedPrize] = useState<Prize | null>(null);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [winNotification, setWinNotification] = useState<{ emoji: string; name: string } | null>(null);
  const [movingLeft, setMovingLeft] = useState(false);
  const [movingRight, setMovingRight] = useState(false);
  const [, forceRender] = useState(0);

  // Initialize prizes
  useEffect(() => {
    const createPrizes = (count: number): Prize[] => {
      const prizes: Prize[] = [];
      for (let i = 0; i < count; i++) {
        prizes.push({
          x: MACHINE_LEFT + 40 + Math.random() * (MACHINE_RIGHT - MACHINE_LEFT - 80),
          y: PIT_TOP + 20 + Math.random() * (PIT_BOTTOM - PIT_TOP - 40),
          vx: 0,
          vy: 0,
          type: PRIZE_TYPES[Math.floor(Math.random() * PRIZE_TYPES.length)],
          grabbed: false,
        });
      }
      return prizes;
    };
    prizesRef.current = createPrizes(12);

    // Store create function for replenishing
    (window as unknown as { createPrizes: typeof createPrizes }).createPrizes = createPrizes;
  }, []);

  // Physics update for prizes
  useEffect(() => {
    const physicsLoop = () => {
      let needsUpdate = false;

      prizesRef.current.forEach(prize => {
        if (prize.grabbed) return;

        // Apply gravity
        prize.vy += GRAVITY;

        // Apply velocity
        prize.x += prize.vx;
        prize.y += prize.vy;

        // Apply friction
        prize.vx *= FRICTION;

        // Bounce off bottom
        if (prize.y > PIT_BOTTOM) {
          prize.y = PIT_BOTTOM;
          prize.vy = -prize.vy * BOUNCE_DAMPING;
          prize.vx += (Math.random() - 0.5) * 2; // Add some randomness
          needsUpdate = true;
        }

        // Bounce off walls
        if (prize.x < MACHINE_LEFT + 20) {
          prize.x = MACHINE_LEFT + 20;
          prize.vx = -prize.vx * BOUNCE_DAMPING;
        }
        if (prize.x > MACHINE_RIGHT - 20) {
          prize.x = MACHINE_RIGHT - 20;
          prize.vx = -prize.vx * BOUNCE_DAMPING;
        }

        // Stop if moving very slowly
        if (Math.abs(prize.vy) < 0.1 && prize.y >= PIT_BOTTOM - 1) {
          prize.vy = 0;
        }
        if (Math.abs(prize.vx) < 0.1) {
          prize.vx = 0;
        }

        if (Math.abs(prize.vx) > 0.1 || Math.abs(prize.vy) > 0.1) {
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        forceRender(n => n + 1);
      }
    };

    const interval = setInterval(physicsLoop, 16);
    return () => clearInterval(interval);
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'ready') return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setMovingLeft(true);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setMovingRight(true);
      } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleDrop();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setMovingLeft(false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setMovingRight(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Move claw based on input
  useEffect(() => {
    if (gameState !== 'ready') return;

    const moveInterval = setInterval(() => {
      if (movingLeft) {
        setClawX(x => Math.max(CLAW_MIN_X, x - CLAW_SPEED));
      }
      if (movingRight) {
        setClawX(x => Math.min(CLAW_MAX_X, x + CLAW_SPEED));
      }
    }, 16);

    return () => clearInterval(moveInterval);
  }, [gameState, movingLeft, movingRight]);

  const handleDrop = useCallback(() => {
    if (gameState !== 'ready' || tokens <= 0) return;

    setTokens(t => t - 1);
    setGameState('dropping');
    setWonPrize(null);
  }, [gameState, tokens]);

  // Game loop for dropping/grabbing/rising
  useEffect(() => {
    if (gameState === 'ready' || gameState === 'result') return;

    const gameLoop = () => {
      if (gameState === 'dropping') {
        setClawY(y => {
          const newY = y + DROP_SPEED;
          if (newY >= PIT_TOP + 40) {
            setGameState('grabbing');
            return newY;
          }
          return newY;
        });
      } else if (gameState === 'grabbing') {
        setClawOpen(false);

        // Check for prize grab
        const clawXCurrent = clawX;
        const nearbyPrize = prizesRef.current.find(
          p => !p.grabbed && Math.abs(p.x - clawXCurrent) < 30 && Math.abs(p.y - (PIT_TOP + 40)) < 40
        );

        if (nearbyPrize && Math.random() < GRIP_SUCCESS_CHANCE) {
          setGrabbedPrize(nearbyPrize);
          nearbyPrize.grabbed = true;
        }

        setTimeout(() => setGameState('rising'), 300);
      } else if (gameState === 'rising') {
        setClawY(y => {
          const newY = y - DROP_SPEED;

          // Chance to drop the prize while rising
          if (grabbedPrize && Math.random() < 0.015) {
            // Drop the prize with physics!
            grabbedPrize.grabbed = false;
            grabbedPrize.x = clawX;
            grabbedPrize.y = y + 30;
            grabbedPrize.vy = 2; // Initial downward velocity
            grabbedPrize.vx = (Math.random() - 0.5) * 4; // Random horizontal
            setGrabbedPrize(null);
            forceRender(n => n + 1);
          }

          if (newY <= CLAW_START_Y) {
            // Game complete
            if (grabbedPrize) {
              setWonPrize(grabbedPrize);
              // Show win notification briefly
              setWinNotification({ emoji: grabbedPrize.type.emoji, name: grabbedPrize.type.name });
              setTimeout(() => setWinNotification(null), 2000);
              // Remove won prize from the pit
              prizesRef.current = prizesRef.current.filter(p => p !== grabbedPrize);
            }

            // Reset all grabbed flags (safety cleanup)
            prizesRef.current.forEach(p => { p.grabbed = false; });

            // Replenish prizes if running low
            if (prizesRef.current.length < 6) {
              for (let i = 0; i < 4; i++) {
                prizesRef.current.push({
                  x: MACHINE_LEFT + 40 + Math.random() * (MACHINE_RIGHT - MACHINE_LEFT - 80),
                  y: PIT_TOP + 10, // Drop from top
                  vx: (Math.random() - 0.5) * 2,
                  vy: 0,
                  type: PRIZE_TYPES[Math.floor(Math.random() * PRIZE_TYPES.length)],
                  grabbed: false,
                });
              }
            }

            setClawOpen(true);
            setGrabbedPrize(null);
            // If we have tokens, go straight back to ready state
            // Only show result screen if out of tokens
            if (tokens > 0) {
              setGameState('ready');
            } else {
              setGameState('result');
            }
            return CLAW_START_Y;
          }
          return newY;
        });
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, clawX, grabbedPrize]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Clear
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, '#1a0a2e');
      gradient.addColorStop(1, '#2d1b4e');
      ctx.fillStyle = gradient;
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

      // Machine title
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText("CLAW'D NINE", CANVAS_WIDTH / 2, 35);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#a855f7';
      ctx.fillText('Grab Your Prize!', CANVAS_WIDTH / 2, 50);

      // Draw prizes
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      prizesRef.current.forEach(prize => {
        if (!prize.grabbed) {
          ctx.fillText(prize.type.emoji, prize.x, prize.y);
        }
      });

      // Draw cable
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(clawX, MACHINE_TOP);
      ctx.lineTo(clawX, clawY);
      ctx.stroke();

      // Draw lobster claw (positioned so connector meets cable)
      drawLobsterClaw(ctx, clawX, clawY, clawOpen, 0.65);

      // Draw grabbed prize (held in claw)
      if (grabbedPrize) {
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(grabbedPrize.type.emoji, clawX, clawY + 50);
      }

      // Token display
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`TOKENS: ${tokens}`, 10, 20);

      requestAnimationFrame(draw);
    };

    const frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [clawX, clawY, clawOpen, grabbedPrize, tokens]);

  const handlePlayAgain = () => {
    if (tokens <= 0) {
      setTokens(STARTING_TOKENS);
    }
    setWonPrize(null);
    setGameState('ready');
  };

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

        {/* Win notification - brief, non-blocking */}
        {winNotification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-yellow-500/90 rounded-lg text-center shadow-lg animate-bounce">
            <span className="text-2xl mr-2">{winNotification.emoji}</span>
            <span className="font-pixel text-sm text-yellow-900">{winNotification.name}!</span>
          </div>
        )}

        {/* Out of tokens overlay */}
        {tokens <= 0 && gameState === 'result' && (
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
          onMouseDown={() => gameState === 'ready' && setMovingLeft(true)}
          onMouseUp={() => setMovingLeft(false)}
          onMouseLeave={() => setMovingLeft(false)}
          onTouchStart={() => gameState === 'ready' && setMovingLeft(true)}
          onTouchEnd={() => setMovingLeft(false)}
          disabled={gameState !== 'ready'}
        >
          ◀
        </button>
        <button
          className="btn-retro px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold"
          onClick={handleDrop}
          disabled={gameState !== 'ready' || tokens <= 0}
        >
          DROP!
        </button>
        <button
          className="btn-retro px-6 py-3 text-xl"
          onMouseDown={() => gameState === 'ready' && setMovingRight(true)}
          onMouseUp={() => setMovingRight(false)}
          onMouseLeave={() => setMovingRight(false)}
          onTouchStart={() => gameState === 'ready' && setMovingRight(true)}
          onTouchEnd={() => setMovingRight(false)}
          disabled={gameState !== 'ready'}
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
