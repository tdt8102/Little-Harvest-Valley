import { icon } from '../Assets/icons.ts';
import { draw, personArt } from '../Assets/pixels.ts';
import { OUTFITS } from '../Entities/types.ts';
import { PRICES, SALES } from '../Economy/market.ts';
import { ready } from '../Farming/crops.ts';
import { BAR, has } from '../Inventory/bag.ts';
import { ITEMS, RECIPES } from '../Items/catalog.ts';
import type { ItemId } from '../Items/catalog.ts';
import { MIRA } from '../NPC/mira.ts';
import { QUESTS } from '../Quests/quests.ts';
import { date, timeLabel } from '../Systems/clock.ts';
import type { Farm, Totals } from '../Core/state.ts';
import type { Options } from '../Save/storage.ts';

export type Panel = 'create'|'replace'|'inventory'|'craft'|'quests'|'calendar'|'pause'|'settings'|'shop'|'dialogue'|'sleep'|'summary';
const slotKeys = ['1','2','3','4','5','6','7','8','9','0','[',']'];
const portraits = new Map<number,string>();
export function portrait(outfit: number) {
  if(!portraits.has(outfit)){
    const canvas=document.createElement('canvas');
    canvas.width=32;canvas.height=36;
    draw(canvas,ink=>personArt('down',0,outfit,ink));
    portraits.set(outfit,canvas.toDataURL());
  }
  return portraits.get(outfit)!;
}
export const escape = (value: string) => value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const button = (label: string, action: string, classes = '', disabled = false) =>
  `<button type="button" class="button ${classes}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
const gold = (amount: number) => `<span class="gold">${icon('gold')}${amount.toLocaleString('en-US')}<small>G</small></span>`;
const itemMark = (id: ItemId) => `<span class="item-mark">${icon(id)}</span>`;
const toolTip = (id: ItemId) => `<span class="tooltip" role="tooltip"><b>${ITEMS[id].name}</b><span>${ITEMS[id].kind} · ${ITEMS[id].note}</span></span>`;
const shortcut = (id: Panel, label: string, image: string, key: string) =>
  `<button type="button" data-action="panel:${id}" class="nav-item" aria-label="${label}">${icon(image)}<span>${label}</span><kbd>${key}</kbd></button>`;

export class Interface {
  private readonly mount: HTMLElement;
  private toastTimer = 0;
  private hudSnapshot = '';
  private previouslyFocused: HTMLElement | null = null;
  constructor(root: HTMLElement) {
    this.mount=root;
    root.innerHTML=`<div class="shell">
      <header class="top">
        <button type="button" class="brand" data-action="home" aria-label="Little Harvest Valley menu">
          <span class="brand-icon">${icon('leaf')}</span><span><strong>Little Harvest</strong><small>V A L L E Y</small></span>
        </button>
        <nav aria-label="Farm tools">${shortcut('inventory','Inventory','bag','I')}${shortcut('craft','Crafting','hammer','C')}${shortcut('quests','Journal','book','J')}${shortcut('calendar','Calendar','calendar','K')}</nav>
        <button type="button" class="pause-button" title="Pause menu (Esc)" data-action="panel:pause" aria-label="Pause menu">${icon('gear')}</button>
      </header>
      <main class="stage" aria-label="Little Harvest Valley farm">
        <div id="world"></div><div class="vignette"></div>
        <div class="loading" id="loading"><div class="load-mark">${icon('leaf')}</div><h2>Little Harvest Valley</h2><p>Preparing the valley…</p><div class="load-track"></div></div>
        <section class="hud" id="hud" aria-label="Farm status"></section>
        <section id="welcome" class="welcome wood" aria-label="Main menu" hidden></section>
        <aside class="side" aria-label="Farm journal">
          <section class="wood journal">
            <div class="panel-heading">${icon('book')}<h2>Field Journal</h2></div>
            <div class="journal-body" id="journal"></div>
          </section>
          <section class="wood places">
            <div class="panel-heading">${icon('pin')}<h2>Valley Map</h2></div>
            <div class="places-body">
              <div>${icon('home')}<span>Farm Cottage<small>Rest &amp; save</small></span></div>
              <div>${icon('shop')}<span>Mira’s Market<small>Buy &amp; sell</small></span></div>
              <div>${icon('water')}<span>Willow Pond<small>Fish &amp; refill</small></span></div>
            </div>
          </section>
        </aside>
        <div class="context" id="context" hidden></div><div class="toast" id="toast" role="status" hidden></div>
        <section class="belt" aria-label="Tool belt"><div class="belt-label"><span></span><b>TOOL BELT</b><span></span></div><div id="bar" class="hotbar wood"></div><div class="equipped" id="equipped"></div></section>
      </main>
      <footer class="footer"><span>${icon('leaf')}<b>LITTLE HARVEST VALLEY</b></span><div class="controls"><span><kbd>W A S D</kbd> Move</span><span><kbd>E</kbd> Interact</span><span><kbd>Click</kbd> / <kbd>Space</kbd> Use tool</span><span><kbd>Esc</kbd> Menu</span></div><span class="footer-right"><i></i> Local save</span></footer>
      <div id="overlay" class="overlay" hidden></div>
    </div>`;
  }
  private byId(id: string) { return this.mount.querySelector<HTMLElement>('#'+id)!; }
  ready() { this.byId('loading').hidden=true; }
  main(visible: boolean, hasSave: boolean) {
    const el=this.byId('welcome');el.hidden=!visible;
    if(!visible)return;
    el.innerHTML=`<div class="welcome-kicker">${icon('leaf')} YOUR FARM AWAITS</div><h1>Little Harvest<br><em>Valley</em></h1><p>A new season, a quiet valley, and a patch of land to call your own.</p><div class="welcome-actions">${hasSave?button('Continue','continue','primary'):''}${button('New Game','new',hasSave?'':'primary')}${button('Settings','panel:settings','quiet')}</div>`;
  }
  hud(farm: Farm) {
    const current=date(farm.day);
    const clock=timeLabel(Math.floor(farm.minutes/10)*10);
    const picture=portrait(farm.character.outfit);
    const html=`<div class="season-card wood"><span class="sun-mark">${icon(farm.minutes>=1140?'moon':'sun')}</span><div><b>${current.season} ${current.number}</b><span>${clock}</span></div><div class="hud-divider"></div><small>YEAR ${current.year}</small></div>
    <div class="player-card wood"><img class="portrait" src="${picture}" alt=""><div><b>${escape(farm.character.name)}</b><div class="meters"><span title="Energy">${icon('energy')}<span class="energy-track"><span style="width:${farm.energy}%"></span></span><small>${farm.energy}</small></span><span title="Watering can">${icon('water')}<small>${farm.water}/12</small></span></div></div></div>
    <div class="money-card wood">${gold(farm.coins)}</div>`;
    if(html!==this.hudSnapshot){this.hudSnapshot=html;this.byId('hud').innerHTML=html;}
  }
  journal(farm: Farm) {
    const quest=QUESTS.find(entry=>!farm.claimed.includes(entry.id));
    const progress=quest ? farm.progress[quest.item]??0 : 0;
    const plots=Object.values(farm.plots);
    const hint=quest?.id!=='first' ? '' : progress>=quest.target ? 'Your reward is ready to claim.'
      : !plots.length ? 'Till a square in the field with your hoe (1).'
      : !plots.some(plot=>plot.seed) ? 'Plant turnip seeds (6) in tilled soil.'
      : plots.some(ready) ? 'Click a ripe crop to harvest it.'
      : plots.some(plot=>plot.seed && !plot.watered) ? 'Water planted soil with your can (2).'
      : 'Rest at the cottage (E) to grow watered crops.';
    const node=this.byId('journal');
    const unclaimed=quest?`<h3>${quest.title}</h3><p>${quest.detail}</p><div class="quest-meter"><span><i style="width:${Math.min(100,progress/quest.target*100)}%"></i></span><b>${Math.min(quest.target,progress)} / ${quest.target}</b></div>${hint?`<p class="journal-hint">${hint}</p>`:''}`:'<h3>All caught up</h3><p>Every valley quest is complete.</p>';
    node.innerHTML=unclaimed+button('Open Journal','panel:quests','journal-button');
  }
  bar(farm: Farm, slots: typeof BAR, selected: number) {
    this.byId('bar').innerHTML=slots.map((id,i)=>{
      const count=id?farm.bag[id]??0:0;
      return `<button type="button" data-action="slot:${i}" class="slot ${i===selected?'active':''} ${count===0?'empty':''}" aria-pressed="${i===selected}" aria-label="Slot ${i+1}${id?' · '+ITEMS[id].name:''}"><kbd>${slotKeys[i]}</kbd>${id?icon(id):''}${count>0&&id&&ITEMS[id].kind!=='Tool'?`<b>${count}</b>`:''}${id?toolTip(id):''}</button>`;
    }).join('');
    const id=slots[selected];
    this.byId('equipped').textContent=id?ITEMS[id].name:'Empty slot';
  }
  context(message: string) {
    const node=this.byId('context');
    node.hidden=!message;
    if(message && node.textContent!==message)node.textContent=message;
  }
  toast(message: string) {
    if(!message)return;
    const node=this.byId('toast');
    node.replaceChildren(Object.assign(document.createElement('span'),{textContent:message}));
    node.hidden=false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer=window.setTimeout(()=>{node.hidden=true;},3000);
  }
  modal(panel: Panel|null, body = '', restoreFocus = true) {
    const overlay=this.byId('overlay');
    if(!panel){
      overlay.hidden=true;
      overlay.replaceChildren();
      if(restoreFocus && this.previouslyFocused?.isConnected)this.previouslyFocused.focus();
      this.previouslyFocused=null;
      return;
    }
    const heading={create:'Create Your Farmer',replace:'Start a New Farm?',inventory:'Inventory',craft:'Crafting',quests:'Quest Journal',calendar:'Valley Calendar',pause:'Game Menu',settings:'Settings',shop:'Mira’s Market',dialogue:'Mira',sleep:'Farm Cottage',summary:'Day Complete'}[panel];
    const graphic={create:'leaf',replace:'leaf',inventory:'bag',craft:'hammer',quests:'book',calendar:'calendar',pause:'gear',settings:'gear',shop:'shop',dialogue:'bell',sleep:'moon',summary:'sun'}[panel];
    const existing=overlay.querySelector<HTMLElement>('.modal');
    const samePanel=existing?.dataset.panel===panel;
    if(overlay.hidden)this.previouslyFocused=document.activeElement as HTMLElement|null;
    overlay.hidden=false;
    if(samePanel){
      const active=(document.activeElement as HTMLElement|null)?.dataset.action;
      existing.querySelector('.modal-body')!.innerHTML=body;
      if(active){
        const candidates=existing.querySelectorAll<HTMLElement>('[data-action]');
        [...candidates].find(node=>node.dataset.action===active)?.focus();
      }
      return;
    }
    overlay.innerHTML=`<section class="modal wood" role="dialog" aria-modal="true" aria-labelledby="dialog-heading" tabindex="-1" data-panel="${panel}">
      <header class="modal-heading">${icon(graphic)}<h2 id="dialog-heading">${heading}</h2><button type="button" class="close" data-action="close" aria-label="Close">×</button></header>
      <div class="modal-body">${body}</div></section>`;
    overlay.querySelector<HTMLElement>('[autofocus],.modal')?.focus();
  }
}
export function panelBody(panel: Panel, farm: Farm, options: Options, state: {
  selected: number; outfit: number; line: number; trade: string; summary: Totals|null; started: boolean;
}) {
  switch(panel) {
    case 'create': return `<form id="character-form" class="create-form">
      <div class="character-preview"><img id="character-portrait" src="${portrait(state.outfit)}" alt="Farmer preview"></div>
      <div class="fields"><label for="farmer-name">Farmer name</label><input id="farmer-name" name="name" value="Rowan" maxlength="18" required autofocus>
      <label for="farm-name">Farm name</label><input id="farm-name" name="farm" value="Honeybrook" maxlength="22" required>
      <label>Shirt color</label><div class="swatches">${OUTFITS.map((color,i)=>`<button type="button" class="swatch" style="--swatch:${color}" data-action="outfit:${i}" aria-label="${['Clay','Blue','Olive','Plum'][i]}" aria-pressed="${i===state.outfit}"></button>`).join('')}</div></div>
      <button class="button primary form-submit" type="submit">Begin Spring</button></form>`;
    case 'replace': return `<p>Starting a new farm will replace the current local save when you begin Spring.</p><div class="actions">${button('Cancel','close')}${button('Create New Farm','create','primary')}</div>`;
    case 'inventory': {
      const entries=(Object.keys(ITEMS) as ItemId[]).filter(id=>has(farm.bag,id));
      return `<p>Select an item to put it in tool belt slot ${state.selected+1}.</p><div class="inventory-grid">${entries.map(id=>`<button type="button" class="inventory-item" data-action="equip:${id}">${itemMark(id)}<span>${ITEMS[id].name}</span><b>${farm.bag[id]}</b>${toolTip(id)}</button>`).join('')}</div>`;
    }
    case 'craft': return `<p>Use materials from your inventory to craft on the farm.</p><div class="item-list">${RECIPES.map(recipe=>{
      const ingredients=Object.entries(recipe.ingredients) as [ItemId,number][];
      return `<article class="item-row">${itemMark(recipe.id)}<div><h3>${ITEMS[recipe.id].name} × ${recipe.count}</h3><p>${ingredients.map(([id,count])=>`${ITEMS[id].name} ${farm.bag[id]??0}/${count}`).join(' · ')}</p></div>${button('Craft',`craft:${recipe.id}`,'primary',!ingredients.every(([id,count])=>has(farm.bag,id,count)))}</article>`;
    }).join('')}</div>`;
    case 'quests': return `<div class="item-list">${QUESTS.map(quest=>{
      const progress=Math.min(quest.target,farm.progress[quest.item]??0), claimed=farm.claimed.includes(quest.id);
      return `<article class="item-row">${itemMark(quest.item)}<div><h3>${quest.title}</h3><p>${quest.detail}</p><small>${progress}/${quest.target} · ${quest.reward} G reward</small></div>${button(claimed?'Claimed':'Claim',`claim:${quest.id}`,'primary',claimed||progress<quest.target)}</article>`;
    }).join('')}</div>`;
    case 'calendar': {
      const current=date(farm.day);
      return `<div class="calendar-label"><h3>${current.season}</h3><span>Year ${current.year}</span></div><div class="calendar-grid">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=>`<small>${day}</small>`).join('')}${Array.from({length:28},(_,i)=>`<div ${i+1===current.number?'class="today" aria-current="date"':''}>${i+1}</div>`).join('')}</div>`;
    }
    case 'pause': return `<div class="menu-list">${button(state.started?'Resume':'Return to Main Menu','close','primary')}${state.started?button('Save Game','save'):''}${button('Settings','panel:settings')}${state.started?button('Save & Return to Title','title'):''}</div>`;
    case 'settings': return `<div class="settings"><label>Sound effects volume <output id="volume-label">${Math.round(options.volume*100)}%</output><input aria-label="Sound effects volume" type="range" id="volume" min="0" max="100" value="${Math.round(options.volume*100)}"></label><label class="toggle"><input type="checkbox" id="motion" ${options.reducedMotion?'checked':''}> Reduce motion</label></div><div class="actions">${button('Done','close','primary')}</div>`;
    case 'shop': {
      const buying=state.trade==='buy', items=Object.entries(buying?PRICES:SALES) as [ItemId,number][];
      return `<div class="shop-tabs">${button('Buy','trade-tab:buy',buying?'primary':'')}${button('Sell','trade-tab:sell',buying?'':'primary')}${gold(farm.coins)}</div><div class="item-list">${items.map(([id,rate])=>`<article class="item-row">${itemMark(id)}<div><h3>${ITEMS[id].name}</h3><p>${rate} G each · ${farm.bag[id]??0} in bag</p></div>${button(buying?'Buy 1':'Sell 1',`trade:${id}`,'primary',buying?farm.coins<rate:!has(farm.bag,id))}</article>`).join('')}</div>`;
    }
    case 'dialogue': return `<div class="dialogue"><img src="${portrait(3)}" alt="Mira"><div><h3>${MIRA.name}</h3><p>${MIRA.lines[state.line]}</p></div></div><div class="actions">${button('Market','panel:shop')}${button('Next','next-line','primary')}</div>`;
    case 'sleep': return `<p>Rest until morning. Watered crops grow overnight, your energy and watering can refill, and your farm is saved.</p><div class="actions">${button('Keep Farming','close')}${button('Sleep Until Morning','sleep','primary')}</div>`;
    case 'summary': {
      const totals=state.summary!;
      return `<p>${escape(farm.character.farm)} Farm · ${date(farm.day-1).season} ${date(farm.day-1).number}</p><dl class="summary"><div><dt>Gold earned</dt><dd>${totals.earned} G</dd></div><div><dt>Gold spent</dt><dd>${totals.spent} G</dd></div><div><dt>Crops harvested</dt><dd>${totals.harvested}</dd></div><div><dt>Resources gathered</dt><dd>${totals.gathered}</dd></div></dl><div class="actions">${button('Start the New Day','close','primary')}</div>`;
    }
  }
}
