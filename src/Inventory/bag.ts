import type { ItemId } from '../Items/catalog.ts';

export type Bag = Partial<Record<ItemId, number>>;
export const BAR: (ItemId | null)[] = ['hoe', 'can', 'axe', 'pick', 'rod', 'turnipSeed', 'carrotSeed', 'fence', 'snack', null, null, null];
export function add(bag: Bag, id: ItemId, count: number) {
  const next = (bag[id] ?? 0) + count;
  if (next > 0) bag[id] = next;
  else delete bag[id];
}
export function has(bag: Bag, id: ItemId, count = 1) {
  return (bag[id] ?? 0) >= count;
}
