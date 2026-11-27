import type { ItemId } from '../Items/catalog.ts';
export const PRICES: Partial<Record<ItemId, number>> = { turnipSeed: 12, carrotSeed: 20 };
export const SALES: Partial<Record<ItemId, number>> = { turnip: 32, carrot: 49, fish: 38, wood: 5, stone: 6 };
