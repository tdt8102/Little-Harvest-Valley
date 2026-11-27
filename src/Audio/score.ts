export type MusicTheme = 'day' | 'night';
type Chord = [bass: number, voicing: readonly number[]];
type Phrase = readonly (number | null)[];
type Score = { bpm: number; chords: readonly Chord[]; melody: readonly Phrase[] };

// MIDI pitches. Each melody cell is an eighth note, with null leaving room for the note to ring.
const D: Chord = [38, [62, 66, 69, 71]];
const G: Chord = [43, [59, 62, 67, 69]];
const Bm: Chord = [47, [59, 62, 66, 69]];
const A: Chord = [45, [61, 64, 67, 69]];
const Gmaj: Chord = [43, [62, 66, 67, 71]];
const Em: Chord = [40, [59, 64, 67, 71]];
const C: Chord = [36, [60, 64, 67, 71]];
const Dnight: Chord = [38, [57, 62, 66, 69]];
const Am: Chord = [45, [60, 64, 69, 72]];
const B7: Chord = [47, [59, 63, 66, 69]];

const SCORES: Record<MusicTheme, Score> = {
  day: {
    bpm: 106,
    chords: [D,G,Bm,A,D,G,Em,A,Bm,Gmaj,D,A,G,Em,A,D],
    melody: [
      [74,null,78,81,78,null,76,null],
      [79,null,78,76,74,null,71,74],
      [78,null,81,null,83,81,78,null],
      [76,null,73,76,81,null,78,76],
      [74,null,78,81,86,null,83,81],
      [79,null,78,74,71,null,74,76],
      [79,78,76,null,74,null,71,74],
      [73,null,76,null,81,null,79,76],
      [78,null,74,78,81,null,83,null],
      [83,81,79,null,78,79,74,null],
      [74,null,78,null,81,83,86,null],
      [85,null,81,78,76,null,73,76],
      [79,null,83,81,79,78,74,null],
      [76,null,74,71,67,null,69,71],
      [73,76,81,null,79,76,73,null],
      [74,null,78,76,74,null,null,null],
    ],
  },
  night: {
    bpm: 72,
    chords: [Em,C,Gmaj,Dnight,Em,Am,C,B7,Em,C,Am,B7],
    melody: [
      [76,null,null,79,78,null,71,null],
      [72,null,null,76,74,null,null,null],
      [71,null,74,null,78,null,null,79],
      [76,null,74,null,69,null,null,null],
      [67,null,71,null,76,null,74,null],
      [72,null,null,76,81,null,79,null],
      [76,null,null,72,71,null,67,null],
      [66,null,71,null,75,null,null,null],
      [76,null,79,null,83,null,81,null],
      [79,null,76,null,72,null,null,71],
      [69,null,null,72,76,null,72,null],
      [71,null,66,null,63,null,66,null],
    ],
  },
};

type Voice = 'lead' | 'keys' | 'bass' | 'pad';
const VOICES = {
  lead: { wave: 'triangle', attack: .023, partial: .22, pan: -.18 },
  keys: { wave: 'sine', attack: .009, partial: .45, pan: .31 },
  bass: { wave: 'sine', attack: .027, partial: .16, pan: 0 },
  pad: { wave: 'sine', attack: .24, partial: .20, pan: -.33 },
} as const;

export function musicTheme(minutes: number): MusicTheme {
  return minutes >= 1080 || minutes < 360 ? 'night' : 'day';
}

function playNote(context: OfflineAudioContext, output: AudioNode, voice: Voice, midi: number, at: number, length: number, level: number) {
  const {wave, attack, partial, pan}=VOICES[voice];
  const end=at+length;
  const peak=at+Math.min(attack,length*.24);
  const frequency=440*2**((midi-69)/12);
  const envelope=context.createGain();
  envelope.gain.setValueAtTime(.0001,at);
  envelope.gain.exponentialRampToValueAtTime(level,peak);
  envelope.gain.exponentialRampToValueAtTime(level*.44,at+length*.53);
  envelope.gain.exponentialRampToValueAtTime(.0001,end);

  const stereo=context.createStereoPanner();
  stereo.pan.value=pan;
  envelope.connect(stereo).connect(output);

  const fundamental=context.createOscillator();
  fundamental.type=wave;
  fundamental.frequency.value=frequency;
  fundamental.connect(envelope);
  fundamental.start(at);
  fundamental.stop(end);

  const harmonic=context.createOscillator();
  const harmonicGain=context.createGain();
  harmonicGain.gain.value=partial;
  harmonic.frequency.value=frequency*(voice==='keys'?2.997:2.003);
  harmonic.connect(harmonicGain).connect(envelope);
  harmonic.start(at);
  harmonic.stop(end);
}

function scheduleBar(context: OfflineAudioContext, output: AudioNode, score: Score, theme: MusicTheme, bar: number, at: number, beat: number) {
  const [bass,notes]=score.chords[bar];
  const daylight=theme==='day';
  const arp=daylight?[0,2,1,3,0,1,2,3]:[0,1,3,2];
  arp.forEach((note,step)=>{
    playNote(context,output,'keys',notes[note],at+step*(daylight ? .5 : 1)*beat,beat*(daylight ? .81 : 1.28),daylight ? .066 : .063);
  });
  playNote(context,output,'bass',bass,at,beat*(daylight?1.54:3.15),daylight ? .108 : .10);
  if(daylight)playNote(context,output,'bass',bass+7,at+beat*2,beat*1.35,.075);
  else for(const pitch of notes)playNote(context,output,'pad',pitch+12,at+beat*.25,beat*3.5,.022);
  score.melody[bar].forEach((note,step,phrase)=>{
    if(note===null)return;
    const held=phrase[step+1]===null;
    playNote(context,output,'lead',note,at+step*.5*beat,beat*(held?1.2:.69),daylight ? .12 : .091);
  });
}

export async function renderScore(theme: MusicTheme): Promise<AudioBuffer> {
  const score=SCORES[theme];
  const sampleRate=22050;
  const barFrames=Math.round(sampleRate*60/score.bpm*4);
  const loopFrames=barFrames*score.chords.length;
  const context=new OfflineAudioContext(2,loopFrames+barFrames,sampleRate);
  const mix=context.createGain();
  const filter=context.createBiquadFilter();
  filter.type='lowpass';
  filter.frequency.value=theme==='day'?4200:2600;
  filter.Q.value=.3;
  mix.connect(filter).connect(context.destination);
  const echo=context.createDelay();
  echo.delayTime.value=theme==='day' ? .26 : .38;
  const echoLevel=context.createGain();
  echoLevel.gain.value=theme==='day' ? .19 : .26;
  mix.connect(echo).connect(echoLevel).connect(filter);
  const beat=barFrames/sampleRate/4;
  // Render the previous measure first to preserve its release and echo across the loop seam.
  for(let bar=-1;bar<score.chords.length;bar++){
    scheduleBar(context,mix,score,theme,(bar+score.chords.length)%score.chords.length,(bar+1)*beat*4,beat);
  }
  const rendered=await context.startRendering();
  const loop=context.createBuffer(2,loopFrames,sampleRate);
  for(let channel=0;channel<2;channel++){
    loop.copyToChannel(rendered.getChannelData(channel).slice(barFrames,barFrames+loopFrames),channel);
  }
  return loop;
}
