import type { Point } from '../Components/position.ts';

export type Resource = Point & { id: string; kind: 'tree' | 'rock' | 'stump'; hits: number };
export type Character = { name: string; farm: string; outfit: number };
export const OUTFITS = ['#c57548', '#668bbe', '#8b9b58', '#b776a5'];
