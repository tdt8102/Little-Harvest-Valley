import { DAY_START, HOME, MAX_ENERGY } from '../Config/game.ts';
import type { Point } from '../Components/position.ts';
import type { Character, Resource } from '../Entities/types.ts';
import { BAR } from '../Inventory/bag.ts';
import type { Bag } from '../Inventory/bag.ts';
import type { ItemId } from '../Items/catalog.ts';
import type { Plot } from '../Farming/crops.ts';
import { resources } from '../World/map.ts';

export type Totals = { earned: number; spent: number; harvested: number; gathered: number };
export type Farm = {
  version: 1; character: Character; day: number; minutes: number; coins: number; energy: number; water: number;
  position: Point; bag: Bag; plots: Record<string, Plot>; resources: Resource[]; fences: string[];
  progress: Bag; claimed: string[]; totals: Totals; belt: (ItemId | null)[];
};
export const emptyTotals = (): Totals => ({ earned: 0, spent: 0, harvested: 0, gathered: 0 });
export const DEFAULT_CHARACTER: Character = { name: 'Rowan', farm: 'Honeybrook', outfit: 0 };
export function newFarm(character: Character): Farm {
  return {
    version: 1, character, day: 1, minutes: DAY_START, coins: 250, energy: MAX_ENERGY, water: 12,
    position: { ...HOME },
    bag: { hoe: 1, can: 1, axe: 1, pick: 1, rod: 1, turnipSeed: 6, carrotSeed: 3 },
    plots: {}, resources: resources(), fences: [], progress: {}, claimed: [], totals: emptyTotals(), belt: [...BAR],
  };
}
