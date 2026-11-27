export const CROPS = {
  turnipSeed: { product: 'turnip', nights: 2 },
  carrotSeed: { product: 'carrot', nights: 3 },
} as const;
export type Seed = keyof typeof CROPS;
export type Plot = { seed?: Seed; age: number; watered: boolean };
export function ready(plot: Plot) {
  return !!plot.seed && plot.age >= CROPS[plot.seed].nights;
}
export function grow(plots: Record<string, Plot>) {
  for (const plot of Object.values(plots)) {
    if (plot.watered && plot.seed && !ready(plot)) plot.age++;
    plot.watered = false;
  }
}
