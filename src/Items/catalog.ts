export const ITEMS = {
  hoe: { name: 'Copper Hoe', kind: 'Tool', note: 'Tills grass and soil in the farm plot.' },
  can: { name: 'Watering Can', kind: 'Tool', note: 'Waters a tilled square. Refill at the pond.' },
  axe: { name: 'Wood Axe', kind: 'Tool', note: 'Chops small trees and stumps.' },
  pick: { name: 'Pickaxe', kind: 'Tool', note: 'Breaks loose rocks.' },
  rod: { name: 'Fishing Rod', kind: 'Tool', note: 'Cast from the pond bank. Reel in when it bites.' },
  turnipSeed: { name: 'Turnip Seeds', kind: 'Seed', note: 'Ready after two watered nights.' },
  carrotSeed: { name: 'Carrot Seeds', kind: 'Seed', note: 'Ready after three watered nights.' },
  turnip: { name: 'Turnip', kind: 'Crop', note: 'A crisp little spring root.' },
  carrot: { name: 'Carrot', kind: 'Crop', note: 'Sweet, bright, and worth a few extra coins.' },
  wood: { name: 'Wood', kind: 'Material', note: 'A crafting material gathered from trees.' },
  stone: { name: 'Stone', kind: 'Material', note: 'Useful for sturdy farm crafts.' },
  fish: { name: 'Pond Perch', kind: 'Fish', note: 'A small fish caught in the farm pond.' },
  fence: { name: 'Fence Kit', kind: 'Build', note: 'Place on a free grass tile.' },
  snack: { name: 'Root Snack', kind: 'Food', note: 'Eat to restore 30 energy.' },
} as const;
export type ItemId = keyof typeof ITEMS;
export const RECIPES = [
  { id: 'fence', count: 2, ingredients: { wood: 3, stone: 1 } },
  { id: 'snack', count: 1, ingredients: { turnip: 1 } },
] as const;
