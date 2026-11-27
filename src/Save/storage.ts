import { DEFAULT_LANGUAGE, isLanguage } from '../Config/language.ts';
import type { Language } from '../Config/language.ts';
import { newFarm } from '../Core/state.ts';
import type { Farm } from '../Core/state.ts';
import { BAR } from '../Inventory/bag.ts';
import { ITEMS } from '../Items/catalog.ts';

const SAVE = 'little-harvest-valley:v1';
const OPTIONS = 'little-harvest-valley:settings';
export type Options = { volume: number; reducedMotion: boolean; language: Language; tutorialSeen: boolean };
const DEFAULT_OPTIONS: Options = { volume: 0.5, reducedMotion: false, language: DEFAULT_LANGUAGE, tutorialSeen: false };
export function storeFarm(farm: Farm) {
  try { localStorage.setItem(SAVE, JSON.stringify(farm)); return true; }
  catch { return false; }
}
export function readFarm(): Farm | null {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE) ?? 'null') as Farm | null;
    if (!value || value.version !== 1 || typeof value.character?.name !== 'string' || typeof value.character.farm !== 'string'
      || !Number.isInteger(value.day) || value.day < 1 || !Number.isFinite(value.position?.x)
      || !Number.isFinite(value.position?.y) || !Array.isArray(value.resources) || !value.bag || !value.plots) return null;
    const belt = Array.isArray(value.belt) && value.belt.length === BAR.length
      && value.belt.every(item => item === null || Object.hasOwn(ITEMS,item)) ? value.belt : [...BAR];
    const outfit = Number.isInteger(value.character.outfit) && value.character.outfit >= 0 && value.character.outfit < 4 ? value.character.outfit : 0;
    return { ...newFarm(value.character), ...value, character: { ...value.character, outfit }, belt };
  } catch { return null; }
}
export function readOptions(): Options {
  try {
    const value = JSON.parse(localStorage.getItem(OPTIONS) ?? '{}') as Partial<Options> | null;
    return {
      volume: typeof value?.volume === 'number' ? Math.max(0, Math.min(1, value.volume)) : DEFAULT_OPTIONS.volume,
      reducedMotion: value?.reducedMotion === true,
      language: isLanguage(value?.language) ? value.language : DEFAULT_OPTIONS.language,
      tutorialSeen: value?.tutorialSeen === true,
    };
  } catch { return { ...DEFAULT_OPTIONS }; }
}
export function storeOptions(options: Options) {
  try { localStorage.setItem(OPTIONS, JSON.stringify(options)); } catch { /* Private browsing can disable storage. */ }
}
