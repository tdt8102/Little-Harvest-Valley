import { DAY_END, DAY_START, SEASON_DAYS } from '../Config/game.ts';

export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
export function date(day: number) {
  return { number: (day - 1) % SEASON_DAYS + 1, season: SEASONS[Math.floor((day - 1) / SEASON_DAYS) % 4], year: Math.floor((day - 1) / 112) + 1 };
}
export function timeLabel(minutes: number) {
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(Math.floor(minutes % 60)).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}
export function advance(minutes: number, elapsed: number) {
  return Math.max(DAY_START, Math.min(DAY_END, minutes + elapsed * 0.0028));
}
