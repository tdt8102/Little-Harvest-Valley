export type Point = { x: number; y: number };
export type Direction = 'down' | 'up' | 'left' | 'right';
export const DELTA: Record<Direction, Point> = { down: { x: 0, y: 1 }, up: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
export const key = (x: number, y: number) => `${x},${y}`;
