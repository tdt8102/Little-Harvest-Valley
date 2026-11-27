import Phaser from 'phaser';
import { play, setVolume } from './Audio/sound.ts';
import type { Point } from './Components/position.ts';
import { isLanguage } from './Config/language.ts';
import { DEFAULT_CHARACTER, newFarm } from './Core/state.ts';
import type { Farm, Totals } from './Core/state.ts';
import { BAR, has } from './Inventory/bag.ts';
import type { ItemId } from './Items/catalog.ts';
import { RoomClient } from './Network/client.ts';
import { cleanCode, validCode } from './Network/protocol.ts';
import type { Peer, RoomError, ServerPacket, Vote } from './Network/protocol.ts';
import { readFarm, readOptions, storeFarm, storeOptions } from './Save/storage.ts';
import { ValleyScene } from './Scenes/ValleyScene.ts';
import { Gameplay } from './Systems/gameplay.ts';
import type { Result } from './Systems/gameplay.ts';
import { Interface, panelBody, portrait } from './UI/interface.ts';
import type { JoinDraft, Panel } from './UI/interface.ts';
import { createLocale } from './UI/locale.ts';
import { TouchControls } from './UI/touch.ts';
import { tutorialPages } from './UI/tutorial.ts';
import './style.css';

const app=document.querySelector<HTMLElement>('#app')!;
const options=readOptions();
let locale=createLocale(options.language);
const ui=new Interface(app,locale);
const touchMedia=matchMedia('(pointer: coarse), (max-width: 690px)');
const pad=new TouchControls(app.querySelector('#dpad')!);
let save=readFarm(), model=new Gameplay(newFarm(DEFAULT_CHARACTER));
let panel: Panel|null=null, started=false, loaded=false;
let selected=0, slots=[...BAR], outfit=0, line=0, trade:'buy'|'sell'='buy';
let summary: Totals|null=null, hudElapsed=0, saveElapsed=0;
let submenuFromPause=false, tutorialPage=0, bitePlayed=false;

let online=false, connected=false, joining=false;
let vote: Vote|null=null, peers: Peer[]=[];
let connectionNote: RoomError|'connecting'|'invalidRoom'|'disconnected'|null=null;
let pendingSummary: Totals|null=null;
let joinDraft: JoinDraft={address:location.origin,code:'',name:save?.character.name??DEFAULT_CHARACTER.name};
const network=new RoomClient(receive, onDisconnect);

document.documentElement.classList.toggle('reduce-motion',options.reducedMotion);
ui.setTouch(touchMedia.matches,false);
setVolume(options.volume);

const scene=new ValleyScene({
  model:()=>model, blocked:()=>!started||!!panel||(online&&!connected),
  reduced:()=>options.reducedMotion, use:useTool, tick,
  inspect:()=>!started, touch:()=>touchMedia.matches, touchMovement:()=>pad.movement,
  ready:()=>{loaded=true;ui.ready();ui.main(true,!!save);},
  reeledIn:()=>{if(!online){play('reel');ui.toast(locale.text.reeledIn);}},
  footstep:dirt=>play(dirt?'stepDirt':'stepGrass'),
  landmarks:()=>[locale.text.cottage,locale.text.market,locale.text.pond],
  online:()=>online, peers:()=>peers, movement:(x,y)=>{if(connected)network.move(x,y);},
});
new Phaser.Game({
  type: Phaser.AUTO, parent:'world', scene:[scene],
  backgroundColor:'#344b30', pixelArt:true, roundPixels:true,
  render:{ antialias:false }, scale:{ mode:Phaser.Scale.RESIZE, width:'100%', height:'100%' },
  audio:{ noAudio:true }, banner:false,
});

function refreshNetworkStatus() {
  const t=locale.text;
  ui.onlineStatus(connected&&vote ? (vote.ready?t.waitingForSleep(vote.ready,vote.total):t.onlineCount(vote.total)) : '');
}
function updateUI(refreshWorld = false) {
  ui.setTouch(touchMedia.matches,started);
  ui.hud(model.farm);
  ui.journal(model.farm);
  ui.bar(model.farm,slots,selected);
  refreshNetworkStatus();
  if(refreshWorld && loaded)scene.renderChanges();
}
function saveNow() {
  if(!started||online)return false;
  if(!storeFarm(model.farm))return false;
  save=model.farm;
  return true;
}
function show(next: Panel|null) {
  const previous=panel;
  panel=next;
  if(next && next!==previous) {
    pad.reset();
    if(connected)network.move(0,0);
  }
  if(next!==previous && next!=='summary')play(next==='dialogue'?'talk':next?'uiOpen':'uiClose');
  ui.modal(next,next?panelBody(next,model.farm,options,locale,{
    selected,outfit,line,trade,summary,started,tutorialPage,touch:touchMedia.matches,online,
    join:joinDraft,joining,connectionNote:connectionNote?locale.text[connectionNote]:'',vote,
  }):'');
  if(next)ui.context('');
}
function close() {
  if(panel==='online') {
    network.disconnect();
    joining=false;
    connectionNote=null;
    if(online){returnToTitle();return;}
  }
  if(panel==='tutorial'){
    options.tutorialSeen=true;
    storeOptions(options);
  }
  if((panel==='settings'||panel==='tutorial')&&submenuFromPause){
    submenuFromPause=false;
    show('pause');
    return;
  }
  show(null);
}
function begin(farm: Farm, multiplayer = false) {
  if(!multiplayer){network.disconnect();connected=false;peers=[];vote=null;}
  online=multiplayer;
  model=new Gameplay(farm);
  started=true;
  slots=farm.belt;
  selected=0;
  line=0;
  summary=null;
  pendingSummary=null;
  saveElapsed=0;
  bitePlayed=false;
  submenuFromPause=false;
  tutorialPage=0;
  ui.main(false,false);
  scene.resetEffects();
  play('uiConfirm');
  show(options.tutorialSeen?null:'tutorial');
  updateUI(true);
  if(!online&&!saveNow())ui.toast(locale.text.storageProgress);
}
function returnToTitle() {
  network.disconnect();
  online=false;
  connected=false;
  joining=false;
  connectionNote=null;
  peers=[];
  vote=null;
  started=false;
  model=new Gameplay(newFarm(DEFAULT_CHARACTER));
  slots=[...BAR];
  selected=0;
  scene.resetEffects();
  show(null);
  ui.main(true,!!save);
  updateUI(true);
}
function effectItem(result: Result): ItemId|undefined {
  if(result.effect==='catch')return 'fish';
  if(result.effect==='liftFence')return 'fence';
  if(typeof result.notice==='object' && 'item' in result.notice
    && (result.effect==='harvest'||result.effect==='fell'||result.effect==='breakRock'||result.effect==='craft')) return result.notice.item;
}
const worldActions = new Set(['till','plant','water','harvest','fell','breakRock','build','liftFence','sleep']);
function handle(result: Result,target?: Point,origin?: Point) {
  const item=effectItem(result);
  if(origin) {
    if(result.effect) {
      scene.playRemoteEffect(result.effect,origin,target??origin,item);
      const p=model.farm.position;
      if(Math.hypot(p.x-origin.x,p.y-origin.y)<6)play(result.effect);
    }
    return;
  }
  if(result.notice)ui.toast(locale.notice(result.notice),item??(result.effect==='trade'||result.effect==='quest'?'gold':undefined));
  if(result.notice==='castCancelled')play('reel');
  if(result.effect) {
    play(result.effect);
    scene.playEffect(result.effect,result.effect==='eat'?undefined:target,item);
  }
  if(result.changed&&!online){
    updateUI(worldActions.has(result.effect??''));
    saveNow();
    if(panel)show(panel);
  }
  if(result.panel){if(result.panel==='shop')trade='buy';show(result.panel);}
}
function useTool(target: Point) {
  if(!started||panel||(online&&!connected))return;
  const item=slots[selected];
  if(online){network.action({type:'use',item,target});return;}
  const castTarget=item==='rod'?model.cast?.target:undefined;
  handle(model.dispatch({type:'use',item,target,at:performance.now()}),castTarget??target);
}

function tick(delta: number) {
  const now=performance.now();
  const cast=model.cast;
  if(cast && now>cast.expires && !online){
    model.cast=null;
    handle({notice:'fishEscaped',effect:'escape'},cast.target);
  }
  if(!model.cast)bitePlayed=false;
  else if(now>=model.cast.until&&!bitePlayed) {
    bitePlayed=true;
    play('bite');
    scene.playEffect('bite',model.cast.target);
  }

  hudElapsed+=delta;
  saveElapsed+=delta;
  if(hudElapsed>=130) {
    hudElapsed=0;
    ui.hud(model.farm);
    const nearby=model.interact().panel;
    const t=locale.text, touch=touchMedia.matches;
    const hint=model.cast?(now>=model.cast.until?(touch?t.touchBite:t.fishBite):t.fishing)
      : nearby==='sleep'?(touch?t.touchRest:t.interactCottage)
      : nearby==='shop'?(touch?t.touchShop:t.interactMarket)
      : nearby==='dialogue'?(touch?t.touchMira:t.interactMira):'';
    ui.context(hint);
    ui.touchNearby(!!nearby);
  }
  if(!online&&saveElapsed>=9500){saveElapsed=0;saveNow();}
}
function select(index: number) {
  if(selected!==index)play('uiSelect');
  selected=index;
  ui.bar(model.farm,slots,selected);
}

function correctPosition(position: Point, snap = false) {
  const current=model.farm.position;
  const dx=position.x-current.x, dy=position.y-current.y;
  const difference=Math.hypot(dx,dy);
  if(snap || difference>1.1) model.farm.position={...position};
  else if(difference>.065){current.x+=dx*.28;current.y+=dy*.28;}
}
function receive(message: ServerPacket) {
  switch(message.type) {
    case 'ready':
      connected=true;
      joining=false;
      connectionNote=null;
      peers=message.peers;
      vote=message.vote;
      begin(message.farm,true);
      return;
    case 'error':
      if(connected&&message.code==='invalidCommand')ui.toast(locale.text.invalidCommand);
      else {
        connectionNote=message.code;
        joining=false;
        if(panel==='online')show('online');
        if(message.code==='roomEnded')onDisconnect();
      }
      return;
    case 'motion': {
      if(!connected)return;
      correctPosition(message.position);
      model.farm.minutes=message.minutes;
      peers=message.peers;
      const changed=vote?.ready!==message.vote.ready || vote?.total!==message.vote.total || vote?.mine!==message.vote.mine;
      vote=message.vote;
      if(changed){refreshNetworkStatus();if(panel==='sleep')show('sleep');}
      return;
    }
    case 'sync': {
      if(!connected)return;
      const previousPosition=model.farm.position;
      Object.assign(model.farm,message.farm,{position:previousPosition});
      correctPosition(message.farm.position,!!pendingSummary);
      const cast=message.cast;
      const now=performance.now();
      model.cast=cast?{target:cast.target,origin:{...model.farm.position},until:now+cast.biteIn,expires:now+cast.expiresIn}:null;
      slots=model.farm.belt;
      updateUI(message.redraw);
      if(pendingSummary){
        summary=pendingSummary;
        pendingSummary=null;
        show('summary');
      }else if(panel==='shop'||panel==='craft'||panel==='quests'||panel==='inventory')show(panel);
      return;
    }
    case 'event':
      if(!connected)return;
      if(message.result.summary)pendingSummary=message.result.summary;
      handle(message.result,message.target,message.origin);
  }
}
function onDisconnect() {
  if(connected||online) {
    connected=false;
    peers=[];
    vote=null;
    pad.reset();
    joining=false;
    connectionNote=connectionNote==='roomEnded'?'roomEnded':'disconnected';
    refreshNetworkStatus();
    show('online');
  } else if(joining){
    joining=false;
    connectionNote='connectionError';
    show('online');
  }
}

function action(value: string) {
  if(!loaded)return;
  const [kind,arg]=value.split(':');
  switch(kind){
    case 'home': if(started&&(!online||connected))show('pause'); else if(panel)close(); break;
    case 'new': if(save)show('replace');else{outfit=0;show('create');} break;
    case 'create': outfit=0;show('create');break;
    case 'continue': if(save)begin(structuredClone(save));break;
    case 'panel': {
      const next=arg as Panel;
      if(next==='settings'||next==='tutorial')submenuFromPause=panel==='pause';
      if(next==='tutorial')tutorialPage=0;
      if(next==='shop')trade='buy';
      if(panel===next)close();else show(next);
      break;
    }
    case 'close': close();break;
    case 'tutorial-next': case 'tutorial-prev': {
      const last=tutorialPages(locale.language,touchMedia.matches).length-1;
      tutorialPage=Math.max(0,Math.min(last,tutorialPage+(kind==='tutorial-next'?1:-1)));
      play('uiSelect');
      show('tutorial');
      break;
    }
    case 'touch-use': useTool(scene.front());break;
    case 'touch-interact': if(started&&!panel)handle(model.interact());break;
    case 'slot': select(Number(arg));break;
    case 'equip': {
      const id=arg as ItemId;
      if(started&&has(model.farm.bag,id)){
        if(online)network.action({type:'equip',slot:selected,item:id});
        else {slots[selected]=id;select(selected);saveNow();}
        close();
      }else ui.toast(locale.text.startToEquip);
      break;
    }
    case 'outfit': {
      outfit=Number(arg);
      const img=document.querySelector<HTMLImageElement>('#character-portrait');
      if(img)img.src=portrait(outfit);
      document.querySelectorAll('.swatch').forEach(element=>element.setAttribute('aria-pressed',String((element as HTMLElement).dataset.action===value)));
      play('uiSelect');
      break;
    }
    case 'craft': if(started&&panel==='craft'){
      const command={type:'craft',item:arg as ItemId} as const;
      if(online)network.action(command);else handle(model.dispatch(command));
      break;
    } break;
    case 'claim': if(started&&panel==='quests'){
      const command={type:'claim',id:arg} as const;
      if(online)network.action(command);else handle(model.dispatch(command));
      break;
    } break;
    case 'trade-tab': if(panel==='shop'){trade=arg==='sell'?'sell':'buy';play('uiSelect');show(panel);}break;
    case 'trade': if(started&&panel==='shop'){
      const command={type:'trade',mode:trade,item:arg as ItemId} as const;
      if(online)network.action(command);else handle(model.dispatch(command));
      break;
    } break;
    case 'next-line': line=(line+1)%locale.lines.length;play('talk');show('dialogue');break;
    case 'sleep': {
      if(!started||panel!=='sleep')break;
      if(online){network.action({type:'sleep'});break;}
      const result=model.dispatch({type:'sleep'});
      summary=result.summary??null;
      handle(result);
      show('summary');
      break;
    }
    case 'save': ui.toast(saveNow()?locale.text.farmSaved:locale.text.storageUnavailable);break;
    case 'title':
      if(!online&&!saveNow()){ui.toast(locale.text.storageUnavailable);break;}
      returnToTitle();
      break;
  }
}

app.addEventListener('click', event=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if(button&&!button.disabled)action(button.dataset.action!);
});
app.addEventListener('submit',event=>{
  const form=event.target as HTMLFormElement;
  if(form.id==='join-form'){
    event.preventDefault();
    if(joining)return;
    const fields=new FormData(form);
    joinDraft={address:String(fields.get('address')).trim(),code:cleanCode(String(fields.get('code'))),name:String(fields.get('name')).trim()};
    if(!validCode(joinDraft.code) || !joinDraft.name) {connectionNote='invalidRoom';show('online');return;}
    try {
      network.connect({...joinDraft,outfit:save?.character.outfit??0});
      joining=true;
      connectionNote='connecting';
    } catch {connectionNote='invalidRoom';}
    show('online');
    return;
  }
  if(form.id!=='character-form')return;
  event.preventDefault();
  const data=new FormData(form), name=String(data.get('name')).trim(), farm=String(data.get('farm')).trim();
  if(!name||!farm){ui.toast(locale.text.enterNames);return;}
  begin(newFarm({name,farm,outfit}));
});
app.addEventListener('input', event=>{
  const input=event.target as HTMLInputElement;
  if(input.id==='volume'){
    options.volume=Number(input.value)/100;
    setVolume(options.volume);
    document.querySelector('#volume-label')!.textContent=`${input.value}%`;
  }else if(input.id==='motion'){
    options.reducedMotion=input.checked;
    document.documentElement.classList.toggle('reduce-motion',options.reducedMotion);
  }else return;
  storeOptions(options);
});
app.addEventListener('change', event=>{
  const input=event.target;
  if(input instanceof HTMLInputElement && input.id==='volume'){play('uiSelect');return;}
  if(!(input instanceof HTMLSelectElement) || input.id!=='language' || panel!=='settings'
    || !isLanguage(input.value) || input.value===options.language)return;
  options.language=input.value;
  storeOptions(options);
  locale=createLocale(options.language);
  ui.setLocale(locale);
  ui.main(!started,!!save);
  updateUI();
  scene.updateLandmarkLabels();
  show('settings');
  app.querySelector<HTMLSelectElement>('#language')?.focus();
});
touchMedia.addEventListener('change',()=>{
  pad.reset();
  updateUI();
  if(panel==='tutorial')show(panel);
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
window.addEventListener('blur',()=>network.move(0,0));
window.addEventListener('pagehide',()=>{saveNow();network.disconnect();});
window.addEventListener('pageshow',event=>{if(event.persisted&&online)onDisconnect();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){saveNow();network.move(0,0);}});
updateUI();
