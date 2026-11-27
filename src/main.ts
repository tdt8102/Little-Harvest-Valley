import Phaser from 'phaser';
import { play } from './Audio/sound.ts';
import type { Point } from './Components/position.ts';
import { DEFAULT_CHARACTER, newFarm } from './Core/state.ts';
import type { Totals } from './Core/state.ts';
import { BAR, has } from './Inventory/bag.ts';
import { ITEMS } from './Items/catalog.ts';
import type { ItemId } from './Items/catalog.ts';
import { MIRA } from './NPC/mira.ts';
import { readFarm, readOptions, storeFarm, storeOptions } from './Save/storage.ts';
import { ValleyScene } from './Scenes/ValleyScene.ts';
import { Gameplay } from './Systems/gameplay.ts';
import type { Result } from './Systems/gameplay.ts';
import { date } from './Systems/clock.ts';
import { Interface, panelBody, portrait } from './UI/interface.ts';
import type { Panel } from './UI/interface.ts';
import './style.css';

const app=document.querySelector<HTMLElement>('#app')!;
const ui=new Interface(app);
let save=readFarm(), model=new Gameplay(newFarm(DEFAULT_CHARACTER)), options=readOptions();
let panel: Panel|null=null, started=false, loaded=false;
let selected=0, slots=[...BAR], outfit=0, line=0, trade:'buy'|'sell'='buy';
let summary: Totals|null=null, hudElapsed=0, saveElapsed=0;
let settingsFromPause=false;
document.documentElement.classList.toggle('reduce-motion',options.reducedMotion);

const scene=new ValleyScene({
  model:()=>model, blocked:()=>!started||!!panel,
  reduced:()=>options.reducedMotion, use:useTool, tick,
  inspect:()=>!started,
  ready:()=>{loaded=true;ui.ready();ui.main(true,!!save);},
  hint:message=>ui.toast(message),
});
new Phaser.Game({
  type: Phaser.AUTO, parent:'world', scene:[scene],
  backgroundColor:'#344b30', pixelArt:true, roundPixels:true,
  render:{ antialias:false },
  scale:{ mode:Phaser.Scale.RESIZE, width:'100%', height:'100%' },
  audio:{ noAudio:true }, banner:false,
});

function updateUI(refreshWorld = false) {
  ui.hud(model.farm);
  ui.journal(model.farm);
  ui.bar(model.farm,slots,selected);
  if(refreshWorld && loaded)scene.renderChanges();
}
function saveNow() {
  if(!started)return false;
  if(!storeFarm(model.farm))return false;
  save=model.farm;
  return true;
}
function show(next: Panel|null) {
  panel=next;
  ui.modal(next,next?panelBody(next,model.farm,options,{selected,outfit,line,trade,summary,started}):'');
  if(next)ui.context('');
}
function close() {
  if(panel==='settings'&&settingsFromPause){settingsFromPause=false;show('pause');return;}
  show(null);
}
function begin(farm: ReturnType<typeof newFarm>) {
  model=new Gameplay(farm);
  started=true;
  slots=farm.belt;
  selected=0;
  line=0;
  saveElapsed=0;
  ui.main(false,false);
  show(null);
  updateUI(true);
  if(!saveNow())ui.toast('Browser storage is unavailable. Progress cannot be saved.');
}
function handle(result: Result,target?: Point) {
  if(result.message)ui.toast(result.message);
  if(result.sound){play(result.sound,options.volume);if(target)scene.flash(target,result.sound==='water'?0x91c1c8:0xf4d58a);}
  if(result.changed){
    updateUI(true);
    saveNow();
    if(panel)show(panel);
  }
  if(result.panel){if(result.panel==='shop')trade='buy';show(result.panel);}
}
function useTool(target: Point) {
  if(!started||panel)return;
  handle(model.dispatch({type:'use',item:slots[selected],target,at:performance.now()}),target);
}
function tick(delta: number) {
  hudElapsed+=delta;
  saveElapsed+=delta;
  if(hudElapsed>=130) {
    hudElapsed=0;
    ui.hud(model.farm);
    const cast=model.cast, now=performance.now();
    if(cast && now>cast.expires){
      model.cast=null;
      ui.toast('The fish slipped away. Try another cast.');
    }
    const nearby=model.interact().panel;
    const hint=cast?(now>=cast.until?'Bite! Click or press Space to reel in.':'Fishing… wait for a bite.')
      : nearby==='sleep'?'E  ·  Rest at the cottage':nearby==='shop'?'E  ·  Open market':nearby==='dialogue'?'E  ·  Talk to Mira':'';
    ui.context(hint);
  }
  if(saveElapsed>=9500){saveElapsed=0;saveNow();}
}
function select(index: number) {
  selected=index;
  ui.bar(model.farm,slots,selected);
}
function action(value: string) {
  if(!loaded)return;
  const [kind,arg]=value.split(':');
  switch(kind){
    case 'home': if(started)show('pause'); else if(panel)close(); break;
    case 'new': if(save)show('replace');else{outfit=0;show('create');} break;
    case 'create': outfit=0;show('create');break;
    case 'continue': if(save)begin(structuredClone(save));break;
    case 'panel': {
      const next=arg as Panel;
      if(next==='settings')settingsFromPause=panel==='pause';
      if(next==='shop')trade='buy';
      if(panel===next)close();else show(next);
      break;
    }
    case 'close': close();break;
    case 'slot': select(Number(arg));break;
    case 'equip': {
      const id=arg as ItemId;
      if(started&&has(model.farm.bag,id)){slots[selected]=id;select(selected);saveNow();close();}
      else ui.toast('Start a farm to equip items.');
      break;
    }
    case 'outfit': {
      outfit=Number(arg);
      const img=document.querySelector<HTMLImageElement>('#character-portrait');
      if(img)img.src=portrait(outfit);
      document.querySelectorAll('.swatch').forEach(element=>element.setAttribute('aria-pressed',String((element as HTMLElement).dataset.action===value)));
      break;
    }
    case 'craft': if(started&&panel==='craft')handle(model.dispatch({type:'craft',item:arg as ItemId}));break;
    case 'claim': if(started&&panel==='quests')handle(model.dispatch({type:'claim',id:arg}));break;
    case 'trade-tab': if(panel==='shop'){trade=arg==='sell'?'sell':'buy';show(panel);}break;
    case 'trade': if(started&&panel==='shop')handle(model.dispatch({type:'trade',mode:trade,item:arg as ItemId}));break;
    case 'next-line': line=(line+1)%MIRA.lines.length;show('dialogue');break;
    case 'sleep': {
      if(!started||panel!=='sleep')break;
      const result=model.dispatch({type:'sleep'});
      summary=result.summary??null;
      handle(result);
      show('summary');
      break;
    }
    case 'save': ui.toast(saveNow()?'Farm saved.':'Browser storage is unavailable.');break;
    case 'title': {
      if(!saveNow()){ui.toast('Browser storage is unavailable.');break;}
      started=false;model=new Gameplay(newFarm(DEFAULT_CHARACTER));slots=[...BAR];selected=0;
      show(null);ui.main(true,!!save);updateUI(true);break;
    }
  }
}
app.addEventListener('click', event=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if(button&&!button.disabled)action(button.dataset.action!);
});
app.addEventListener('submit',event=>{
  const form=event.target as HTMLFormElement;
  if(form.id!=='character-form')return;
  event.preventDefault();
  const data=new FormData(form), name=String(data.get('name')).trim(), farm=String(data.get('farm')).trim();
  if(!name||!farm){ui.toast('Enter a name for your farmer and farm.');return;}
  begin(newFarm({name,farm,outfit}));
});
app.addEventListener('input', event=>{
  const input=event.target as HTMLInputElement;
  if(input.id==='volume'){
    options.volume=Number(input.value)/100;
    document.querySelector('#volume-label')!.textContent=`${input.value}%`;
  }else if(input.id==='motion'){
    options.reducedMotion=input.checked;
    document.documentElement.classList.toggle('reduce-motion',options.reducedMotion);
  }else return;
  storeOptions(options);
});
const bindings: Record<string,Panel>={i:'inventory',c:'craft',j:'quests',k:'calendar'};
window.addEventListener('keydown',event=>{
  if(!loaded)return;
  const target=event.target as HTMLElement;
  if(event.key==='Escape'){
    event.preventDefault();
    if(!event.repeat){if(panel)close();else if(started)show('pause');}
    return;
  }
  if(event.key==='Tab'&&panel){
    const controls=[...app.querySelectorAll<HTMLElement>('.modal :is(button:not(:disabled),input:not(:disabled),select:not(:disabled))')];
    if(!controls.length)return;
    const first=controls[0],last=controls[controls.length-1];
    if((event.shiftKey&&document.activeElement===first)||(!event.shiftKey&&document.activeElement===last)){event.preventDefault();(event.shiftKey?last:first).focus();}
    return;
  }
  if(event.repeat||target.matches('input,textarea,select')||!started)return;
  const key=event.key.toLowerCase();
  if(bindings[key]&&(!panel||panel===bindings[key])){event.preventDefault();action(`panel:${bindings[key]}`);return;}
  if(panel)return;
  const index='1234567890[]'.indexOf(key);
  if(key.length===1&&index>=0){event.preventDefault();select(index);}
  if(key==='e'){event.preventDefault();handle(model.interact());}
  if(key===' '){event.preventDefault();useTool(scene.front());}
  if(event.key.startsWith('Arrow'))event.preventDefault();
});
window.addEventListener('pagehide',()=>saveNow());
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow();});
updateUI();
