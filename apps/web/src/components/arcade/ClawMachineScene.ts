import * as Phaser from 'phaser';

// Game constants
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 320;
const CLAW_SPEED = 1.5; // Slower, more precise movement
const DROP_SPEED = 4;
const GRIP_SUCCESS_CHANCE = 0.75; // 75% chance to grab
const DROP_CHANCE_PER_FRAME = 0.018; // ~1.8% per frame - roughly 50% overall drop rate
const GRAVITY = 0.5;
const BOUNCE_DAMPING = 0.5;

// Machine dimensions
const MACHINE_LEFT = 25;
const MACHINE_RIGHT = CANVAS_WIDTH - 25;
const MACHINE_TOP = 50;
const PIT_TOP = 220;
const PIT_BOTTOM = CANVAS_HEIGHT - 40;
const CLAW_WIDTH = 35;
const CLAW_MIN_X = MACHINE_LEFT + CLAW_WIDTH / 2 + 8;
const CLAW_MAX_X = MACHINE_RIGHT - CLAW_WIDTH / 2 - 8;
const CLAW_START_Y = MACHINE_TOP + 25;

// Prize types
const PRIZE_TYPES = [
  { emoji: '🦞', name: 'Lobster', rarity: 'rare' },
  { emoji: '🦀', name: 'Crab', rarity: 'common' },
  { emoji: '⭐', name: 'Starfish', rarity: 'common' },
  { emoji: '🐚', name: 'Shell', rarity: 'common' },
  { emoji: '🐙', name: 'Octopus', rarity: 'rare' },
] as const;

type GameState = 'ready' | 'dropping' | 'grabbing' | 'rising' | 'result';
type PrizeType = typeof PRIZE_TYPES[number];

interface Prize {
  sprite: Phaser.GameObjects.Text;
  type: PrizeType;
  grabbed: boolean;
  vy: number; // vertical velocity for physics
  settled: boolean; // true when at rest on the ground
}

export interface ClawMachineCallbacks {
  onTokenChange: (tokens: number) => void;
  onWin: (prize: { emoji: string; name: string }) => void;
  onOutOfTokens: () => void;
}

export class ClawMachineScene extends Phaser.Scene {
  // Game objects
  private claw!: Phaser.GameObjects.Container;
  private clawArm!: Phaser.GameObjects.Graphics;
  private cable!: Phaser.GameObjects.Graphics;
  private prizes: Prize[] = [];

  // Game state
  private gameState: GameState = 'ready';
  private tokens: number = 3;
  private grabbedPrize: Prize | null = null;

  // Input state
  private movingLeft: boolean = false;
  private movingRight: boolean = false;
  private clawOpen: boolean = true;

  // Callbacks
  private callbacks: ClawMachineCallbacks = {
    onTokenChange: () => {},
    onWin: () => {},
    onOutOfTokens: () => {},
  };

  constructor() {
    super({ key: 'ClawMachineScene' });
  }

  setCallbacks(callbacks: ClawMachineCallbacks): void {
    this.callbacks = callbacks;
  }

  setTokens(tokens: number): void {
    this.tokens = tokens;
    if (tokens > 0) {
      // Reset game state completely
      this.gameState = 'ready';
      this.claw.x = (CLAW_MIN_X + CLAW_MAX_X) / 2;
      this.claw.y = CLAW_START_Y;
      this.clawOpen = true;
      this.drawClaw(true);
      this.grabbedPrize = null;
      this.movingLeft = false;
      this.movingRight = false;

      // Ensure scene is active
      if (this.scene.isPaused()) {
        this.scene.resume();
      }
    }
  }

  preload(): void {
    // No external assets needed - we use graphics and text
  }

  create(): void {
    // Background (solid color - Phaser handles this via config backgroundColor)
    // The backgroundColor in config already sets #1a0a2e

    // Machine frame
    const frame = this.add.graphics();
    frame.lineStyle(4, 0x9333ea);
    frame.strokeRect(MACHINE_LEFT, MACHINE_TOP, MACHINE_RIGHT - MACHINE_LEFT, CANVAS_HEIGHT - MACHINE_TOP - 20);

    // Glass window
    const glass = this.add.graphics();
    glass.fillStyle(0x9333ea, 0.1);
    glass.fillRect(MACHINE_LEFT + 4, MACHINE_TOP + 4, MACHINE_RIGHT - MACHINE_LEFT - 8, PIT_TOP - MACHINE_TOP - 8);

    // Prize pit
    const pit = this.add.graphics();
    pit.fillStyle(0x581c87, 0.5);
    pit.fillRect(MACHINE_LEFT + 4, PIT_TOP, MACHINE_RIGHT - MACHINE_LEFT - 8, PIT_BOTTOM - PIT_TOP + 10);

    // Title
    this.add.text(CANVAS_WIDTH / 2, 28, "CLAW'D NINE", {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, 42, 'Grab Your Prize!', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#a855f7',
    }).setOrigin(0.5);

    // Create cable graphics (will be updated each frame)
    this.cable = this.add.graphics();

    // Create claw container
    this.claw = this.add.container((CLAW_MIN_X + CLAW_MAX_X) / 2, CLAW_START_Y);

    // Claw arm graphics
    this.clawArm = this.add.graphics();
    this.claw.add(this.clawArm);
    this.drawClaw(true);

    // Create initial prizes
    this.createPrizes(8);

    // Input handling
    this.setupInput();
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;

    const leftKey = this.input.keyboard.addKey('LEFT');
    const rightKey = this.input.keyboard.addKey('RIGHT');
    const aKey = this.input.keyboard.addKey('A');
    const dKey = this.input.keyboard.addKey('D');
    const spaceKey = this.input.keyboard.addKey('SPACE');
    const enterKey = this.input.keyboard.addKey('ENTER');
    const downKey = this.input.keyboard.addKey('DOWN');

    leftKey.on('down', () => { this.movingLeft = true; });
    leftKey.on('up', () => { this.movingLeft = false; });
    aKey.on('down', () => { this.movingLeft = true; });
    aKey.on('up', () => { this.movingLeft = false; });

    rightKey.on('down', () => { this.movingRight = true; });
    rightKey.on('up', () => { this.movingRight = false; });
    dKey.on('down', () => { this.movingRight = true; });
    dKey.on('up', () => { this.movingRight = false; });

    spaceKey.on('down', () => { this.handleDrop(); });
    enterKey.on('down', () => { this.handleDrop(); });
    downKey.on('down', () => { this.handleDrop(); });
  }

  startMoveLeft(): void {
    this.movingLeft = true;
  }

  stopMoveLeft(): void {
    this.movingLeft = false;
  }

  startMoveRight(): void {
    this.movingRight = true;
  }

  stopMoveRight(): void {
    this.movingRight = false;
  }

  handleDrop(): void {
    if (this.gameState !== 'ready' || this.tokens <= 0) return;

    this.tokens--;
    this.callbacks.onTokenChange(this.tokens);
    this.gameState = 'dropping';
  }

  private createPrizes(count: number, fromTop: boolean = false): void {
    for (let i = 0; i < count; i++) {
      const x = MACHINE_LEFT + 40 + Math.random() * (MACHINE_RIGHT - MACHINE_LEFT - 80);
      const y = fromTop ? PIT_TOP + 10 : PIT_TOP + 20 + Math.random() * (PIT_BOTTOM - PIT_TOP - 40);
      const type = PRIZE_TYPES[Math.floor(Math.random() * PRIZE_TYPES.length)];

      const sprite = this.add.text(x, y, type.emoji, {
        fontSize: '20px',
      }).setOrigin(0.5);

      this.prizes.push({
        sprite,
        type,
        grabbed: false,
        vy: 0,
        settled: !fromTop, // start settled if not from top
      });
    }
  }

  private drawClaw(isOpen: boolean): void {
    this.clawArm.clear();

    const s = 0.7; // scale

    // Connector/arm segment (purple machine part)
    this.clawArm.fillStyle(0xa855f7);
    this.clawArm.fillRoundedRect(-5 * s, -12 * s, 10 * s, 16 * s, 3 * s);

    // Main claw body (the "palm" of the claw) - red/orange lobster color
    this.clawArm.fillStyle(0xdc2626);
    this.clawArm.fillEllipse(0, 12 * s, 28 * s, 20 * s);
    this.clawArm.lineStyle(2, 0x991b1b);
    this.clawArm.strokeEllipse(0, 12 * s, 28 * s, 20 * s);

    // Highlight on body
    this.clawArm.fillStyle(0xf87171);
    this.clawArm.fillEllipse(-5 * s, 8 * s, 8 * s, 5 * s);

    // Pincer spread based on open/closed state (closer together at top)
    const spread = isOpen ? 8 * s : 3 * s;

    // Left pincer - curved lobster claw shape
    this.clawArm.fillStyle(0xdc2626);
    this.clawArm.beginPath();
    this.clawArm.moveTo(-spread, 18 * s);
    this.clawArm.lineTo(-spread - 6 * s, 25 * s);
    this.clawArm.lineTo(-spread - 10 * s, 40 * s);
    this.clawArm.lineTo(-spread - 8 * s, 50 * s);
    this.clawArm.lineTo(-spread - 4 * s, 55 * s); // tip
    this.clawArm.lineTo(-spread, 52 * s);
    this.clawArm.lineTo(-spread + 2 * s, 45 * s);
    this.clawArm.lineTo(-spread + 4 * s, 35 * s);
    this.clawArm.lineTo(-spread + 2 * s, 25 * s);
    this.clawArm.closePath();
    this.clawArm.fillPath();
    this.clawArm.lineStyle(2, 0x991b1b);
    this.clawArm.strokePath();

    // Left pincer highlight
    this.clawArm.fillStyle(0xf87171);
    this.clawArm.fillEllipse(-spread - 4 * s, 35 * s, 4 * s, 10 * s);

    // Right pincer - mirrored
    this.clawArm.fillStyle(0xdc2626);
    this.clawArm.beginPath();
    this.clawArm.moveTo(spread, 18 * s);
    this.clawArm.lineTo(spread + 6 * s, 25 * s);
    this.clawArm.lineTo(spread + 10 * s, 40 * s);
    this.clawArm.lineTo(spread + 8 * s, 50 * s);
    this.clawArm.lineTo(spread + 4 * s, 55 * s); // tip
    this.clawArm.lineTo(spread, 52 * s);
    this.clawArm.lineTo(spread - 2 * s, 45 * s);
    this.clawArm.lineTo(spread - 4 * s, 35 * s);
    this.clawArm.lineTo(spread - 2 * s, 25 * s);
    this.clawArm.closePath();
    this.clawArm.fillPath();
    this.clawArm.lineStyle(2, 0x991b1b);
    this.clawArm.strokePath();

    // Right pincer highlight
    this.clawArm.fillStyle(0xf87171);
    this.clawArm.fillEllipse(spread + 4 * s, 35 * s, 4 * s, 10 * s);
  }

  update(): void {
    // Handle claw movement
    if (this.gameState === 'ready') {
      if (this.movingLeft) {
        this.claw.x = Math.max(CLAW_MIN_X, this.claw.x - CLAW_SPEED);
      }
      if (this.movingRight) {
        this.claw.x = Math.min(CLAW_MAX_X, this.claw.x + CLAW_SPEED);
      }
    }

    // Handle dropping
    if (this.gameState === 'dropping') {
      this.claw.y += DROP_SPEED;
      if (this.claw.y >= PIT_TOP + 20) {
        this.gameState = 'grabbing';
        this.clawOpen = false;
        this.drawClaw(false);

        // Check for prize grab
        const nearbyPrize = this.prizes.find(
          p => !p.grabbed && Math.abs(p.sprite.x - this.claw.x) < 25 && Math.abs(p.sprite.y - (PIT_TOP + 20)) < 35
        );

        if (nearbyPrize && Math.random() < GRIP_SUCCESS_CHANCE) {
          this.grabbedPrize = nearbyPrize;
          nearbyPrize.grabbed = true;
        }

        // Start rising after brief pause
        this.time.delayedCall(300, () => {
          this.gameState = 'rising';
        });
      }
    }

    // Handle rising
    if (this.gameState === 'rising') {
      this.claw.y -= DROP_SPEED;

      // Update grabbed prize position
      if (this.grabbedPrize) {
        this.grabbedPrize.sprite.x = this.claw.x;
        this.grabbedPrize.sprite.y = this.claw.y + 50;

        // Chance to slip and fall!
        if (Math.random() < DROP_CHANCE_PER_FRAME) {
          this.grabbedPrize.grabbed = false;
          this.grabbedPrize.settled = false;
          this.grabbedPrize.vy = 2; // Start falling with some velocity
          this.grabbedPrize = null;
        }
      }

      if (this.claw.y <= CLAW_START_Y) {
        this.claw.y = CLAW_START_Y;
        this.clawOpen = true;
        this.drawClaw(true);

        if (this.grabbedPrize) {
          this.callbacks.onWin({ emoji: this.grabbedPrize.type.emoji, name: this.grabbedPrize.type.name });
          this.grabbedPrize.sprite.destroy();
          this.prizes = this.prizes.filter(p => p !== this.grabbedPrize);
          this.grabbedPrize = null;
        }

        // Replenish prizes (drop from top)
        if (this.prizes.length < 4) {
          this.createPrizes(3, true);
        }

        // Check tokens
        if (this.tokens > 0) {
          this.gameState = 'ready';
        } else {
          this.gameState = 'result';
          this.callbacks.onOutOfTokens();
        }
      }
    }

    // Update cable
    this.cable.clear();
    this.cable.lineStyle(3, 0xa855f7);
    this.cable.beginPath();
    this.cable.moveTo(this.claw.x, MACHINE_TOP);
    this.cable.lineTo(this.claw.x, this.claw.y);
    this.cable.strokePath();

    // Physics for falling prizes
    for (const prize of this.prizes) {
      if (prize.grabbed || prize.settled) continue;

      // Apply gravity
      prize.vy += GRAVITY;
      prize.sprite.y += prize.vy;

      // Bounce off bottom
      if (prize.sprite.y >= PIT_BOTTOM) {
        prize.sprite.y = PIT_BOTTOM;
        prize.vy = -prize.vy * BOUNCE_DAMPING;

        // Settle if moving slowly
        if (Math.abs(prize.vy) < 1) {
          prize.vy = 0;
          prize.settled = true;
        }
      }
    }
  }
}

export function createClawMachineConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#1a0a2e',
    scene: ClawMachineScene,
    render: {
      pixelArt: false,
      antialias: true,
    },
  };
}
