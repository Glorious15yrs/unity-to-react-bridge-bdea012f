export const LANES: number[] = [-2.2, 0, 2.2];
export const laneX = (i: number): number => LANES[i] ?? 0;
export const LANE_COUNT = LANES.length;

export const START_SPEED = 12;
export const MAX_SPEED = 30;
export const SPEED_RAMP = 0.35; // units/sec added per second

export const GRAVITY = -38;
export const JUMP_VELOCITY = 13;
export const ROLL_DURATION = 0.55;

export const TRACK_LENGTH = 220;
export const SPAWN_AHEAD = -180;
export const DESPAWN_Z = 14;

export type ObstacleKind = "train" | "barrier" | "overhead";

export interface Obstacle {
  id: number;
  lane: number;
  z: number;
  kind: ObstacleKind;
}

export interface Coin {
  id: number;
  lane: number;
  z: number;
  y: number;
  taken: boolean;
}
