import type { ActionEffect } from '../Systems/effects.ts';

export type SoundCue = ActionEffect | 'bite' | 'reel' | 'stepGrass' | 'stepDirt'
  | 'uiOpen' | 'uiClose' | 'uiSelect' | 'uiConfirm' | 'talk';
type Tone = [delay: number, from: number, to: number, duration: number, level: number, wave?: OscillatorType];
type Texture = [delay: number, frequency: number, resonance: number, duration: number, level: number];
type Cue = { tones?: Tone[]; noise?: Texture[] };

const CUES: Record<SoundCue, Cue> = {
  till: { tones: [[.09, 145, 74, .14, .16, 'triangle']], noise: [[.07, 700, .65, .22, .23]] },
  plant: { tones: [[.08, 520, 740, .09, .09], [.14, 760, 840, .08, .06]], noise: [[.06, 980, .8, .105, .1]] },
  water: { noise: [[.08, 1600, .7, .4, .18]], tones: [[.13, 510, 270, .1, .07], [.26, 680, 335, .12, .08], [.37, 580, 365, .105, .06]] },
  refill: { noise: [[.06, 560, 1.2, .31, .16], [.14, 1200, .8, .28, .13]], tones: [[.16, 280, 480, .15, .08], [.28, 630, 930, .15, .08]] },
  harvest: { noise: [[.055, 1550, .7, .14, .10]], tones: [[.08, 391, 480, .11, .12], [.18, 659, 659, .23, .105, 'triangle'], [.24, 880, 880, .2, .07]] },
  chop: { noise: [[.06, 740, .6, .095, .23]], tones: [[.08, 205, 91, .155, .19, 'triangle']] },
  fell: { noise: [[.06, 740, .6, .13, .25], [.22, 1240, .75, .35, .2]], tones: [[.08, 205, 90, .14, .16, 'triangle'], [.36, 100, 48, .26, .18, 'triangle']] },
  mine: { noise: [[.075, 2800, 1.2, .11, .19]], tones: [[.08, 1280, 810, .16, .105, 'triangle'], [.08, 715, 545, .23, .115]] },
  breakRock: { noise: [[.07, 2750, .8, .11, .23], [.16, 920, .65, .29, .21]], tones: [[.08, 1100, 760, .17, .1, 'triangle'], [.18, 215, 81, .24, .11, 'triangle']] },
  build: { noise: [[.075, 520, .55, .11, .18]], tones: [[.085, 240, 144, .12, .13, 'triangle'], [.16, 750, 790, .12, .06]] },
  liftFence: { noise: [[.05, 1100, 1.3, .17, .17]], tones: [[.09, 240, 400, .15, .09, 'triangle']] },
  eat: { noise: [[.04, 1060, .88, .11, .18], [.14, 870, .8, .09, .12]], tones: [[.22, 447, 668, .15, .095], [.31, 784, 880, .16, .08]] },
  cast: { noise: [[.02, 2060, .7, .17, .14], [.2, 1250, .9, .17, .15]], tones: [[.2, 500, 200, .16, .1]] },
  bite: { tones: [[0, 770, 1020, .09, .15], [.09, 920, 1320, .16, .13, 'triangle']], noise: [[0, 1900, .9, .09, .12]] },
  catch: { noise: [[0, 1500, .65, .2, .18]], tones: [[.1, 524, 524, .17, .12, 'triangle'], [.19, 659, 659, .18, .1, 'triangle'], [.29, 784, 785, .38, .12], [.32, 1047, 1047, .28, .055]] },
  escape: { tones: [[0, 420, 275, .18, .11]], noise: [[0, 800, .7, .18, .08]] },
  reel: { noise: [[0, 1450, 2.1, .075, .08], [.07, 1270, 1.8, .075, .07]] },
  trade: { tones: [[0, 1050, 1050, .14, .115, 'triangle'], [.064, 1568, 1568, .26, .115], [.13, 2093, 2060, .19, .055]] },
  craft: { noise: [[0, 1210, .74, .093, .18], [.1, 830, .8, .12, .16]], tones: [[.16, 330, 390, .14, .12, 'triangle'], [.25, 587, 659, .28, .12]] },
  quest: { tones: [[0, 523, 523, .2, .12, 'triangle'], [.092, 659, 659, .24, .11], [.17, 784, 784, .38, .105], [.28, 1047, 1047, .34, .09], [.3, 262, 262, .41, .07, 'triangle']] },
  sleep: { tones: [[0, 523, 523, .42, .095], [.16, 440, 440, .5, .10], [.34, 392, 392, .59, .085, 'triangle'], [.52, 262, 262, .64, .105]] },
  stepGrass: { noise: [[0, 670, .68, .09, .105]], tones: [[0, 92, 55, .056, .04]] },
  stepDirt: { noise: [[0, 390, .7, .087, .12]], tones: [[0, 111, 54, .076, .065, 'triangle']] },
  uiOpen: { tones: [[0, 375, 490, .105, .075, 'triangle'], [.04, 654, 655, .09, .045]] },
  uiClose: { tones: [[0, 490, 330, .11, .075, 'triangle']] },
  uiSelect: { tones: [[0, 580, 390, .062, .075, 'triangle']] },
  uiConfirm: { tones: [[0, 440, 490, .17, .1], [.088, 659, 659, .26, .11]] },
  talk: { tones: [[0, 322, 428, .088, .075, 'triangle'], [.08, 510, 405, .11, .062, 'triangle']] },
};

type AudioGraph = { context: AudioContext; master: GainNode; noise: AudioBuffer };
let graph: AudioGraph | undefined;
let volume = .5;
let resuming = false;
let lastStart = -Infinity;

export function setVolume(value: number) {
  volume = value;
  if (graph) graph.master.gain.setTargetAtTime(volume, graph.context.currentTime, .018);
}

function makeGraph(): AudioGraph {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = volume;
  master.connect(context.destination);
  const noise = context.createBuffer(1, Math.ceil(context.sampleRate * .5), context.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return { context, master, noise };
}

function envelope(audio: AudioGraph, start: number, duration: number, level: number) {
  const gain = audio.context.createGain();
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + Math.min(.01, duration / 5));
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  gain.connect(audio.master);
  return gain;
}

function schedule(audio: AudioGraph, kind: SoundCue) {
  const now = audio.context.currentTime;
  if (now - lastStart < .035) return;
  lastStart = now;
  const cue = CUES[kind];
  const pitch = kind === 'stepGrass' || kind === 'stepDirt' ? .87 + Math.random() * .25 : 1;
  for (const [delay, from, to, duration, level, wave = 'sine'] of cue.tones ?? []) {
    const start = now + delay;
    const note = audio.context.createOscillator();
    const gain = envelope(audio, start, duration, level);
    note.type = wave;
    note.frequency.setValueAtTime(from * pitch, start);
    note.frequency.exponentialRampToValueAtTime(to * pitch, start + duration);
    note.connect(gain);
    note.start(start);
    note.stop(start + duration + .012);
    note.onended = () => { note.disconnect(); gain.disconnect(); };
  }
  for (const [delay, frequency, resonance, duration, level] of cue.noise ?? []) {
    const start = now + delay;
    const source = audio.context.createBufferSource();
    const band = audio.context.createBiquadFilter();
    const gain = envelope(audio, start, duration, level);
    source.buffer = audio.noise;
    band.type = 'bandpass';
    band.frequency.value = frequency * pitch;
    band.Q.value = resonance;
    source.connect(band).connect(gain);
    source.start(start, Math.random() * .05);
    source.stop(start + duration + .012);
    source.onended = () => { source.disconnect(); band.disconnect(); gain.disconnect(); };
  }
}

export function play(kind: SoundCue) {
  if (!volume) return;
  try {
    graph ??= makeGraph();
    const audio = graph;
    if (audio.context.state === 'running') schedule(audio, kind);
    else if (!resuming) {
      resuming = true;
      void audio.context.resume().then(() => {
        if (volume) schedule(audio, kind);
      }).catch(() => {}).finally(() => { resuming = false; });
    }
  } catch { /* Browsers without Web Audio can still play silently. */ }
}
