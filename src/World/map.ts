import { WORLD } from '../Config/game.ts';
import type { Resource } from '../Entities/types.ts';

export function hash(x: number, y: number) {
  return ((Math.imul(x + 19, 374761393) ^ Math.imul(y + 37, 668265263)) >>> 0) / 4294967296;
}
export const PLOT = { x: 11, y: 13, w: 10, h: 6 };
export const SHOP = { x: 26, y: 9 };
export const NPC_SPOT = { x: 24, y: 11 };
export const inPlot = (x: number, y: number) => x >= PLOT.x && y >= PLOT.y && x < PLOT.x + PLOT.w && y < PLOT.y + PLOT.h;
export const water = (x: number, y: number) => ((x - 29.4) / 5.2) ** 2 + ((y - 17.2) / 3.35) ** 2 < 1;
export const path = (x: number, y: number) =>
  (y >= 10 && y <= 11 && x >= 3 && x <= 38)
  || (x >= 9 && x <= 10 && y >= 8 && y <= 22)
  || (x >= 12 && x <= 13 && y >= 8 && y <= 10)
  || (x >= 25 && x <= 27 && y >= 8 && y <= 10)
  || (x >= 22 && x <= 23 && y >= 11 && y <= 21);
export const fence = (x: number, y: number) => (y === 12 || y === 19) && x >= 11 && x <= 20 && x !== 15 && x !== 16;
export const building = (x: number, y: number) => (x >= 10 && x <= 14 && y >= 5 && y <= 8) || (x >= 24 && x <= 28 && y >= 5 && y <= 8);
export const terrainSolid = (x: number, y: number) => x < 1 || y < 1 || x >= WORLD.width - 1 || y >= WORLD.height - 1 || water(x, y) || building(x, y) || fence(x, y);
const trees = [
  [2,3],[3,5],[5,4],[5,7],[7,3],[8,6],[9,4],[12,3],[15,4],[16,6],[18,3],[19,6],[21,4],[23,3],[27,3],[30,4],[31,6],[33,3],[35,5],[37,3],[38,7],
  [2,8],[4,9],[6,8],[17,8],[20,8],[31,8],[34,8],[37,9],[2,13],[4,14],[6,13],[7,16],[3,17],[5,19],[2,21],[7,21],
  [12,23],[15,22],[18,22],[20,23],[24,23],[26,22],[29,23],[32,22],[35,21],[37,19],[37,16],[36,13],
];
export function resources(): Resource[] {
  const make = (points: number[][], kind: Resource['kind'], hits: number) => points.map(([x,y]) => ({ x, y, kind, hits, id: `${x},${y}` }));
  return [...make(trees,'tree',2), ...make([[7,14],[8,19],[17,21],[24,15],[33,12],[35,18],[26,21],[21,7],[4,16]],'rock',2),...make([[6,16],[18,20],[31,12]],'stump',1)];
}
