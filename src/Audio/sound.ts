import type { Result } from '../Systems/gameplay.ts';

let context: AudioContext | undefined;
const NOTES = { hit: [155,115], success: [392,523,659], water: [740,510], coin: [660,880] };
export function play(kind: NonNullable<Result['sound']>, volume: number) {
  if (!volume) return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume().catch(() => {});
    NOTES[kind].forEach((frequency,index) => {
      const start = context!.currentTime + index * 0.062;
      const note = context!.createOscillator();
      const gain = context!.createGain();
      note.type = kind === 'hit' ? 'triangle' : 'sine';
      note.frequency.setValueAtTime(frequency,start);
      gain.gain.setValueAtTime(0.0001,start);
      gain.gain.exponentialRampToValueAtTime(volume * 0.08,start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001,start + 0.12);
      note.connect(gain).connect(context!.destination);
      note.start(start);
      note.stop(start + 0.13);
    });
  } catch { /* The game remains playable without sound. */ }
}
