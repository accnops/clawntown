import { Direction } from "../types";

/**
 * Character Movement Framework
 *
 * Characters have 4 directional sprites and follow a set path loop.
 * Movement is smooth (interpolated between waypoints each frame).
 */

// Character types - each has 4 directional sprites
export enum CharacterType {
  Boat = "boat",
  // Future: Lobster, Fisherman, Seagull, etc.
}

// A waypoint in the path (grid coordinates)
export interface PathWaypoint {
  x: number;
  y: number;
}

// Character instance
export interface Character {
  id: string;
  type: CharacterType;
  // Current position (floating point for smooth movement)
  x: number;
  y: number;
  // Current direction (determines which sprite to show)
  direction: Direction;
  // Movement speed (grid units per second)
  speed: number;
  // Path loop - character cycles through these waypoints
  path: PathWaypoint[];
  // Current target waypoint index
  pathIndex: number;
  // Scale override (optional, uses default from type if not set)
  scale?: number;
}

// Direction vectors for movement calculation
export const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  [Direction.North]: { dx: 0, dy: -1 },
  [Direction.South]: { dx: 0, dy: 1 },
  [Direction.West]: { dx: -1, dy: 0 },
  [Direction.East]: { dx: 1, dy: 0 },
};

// Calculate direction from movement delta (adjusted for isometric projection)
// In isometric: +X = down-right, +Y = down-left, -X = up-left, -Y = up-right
export function getDirectionFromDelta(dx: number, dy: number): Direction {
  // Prioritize the larger component for diagonal-ish movement
  if (Math.abs(dx) > Math.abs(dy)) {
    // Moving along X axis: +X = Southeast (show South), -X = Northwest (show North)
    return dx > 0 ? Direction.South : Direction.North;
  } else {
    // Moving along Y axis: +Y = Southwest (show West), -Y = Northeast (show East)
    return dy > 0 ? Direction.West : Direction.East;
  }
}

// Character type definitions
export interface CharacterTypeDefinition {
  name: string;
  // Sprite path pattern: /assets/{category}/{name}_sprite_{direction}.png
  spritePath: string;
  defaultSpeed: number;
  defaultScale: number;
}

export const CHARACTER_TYPES: Record<CharacterType, CharacterTypeDefinition> = {
  [CharacterType.Boat]: {
    name: "boat",
    spritePath: "/assets/buildings/core/boat_sprite_{dir}.png",
    defaultSpeed: 0.8, // Grid units per second
    defaultScale: 0.12,
  },
};

// Get sprite key for a character facing a direction
export function getCharacterSpriteKey(type: CharacterType, direction: Direction): string {
  const typeDef = CHARACTER_TYPES[type];
  return `${typeDef.name}_${direction}`;
}

// Predefined boat patrol routes around the island
export const BOAT_PATHS: PathWaypoint[][] = [
  // Route 1: Northwest patrol (counterclockwise around north side)
  [
    { x: -4, y: 5 },
    { x: -4, y: 15 },
    { x: -3, y: 25 },
    { x: 5, y: 32 },
    { x: 15, y: 34 },
    { x: 25, y: 32 },
    { x: 30, y: 25 },
    { x: 32, y: 15 },
    { x: 32, y: 5 },
    { x: 25, y: -2 },
    { x: 15, y: -3 },
    { x: 5, y: -2 },
  ],
  // Route 2: Small loop near lighthouse (southeast)
  [
    { x: 28, y: 28 },
    { x: 32, y: 24 },
    { x: 35, y: 20 },
    { x: 35, y: 28 },
    { x: 32, y: 32 },
    { x: 28, y: 32 },
  ],
  // Route 3: Western fishing route
  [
    { x: -5, y: 8 },
    { x: -6, y: 12 },
    { x: -6, y: 18 },
    { x: -5, y: 22 },
    { x: -4, y: 18 },
    { x: -4, y: 12 },
  ],
];

// Create initial boat characters
export function createInitialBoats(): Character[] {
  return BOAT_PATHS.map((path, index) => ({
    id: `boat_${index}`,
    type: CharacterType.Boat,
    x: path[0].x,
    y: path[0].y,
    direction: Direction.South,
    speed: CHARACTER_TYPES[CharacterType.Boat].defaultSpeed + (index * 0.1), // Slight speed variation
    path,
    pathIndex: 0,
    scale: CHARACTER_TYPES[CharacterType.Boat].defaultScale,
  }));
}

/**
 * Update a character's position along its path
 * @param char The character to update
 * @param deltaSeconds Time elapsed since last update (in seconds)
 * @returns Updated character
 */
export function updateCharacterPosition(char: Character, deltaSeconds: number): Character {
  const target = char.path[char.pathIndex];
  const dx = target.x - char.x;
  const dy = target.y - char.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // How far we can move this frame
  const moveDistance = char.speed * deltaSeconds;

  // Threshold for "arrived at waypoint"
  const arrivalThreshold = 0.1;

  if (distance <= arrivalThreshold || distance <= moveDistance) {
    // Arrived at waypoint - move to next
    const nextIndex = (char.pathIndex + 1) % char.path.length;
    const nextTarget = char.path[nextIndex];

    // Calculate new direction toward next waypoint
    const nextDx = nextTarget.x - target.x;
    const nextDy = nextTarget.y - target.y;
    const newDirection = getDirectionFromDelta(nextDx, nextDy);

    return {
      ...char,
      x: target.x,
      y: target.y,
      pathIndex: nextIndex,
      direction: newDirection,
    };
  }

  // Move toward target
  const moveRatio = moveDistance / distance;
  const newX = char.x + dx * moveRatio;
  const newY = char.y + dy * moveRatio;

  // Update direction based on movement
  const newDirection = getDirectionFromDelta(dx, dy);

  return {
    ...char,
    x: newX,
    y: newY,
    direction: newDirection,
  };
}
