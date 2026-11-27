import { icon, iconUrl } from '../Assets/icons.ts';
import { draw, personArt } from '../Assets/pixels.ts';
import { OUTFITS } from '../Entities/types.ts';
import { PRICES, SALES } from '../Economy/market.ts';
import { ready } from '../Farming/crops.ts';
import { BAR, has } from '../Inventory/bag.ts';
import { ITEMS, RECIPES } from '../Items/catalog.ts';
import type { ItemId } from '../Items/catalog.ts';
import { MIRA } from '../NPC/mira.ts';
import { QUESTS } from '../Quests/quests.ts';
import type { Locale } from './locale.ts';
import type { Farm, Totals } from '../Core/state.ts';
import type { Options } from '../Save/storage.ts';
import { tutorialPages } from './tutorial.ts';

export type Panel = 'create'|'replace'|'inventory'|'craft'|'quests'|'calendar'|'pause'|'settings'|'shop'|'dialogue'|'sleep'|'summary'|'tutorial'|'online';
export type JoinDraft = { address: string; code: string; name: string };
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
const gold = (amount: number, locale: Locale) => `<span class="gold">${icon('gold')}${locale.number.format(amount)}<small>G</small></span>`;
const itemMark = (id: ItemId) => `<span class="item-mark">${icon(id)}</span>`;
const toolTip = (id: ItemId, locale: Locale) => {
  const item=locale.item(id);
  return `<span class="tooltip" role="tooltip"><b>${item.name}</b><span>${item.kind} · ${item.note}</span></span>`;
};
const shortcut = (id: Panel, copy: keyof Locale['text'], image: string, key: string) =>
  `<button type="button" data-action="panel:${id}" class="nav-item" data-label="${copy}">${icon(image)}<span data-copy="${copy}"></span><kbd>${key}</kbd></button>`;

export class Interface {
  private readonly mount: HTMLElement;
  private toastTimer = 0;
  private hudSnapshot = '';
  private touch = false;
  private previouslyFocused: HTMLElement | null = null;
  constructor(root: HTMLElement, private locale: Locale) {
    this.mount=root;
    root.innerHTML=`<div class="shell">
      <header class="top">
        <button type="button" class="brand" data-action="home" data-label="brandMenu">
          <span class="brand-icon">${icon('leaf')}</span><span><strong>Little Harvest</strong><small>V A L L E Y</small></span>
        </button>
        <nav data-label="farmTools">${shortcut('inventory','inventory','bag','I')}${shortcut('craft','crafting','hammer','C')}${shortcut('quests','journal','book','J')}${shortcut('calendar','calendar','calendar','K')}</nav>
        <button type="button" class="pause-button" data-title="pauseShortcut" data-action="panel:pause" data-label="pauseMenu">${icon('gear')}</button>
      </header>
      <main class="stage" data-label="farmArea">
        <div id="world"></div><div class="vignette"></div>
        <div class="loading" id="loading"><div class="load-mark">${icon('leaf')}</div><h2>Little Harvest Valley</h2><p data-copy="loading"></p><div class="load-track"></div></div>
        <section class="hud" id="hud" data-label="farmStatus"></section>
        <section id="welcome" class="welcome wood" data-label="mainMenu" hidden></section>
        <aside class="side" data-label="fieldJournal">
          <section class="wood journal">
            <div class="panel-heading">${icon('book')}<h2 data-copy="fieldJournal"></h2></div>
            <div class="journal-body" id="journal"></div>
          </section>
          <section class="wood places">
            <div class="panel-heading">${icon('pin')}<h2 data-copy="valleyMap"></h2></div>
            <div class="places-body">
              <div>${icon('home')}<span><b data-copy="cottage"></b><small data-copy="restSave"></small></span></div>
              <div>${icon('shop')}<span><b data-copy="market"></b><small data-copy="buySell"></small></span></div>
              <div>${icon('water')}<span><b data-copy="pond"></b><small data-copy="fishRefill"></small></span></div>
            </div>
          </section>
        </aside>
        <div class="network-badge wood" id="network-badge" role="status" hidden></div>
        <div class="context" id="context" hidden></div><div class="toast" id="toast" role="status" hidden></div>
        <section class="touch-controls" id="touch-controls" data-label="touchControls" hidden>
          <div class="dpad" id="dpad" role="group" data-label="directionPad">
            <span class="dpad-key dpad-up"><i></i></span><span class="dpad-key dpad-left"><i></i></span>
            <span class="dpad-center"></span><span class="dpad-key dpad-right"><i></i></span><span class="dpad-key dpad-down"><i></i></span>
          </div>
          <div class="touch-actions">
            <button type="button" id="touch-interact" class="button" data-action="touch-interact">${icon('bell')}<span data-copy="interact"></span></button>
            <button type="button" class="button primary" data-action="touch-use">${icon('hoe')}<span data-copy="touchUse"></span></button>
          </div>
        </section>
        <section class="belt" data-label="toolBelt"><div class="belt-label"><span></span><b data-copy="toolBelt"></b><span></span></div><div id="bar" class="hotbar wood"></div><div class="equipped" id="equipped"></div></section>
      </main>
      <footer class="footer"><span>${icon('leaf')}<b>LITTLE HARVEST VALLEY</b></span><div class="controls"><span><kbd>W A S D</kbd> <small data-copy="move"></small></span><span><kbd>E</kbd> <small data-copy="interact"></small></span><span><kbd data-copy="click"></kbd> / <kbd data-copy="space"></kbd> <small data-copy="useTool"></small></span><span><kbd>Esc</kbd> <small data-copy="menu"></small></span></div><span class="footer-right"><i></i> <small data-copy="localSave"></small></span></footer>
      <div id="overlay" class="overlay" hidden></div>
    </div>`;
    this.setLocale(locale);
  }
  setLocale(locale: Locale) {
    this.locale=locale;
    document.documentElement.lang=locale.language;
    document.querySelector('meta[name="description"]')?.setAttribute('content',locale.text.pageDescription);
    this.mount.querySelectorAll<HTMLElement>('[data-copy], [data-label], [data-title]').forEach(node=>{
      const copy=locale.text[node.dataset.copy as keyof Locale['text']];
      const label=locale.text[node.dataset.label as keyof Locale['text']];
      const title=locale.text[node.dataset.title as keyof Locale['text']];
      if(typeof copy==='string')node.textContent=copy;
      if(typeof label==='string')node.setAttribute('aria-label',label);
      if(typeof title==='string')node.title=title;
    });
    this.byId('toast').hidden=true;
  }
  private byId(id: string) { return this.mount.querySelector<HTMLElement>('#'+id)!; }
  setTouch(touch: boolean, started: boolean) {
    this.touch=touch;
    this.mount.querySelector('.shell')!.classList.toggle('touch-layout',touch);
    this.byId('touch-controls').hidden=!touch || !started;
  }
  touchNearby(active: boolean) { this.byId('touch-interact').classList.toggle('nearby',active); }
  onlineStatus(message: string) {
    const badge=this.byId('network-badge');
    badge.hidden=!message;
    if(badge.textContent!==message)badge.textContent=message;
  }
  ready() { this.byId('loading').hidden=true; }
  main(visible: boolean, hasSave: boolean) {
    const el=this.byId('welcome');el.hidden=!visible;
    if(!visible)return;
    const t=this.locale.text;
    el.innerHTML=`<div class="welcome-kicker">${icon('leaf')} ${t.farmAwaits}</div><h1>Little Harvest<br><em>Valley</em></h1><p>${t.welcome}</p><div class="welcome-actions">${hasSave?button(t.continueGame,'continue','primary'):''}${button(t.newGame,'new',hasSave?'':'primary')}${button(t.coOp,'panel:online')}${button(t.tutorial,'panel:tutorial','quiet')}${button(t.settings,'panel:settings','quiet')}</div>`;
  }
  hud(farm: Farm) {
    const t=this.locale.text;
    const current=this.locale.day(farm.day);
    const clock=this.locale.time(Math.floor(farm.minutes/10)*10);
    const picture=portrait(farm.character.outfit);
    const html=`<div class="season-card wood"><span class="sun-mark">${icon(farm.minutes>=1140?'moon':'sun')}</span><div><b>${current.label}</b><span>${clock}</span></div><div class="hud-divider"></div><small>${t.year(current.year)}</small></div>
    <div class="player-card wood"><img class="portrait" src="${picture}" alt=""><div><b>${escape(farm.character.name)}</b><div class="meters"><span title="${t.energy}">${icon('energy')}<span class="energy-track"><span style="width:${farm.energy}%"></span></span><small>${farm.energy}</small></span><span title="${t.wateringCan}">${icon('water')}<small>${farm.water}/12</small></span></div></div></div>
    <div class="money-card wood">${gold(farm.coins,this.locale)}</div>`;
    if(html!==this.hudSnapshot){this.hudSnapshot=html;this.byId('hud').innerHTML=html;}
  }
  journal(farm: Farm) {
    const t=this.locale.text;
    const quest=QUESTS.find(entry=>!farm.claimed.includes(entry.id));
    const progress=quest ? farm.progress[quest.item]??0 : 0;
    const plots=Object.values(farm.plots);
    const hint=quest?.id!=='first' ? '' : progress>=quest.target ? t.rewardReady
      : !plots.length ? (this.touch?t.touchTillHint:t.tillHint)
      : !plots.some(plot=>plot.seed) ? (this.touch?t.touchSeedHint:t.seedHint)
      : plots.some(ready) ? t.harvestHint
      : plots.some(plot=>plot.seed && !plot.watered) ? (this.touch?t.touchWaterHint:t.waterHint)
      : (this.touch?t.touchSleepHint:t.sleepHint);
    const node=this.byId('journal');
    const unclaimed=quest?`<h3>${this.locale.quest(quest).title}</h3><p>${this.locale.quest(quest).detail}</p><div class="quest-meter"><span><i style="width:${Math.min(100,progress/quest.target*100)}%"></i></span><b>${Math.min(quest.target,progress)} / ${quest.target}</b></div>${hint?`<p class="journal-hint">${hint}</p>`:''}`:`<h3>${t.allCaughtUp}</h3><p>${t.allQuestsDone}</p>`;
    node.innerHTML=unclaimed+button(t.openJournal,'panel:quests','journal-button');
  }
  bar(farm: Farm, slots: typeof BAR, selected: number) {
    const t=this.locale.text;
    this.byId('bar').innerHTML=slots.map((id,i)=>{
      const count=id?farm.bag[id]??0:0;
      return `<button type="button" data-action="slot:${i}" class="slot ${i===selected?'active':''} ${count===0?'empty':''}" aria-pressed="${i===selected}" aria-label="${t.slot} ${i+1}${id?' · '+this.locale.item(id).name:''}"><kbd>${slotKeys[i]}</kbd>${id?icon(id):''}${count>0&&id&&ITEMS[id].kind!=='Tool'?`<b>${count}</b>`:''}${id?toolTip(id,this.locale):''}</button>`;
    }).join('');
    const id=slots[selected];
    this.byId('equipped').textContent=id?this.locale.item(id).name:t.emptySlot;
  }
  context(message: string) {
    const node=this.byId('context');
    node.hidden=!message;
    if(message && node.textContent!==message)node.textContent=message;
  }
  toast(message: string, image?: string) {
    if(!message)return;
    const node=this.byId('toast');
    const copy=document.createElement('span');
    if(image)copy.append(Object.assign(document.createElement('img'),{src:iconUrl(image),alt:'',className:'icon'}));
    copy.append(message);
    node.replaceChildren(copy);
    node.hidden=false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer=window.setTimeout(()=>{node.hidden=true;},3000);
  }
  modal(panel: Panel|null, body = '', restoreFocus = true) {
    const overlay=this.byId('overlay');
    if(!panel){
      overlay.hidden=true;
      overlay.replaceChildren();
      if(restoreFocus && this.previouslyFocused){
        const previous=this.previouslyFocused;
        const trigger=previous.isConnected ? previous : [...this.mount.querySelectorAll<HTMLElement>('[data-action]')]
          .find(node=>node.dataset.action===previous.dataset.action);
        trigger?.focus();
      }
      this.previouslyFocused=null;
      return;
    }
    const t=this.locale.text;
    const heading={create:t.createFarmer,replace:t.replaceFarm,inventory:t.inventory,craft:t.crafting,quests:t.questJournal,calendar:t.valleyCalendar,pause:t.gameMenu,settings:t.settings,shop:t.market,dialogue:MIRA.name,sleep:t.cottage,summary:t.dayComplete,tutorial:t.tutorial,online:t.coOp}[panel];
    const graphic={create:'leaf',replace:'leaf',inventory:'bag',craft:'hammer',quests:'book',calendar:'calendar',pause:'gear',settings:'gear',shop:'shop',dialogue:'bell',sleep:'moon',summary:'sun',tutorial:'book',online:'home'}[panel];
    const existing=overlay.querySelector<HTMLElement>('.modal');
    const samePanel=existing?.dataset.panel===panel;
    if(overlay.hidden)this.previouslyFocused=document.activeElement as HTMLElement|null;
    overlay.hidden=false;
    if(samePanel){
      const active=(document.activeElement as HTMLElement|null)?.dataset.action;
      existing.querySelector('#dialog-heading')!.textContent=heading;
      existing.querySelector('.close')!.setAttribute('aria-label',t.close);
      existing.querySelector('.modal-body')!.innerHTML=body;
      if(active){
        const candidates=existing.querySelectorAll<HTMLElement>('[data-action]');
        const control=[...candidates].find(node=>node.dataset.action===active);
        (control ?? (panel==='tutorial'?existing.querySelector<HTMLElement>('.guide-actions .primary'):null))?.focus();
      }
      return;
    }
    overlay.innerHTML=`<section class="modal wood" role="dialog" aria-modal="true" aria-labelledby="dialog-heading" tabindex="-1" data-panel="${panel}">
      <header class="modal-heading">${icon(graphic)}<h2 id="dialog-heading">${heading}</h2><button type="button" class="close" data-action="close" aria-label="${t.close}">×</button></header>
      <div class="modal-body">${body}</div></section>`;
    (overlay.querySelector<HTMLElement>('[autofocus]') ?? overlay.querySelector<HTMLElement>('.modal'))?.focus();
  }
}
export function panelBody(panel: Panel, farm: Farm, options: Options, locale: Locale, state: {
  selected: number; outfit: number; line: number; trade: string; summary: Totals|null; started: boolean;
  tutorialPage: number; touch: boolean; online: boolean; join: JoinDraft; joining: boolean; connectionNote: string;
  vote: { ready: number; total: number; mine: boolean } | null;
}) {
  const t=locale.text;
  switch(panel) {
    case 'create': return `<form id="character-form" class="create-form">
      <div class="character-preview"><img id="character-portrait" src="${portrait(state.outfit)}" alt="${t.farmerPreview}"></div>
      <div class="fields"><label for="farmer-name">${t.farmerName}</label><input id="farmer-name" name="name" value="Rowan" maxlength="18" required autofocus>
      <label for="farm-name">${t.farmName}</label><input id="farm-name" name="farm" value="Honeybrook" maxlength="22" required>
      <label>${t.shirtColor}</label><div class="swatches">${OUTFITS.map((color,i)=>`<button type="button" class="swatch" style="--swatch:${color}" data-action="outfit:${i}" aria-label="${t.outfits[i]}" aria-pressed="${i===state.outfit}"></button>`).join('')}</div></div>
      <button class="button primary form-submit" type="submit">${t.beginSpring}</button></form>`;
    case 'replace': return `<p>${t.replaceWarning}</p><div class="actions">${button(t.cancel,'close')}${button(t.createFarm,'create','primary')}</div>`;
    case 'inventory': {
      const entries=(Object.keys(ITEMS) as ItemId[]).filter(id=>has(farm.bag,id));
      return `<p>${t.equipHint(state.selected+1)}</p><div class="inventory-grid">${entries.map(id=>`<button type="button" class="inventory-item" data-action="equip:${id}">${itemMark(id)}<span>${locale.item(id).name}</span><b>${farm.bag[id]}</b>${toolTip(id,locale)}</button>`).join('')}</div>`;
    }
    case 'craft': return `<p>${t.craftingHint}</p><div class="item-list">${RECIPES.map(recipe=>{
      const ingredients=Object.entries(recipe.ingredients) as [ItemId,number][];
      return `<article class="item-row">${itemMark(recipe.id)}<div><h3>${locale.item(recipe.id).name} × ${recipe.count}</h3><p>${ingredients.map(([id,count])=>`${locale.item(id).name} ${farm.bag[id]??0}/${count}`).join(' · ')}</p></div>${button(t.craft,`craft:${recipe.id}`,'primary',!ingredients.every(([id,count])=>has(farm.bag,id,count)))}</article>`;
    }).join('')}</div>`;
    case 'quests': return `<div class="item-list">${QUESTS.map(quest=>{
      const progress=Math.min(quest.target,farm.progress[quest.item]??0), claimed=farm.claimed.includes(quest.id);
      return `<article class="item-row">${itemMark(quest.item)}<div><h3>${locale.quest(quest).title}</h3><p>${locale.quest(quest).detail}</p><small>${progress}/${quest.target} · ${t.reward(quest.reward)}</small></div>${button(claimed?t.claimed:t.claim,`claim:${quest.id}`,'primary',claimed||progress<quest.target)}</article>`;
    }).join('')}</div>`;
    case 'calendar': {
      const current=locale.day(farm.day);
      return `<div class="calendar-label"><h3>${current.season}</h3><span>${t.year(current.year)}</span></div><div class="calendar-grid">${t.weekdays.map(day=>`<small>${day}</small>`).join('')}${Array.from({length:28},(_,i)=>`<div ${i+1===current.number?'class="today" aria-current="date"':''}>${i+1}</div>`).join('')}</div>`;
    }
    case 'pause': return `<div class="menu-list">${button(state.started?t.resume:t.returnToMenu,'close','primary')}${state.started&&!state.online?button(t.saveGame,'save'):''}${button(t.tutorial,'panel:tutorial')}${button(t.settings,'panel:settings')}${state.started?button(state.online?t.leaveRoom:t.saveAndReturn,'title'):''}</div>`;
    case 'settings': return `<div class="settings"><label for="language">${t.language}</label><select id="language"><option value="vi" lang="vi" ${options.language==='vi'?'selected':''}>Tiếng Việt</option><option value="en" lang="en" ${options.language==='en'?'selected':''}>English</option></select><label>${t.soundVolume} <output id="volume-label">${Math.round(options.volume*100)}%</output><input aria-label="${t.soundVolume}" type="range" id="volume" min="0" max="100" value="${Math.round(options.volume*100)}"></label><label class="toggle"><input type="checkbox" id="motion" ${options.reducedMotion?'checked':''}> ${t.reduceMotion}</label></div><div class="actions">${button(t.done,'close','primary')}</div>`;
    case 'shop': {
      const buying=state.trade==='buy', items=Object.entries(buying?PRICES:SALES) as [ItemId,number][];
      return `<div class="shop-tabs">${button(t.buy,'trade-tab:buy',buying?'primary':'')}${button(t.sell,'trade-tab:sell',buying?'':'primary')}${gold(farm.coins,locale)}</div><div class="item-list">${items.map(([id,rate])=>`<article class="item-row">${itemMark(id)}<div><h3>${locale.item(id).name}</h3><p>${t.price(rate,farm.bag[id]??0)}</p></div>${button(buying?t.buyOne:t.sellOne,`trade:${id}`,'primary',buying?farm.coins<rate:!has(farm.bag,id))}</article>`).join('')}</div>`;
    }
    case 'dialogue': return `<div class="dialogue"><img src="${portrait(3)}" alt="Mira"><div><h3>${MIRA.name}</h3><p>${locale.lines[state.line]}</p></div></div><div class="actions">${button(t.marketButton,'panel:shop')}${button(t.next,'next-line','primary')}</div>`;
    case 'sleep': return `<p>${state.online?t.onlineSleepDescription:t.sleepDescription}</p>${state.vote?.ready?`<p class="join-note">${t.waitingForSleep(state.vote.ready,state.vote.total)}</p>`:''}<div class="actions">${button(t.keepFarming,'close')}${button(t.sleepUntilMorning,'sleep','primary',state.vote?.mine)}</div>`;
    case 'tutorial': {
      const pages=tutorialPages(locale.language,state.touch);
      const page=pages[state.tutorialPage];
      const last=state.tutorialPage===pages.length-1;
      return `<div class="guide"><div class="guide-heading"><h3>${page.title}</h3><span>${t.tutorialPage(state.tutorialPage+1,pages.length)}</span></div>
        <div class="guide-steps">${page.steps.map(([label,instruction,image])=>`<div class="guide-step">${image?`<span class="item-mark">${icon(image)}</span>`:''}<div><h4>${label}</h4><p>${instruction}</p></div></div>`).join('')}</div>
        <div class="guide-actions">${button(t.skipTutorial,'close','quiet')}${state.tutorialPage?button(t.previous,'tutorial-prev'):''}${button(last?t.finishTutorial:t.next,last?'close':'tutorial-next','primary')}</div></div>`;
    }
    case 'online': return `<p>${t.coOpHelp}</p><form id="join-form" class="join-form">
      <label for="join-address">${t.hostUrl}</label><input id="join-address" name="address" type="url" value="${escape(state.join.address)}" maxlength="240" autocomplete="url" required>
      <label for="join-code">${t.roomCode}</label><input id="join-code" name="code" value="${escape(state.join.code)}" maxlength="14" autocapitalize="characters" spellcheck="false" required>
      <label for="join-name">${t.farmerName}</label><input id="join-name" name="name" value="${escape(state.join.name)}" maxlength="18" required>
      <p class="join-note" role="status">${state.connectionNote}</p>
      <button type="submit" class="button primary" ${state.joining?'disabled':''}>${state.joining?t.connecting:state.online?t.reconnect:t.joinRoom}</button>
      </form>`;
    case 'summary': {
      const totals=state.summary!;
      return `<p>${t.farmTitle(escape(farm.character.farm))} · ${locale.day(farm.day-1).label}</p><dl class="summary"><div><dt>${t.goldEarned}</dt><dd>${totals.earned} G</dd></div><div><dt>${t.goldSpent}</dt><dd>${totals.spent} G</dd></div><div><dt>${t.cropsHarvested}</dt><dd>${totals.harvested}</dd></div><div><dt>${t.resourcesGathered}</dt><dd>${totals.gathered}</dd></div></dl><div class="actions">${button(t.startNextDay,'close','primary')}</div>`;
    }
  }
}
