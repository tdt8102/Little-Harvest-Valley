import type { ItemId } from '../Items/catalog.ts';

export const QUESTS = [
  { id: 'first', title: 'First Harvest', detail: 'Harvest 3 turnips to get the farm growing.', item: 'turnip', target: 3, reward: 120 },
  { id: 'pond', title: 'A Quiet Morning', detail: 'Catch 2 pond perch at Willow Pond.', item: 'fish', target: 2, reward: 90 },
  { id: 'fence', title: 'Good Fences', detail: 'Craft 2 fence kits for your farm.', item: 'fence', target: 2, reward: 65 },
] as const satisfies readonly { id: string; title: string; detail: string; item: ItemId; target: number; reward: number }[];
