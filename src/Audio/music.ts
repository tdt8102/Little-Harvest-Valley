import { renderScore } from './score.ts';
import type { MusicTheme } from './score.ts';
import { audioContext } from './sound.ts';

type Playing = { theme: MusicTheme; source: AudioBufferSourceNode; gain: GainNode };

export class BackgroundMusic {
  private theme: MusicTheme = 'day';
  private destination: GainNode | null = null;
  private playing: Playing | null = null;
  private volume = 0;
  private loading: MusicTheme | null = null;
  private resuming = false;
  private readonly tracks = new Map<MusicTheme, Promise<AudioBuffer>>();

  constructor(private readonly onTrack: (theme: MusicTheme | null) => void) {}

  configure(enabled: boolean, volume: number) {
    this.volume=enabled?volume:0;
    const destination=this.destination;
    if(destination)destination.gain.setTargetAtTime(this.volume,destination.context.currentTime,.035);
    if(!this.volume){
      this.fadeOut(this.playing,.07);
      this.playing=null;
      this.onTrack(null);
    }else this.reconcile();
  }

  setTheme(theme: MusicTheme) {
    if(theme===this.theme)return;
    this.theme=theme;
    this.reconcile();
  }

  unlock() {
    if(!this.volume)return;
    try {
      const context=audioContext();
      if(!this.destination){
        this.destination=context.createGain();
        this.destination.gain.value=this.volume;
        this.destination.connect(context.destination);
      }
      if(context.state==='running')this.reconcile();
      else if(!this.resuming){
        this.resuming=true;
        void context.resume().then(()=>this.reconcile()).catch(()=>{}).finally(()=>{this.resuming=false;});
      }
    } catch { /* The game can continue if the browser has no Web Audio. */ }
  }

  private fadeOut(track: Playing | null, duration: number) {
    if(!track)return;
    const now=track.gain.context.currentTime;
    const gain=track.gain.gain;
    if(typeof gain.cancelAndHoldAtTime==='function')gain.cancelAndHoldAtTime(now);
    else {
      const level=gain.value;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(level,now);
    }
    gain.linearRampToValueAtTime(0,now+duration);
    track.source.stop(now+duration+.025);
  }

  private reconcile() {
    const destination=this.destination;
    const theme=this.theme;
    if(!destination || destination.context.state!=='running' || !this.volume
      || this.playing?.theme===theme || this.loading===theme)return;
    this.loading=theme;
    let buffer=this.tracks.get(theme);
    if(!buffer){
      buffer=renderScore(theme);
      this.tracks.set(theme,buffer);
    }
    void buffer.then(loop=>{
      if(this.theme!==theme || !this.volume || this.playing?.theme===theme)return;
      const context=destination.context;
      const now=context.currentTime;
      const source=context.createBufferSource();
      const gain=context.createGain();
      source.buffer=loop;
      source.loop=true;
      gain.gain.setValueAtTime(0,now);
      gain.gain.linearRampToValueAtTime(1,now+.85);
      source.connect(gain).connect(destination);
      source.onended=()=>{source.disconnect();gain.disconnect();};
      source.start(now);
      this.fadeOut(this.playing,.85);
      this.playing={theme,source,gain};
      this.onTrack(theme);
    }).catch(()=>{
      this.tracks.delete(theme);
    }).finally(()=>{
      if(this.loading===theme)this.loading=null;
    });
  }
}
