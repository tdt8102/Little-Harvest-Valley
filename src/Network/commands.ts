import type { Point } from '../Components/position.ts';
import type { ItemId } from '../Items/catalog.ts';

// Commands carry only serializable gameplay inputs for a future host transport.
export type Command =
  | { type: 'use'; item: ItemId | null; target: Point; at: number }
  | { type: 'trade'; mode: 'buy' | 'sell'; item: ItemId }
  | { type: 'craft'; item: ItemId }
  | { type: 'claim'; id: string }
  | { type: 'sleep' };
