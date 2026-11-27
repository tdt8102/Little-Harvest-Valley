import { HOME, DAY_START, MAX_ENERGY } from '../Config/game.ts';
import { key } from '../Components/position.ts';
import type { Point } from '../Components/position.ts';
import { emptyTotals } from '../Core/state.ts';
import type { Farm, Totals } from '../Core/state.ts';
import { PRICES, SALES } from '../Economy/market.ts';
import { CROPS, grow, ready } from '../Farming/crops.ts';
import { add, has } from '../Inventory/bag.ts';
import { ITEMS, RECIPES } from '../Items/catalog.ts';
import type { ItemId } from '../Items/catalog.ts';
import type { Command } from '../Network/commands.ts';
import { QUESTS } from '../Quests/quests.ts';
import { NPC_SPOT, SHOP, inPlot, terrainSolid, water, path } from '../World/map.ts';

export type Result = { message: string; changed?: boolean; sound?: 'hit' | 'success' | 'water' | 'coin'; panel?: 'sleep' | 'shop' | 'dialogue'; summary?: Totals };
type Cast = { until: number; expires: number; origin: Point };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (a: Point, b: Point, range = 1.55) => distance(a,b) <= range;
export class Gameplay {
  cast: Cast | null = null;
  readonly farm: Farm;
  constructor(farm: Farm) { this.farm = farm; }
  solid(x: number, y: number) {
    return terrainSolid(x,y) || this.farm.fences.includes(key(x,y)) || this.farm.resources.some(resource => resource.x === x && resource.y === y);
  }
  move(x: number, y: number) {
    const position = this.farm.position;
    const clear = (px: number, py: number) => [-0.24,0.24].every(dx => [-0.2,0.2].every(dy => !this.solid(Math.floor(px + dx + 0.5),Math.floor(py + dy + 0.5))));
    if (clear(position.x + x,position.y)) position.x += x;
    if (clear(position.x,position.y + y)) position.y += y;
    if (this.cast && !near(position,this.cast.origin,0.65)) { this.cast = null; return true; }
    return false;
  }
  dispatch(command: Command): Result {
    const farm = this.farm;
    switch (command.type) {
      case 'sleep': {
        const summary = { ...farm.totals };
        grow(farm.plots);
        farm.day++;
        farm.minutes = DAY_START;
        farm.energy = MAX_ENERGY;
        farm.water = 12;
        farm.position = { ...HOME };
        farm.totals = emptyTotals();
        this.cast = null;
        return { changed: true, message: '', summary, sound: 'success' };
      }
      case 'trade': {
        const { item, mode } = command;
        const rate = mode === 'buy' ? PRICES[item] : SALES[item];
        if (!rate) return { message: 'Mira does not trade that item.' };
        if (mode === 'buy' && farm.coins < rate) return { message: 'You need more gold.' };
        if (mode === 'sell' && !has(farm.bag,item)) return { message: 'Your bag is empty of that item.' };
        const buying = mode === 'buy';
        farm.coins += buying ? -rate : rate;
        farm.totals[buying ? 'spent' : 'earned'] += rate;
        add(farm.bag,item,buying ? 1 : -1);
        return { changed: true, message: `${buying ? 'Purchased' : 'Sold'} · ${ITEMS[item].name}`, sound: 'coin' };
      }
      case 'craft': {
        const recipe = RECIPES.find(entry => entry.id === command.item);
        if (!recipe) return { message: 'That recipe is unavailable.' };
        const ingredients = Object.entries(recipe.ingredients) as [ItemId, number][];
        if (!ingredients.every(([id,count]) => has(farm.bag,id,count))) return { message: 'Gather the required materials first.' };
        for (const [id,count] of ingredients) add(farm.bag,id,-count);
        this.gain(recipe.id,recipe.count);
        return { changed: true, message: `Crafted ${recipe.count} · ${ITEMS[recipe.id].name}`, sound: 'success' };
      }
      case 'claim': {
        const quest = QUESTS.find(entry => entry.id === command.id);
        if (!quest || farm.claimed.includes(command.id) || !has(farm.progress,quest.item,quest.target)) return { message: 'Complete the quest before claiming its reward.' };
        farm.claimed.push(quest.id);
        farm.coins += quest.reward;
        farm.totals.earned += quest.reward;
        return { changed: true, message: `${quest.title} · +${quest.reward} G`, sound: 'coin' };
      }
      case 'use': return this.use(command.item,command.target,command.at);
    }
  }
  interact(): Result {
    const { position } = this.farm;
    if (near(position,HOME,1.4)) return { message: '', panel: 'sleep' };
    if (near(position,SHOP,1.6)) return { message: '', panel: 'shop' };
    if (near(position,NPC_SPOT,1.5)) return { message: '', panel: 'dialogue' };
    return { message: 'Walk up to the cottage, Mira, or the seed shop.' };
  }
  private gain(item: ItemId, count = 1) {
    add(this.farm.bag,item,count);
    add(this.farm.progress,item,count);
  }
  private use(item: ItemId | null, target: Point, at: number): Result {
    const farm = this.farm;
    if (item === 'snack' && has(farm.bag,item)) {
      if (farm.energy === MAX_ENERGY) return { message: 'Your energy is already full.' };
      farm.energy = Math.min(MAX_ENERGY,farm.energy + 30);
      add(farm.bag,item,-1);
      return { changed: true, message: '+30 energy up to your maximum', sound: 'success' };
    }
    if (item === 'rod' && this.cast) {
      if (at < this.cast.until) return { message: 'Wait for the bite before reeling in.' };
      const caught = at <= this.cast.expires;
      this.cast = null;
      if (!caught) return { message: 'The fish slipped away. Try another cast.' };
      this.gain('fish');
      farm.totals.gathered++;
      return { changed: true, message: 'Caught a Pond Perch!', sound: 'success' };
    }
    if (!near(farm.position,target,1.94)) return { message: 'Move a little closer.' };
    const { x,y } = target;
    const tile = key(x,y);
    const plot = farm.plots[tile];
    const resource = farm.resources.find(entry => entry.id === tile);
    const spend = (amount: number) => {
      if (farm.energy < amount) return false;
      farm.energy -= amount;
      return true;
    };
    const tired = { message: 'You are out of energy. Rest at the cottage.' };
    if (plot?.seed && ready(plot)) {
      const crop = CROPS[plot.seed].product;
      this.gain(crop);
      farm.totals.harvested++;
      farm.plots[tile] = { age: 0, watered: false };
      return { changed: true, message: `Harvested · ${ITEMS[crop].name}`, sound: 'success' };
    }
    if (!item || !has(farm.bag,item)) return { message: 'Select an available tool or seed.' };
    if (item === 'rod' && water(x,y)) {
      if (!spend(4)) return tired;
      this.cast = { until: at + 1300, expires: at + 3100, origin: { ...farm.position } };
      return { changed: true, message: 'Line cast. Wait for the bite!', sound: 'water' };
    }
    if (item === 'rod') return { message: 'Stand by the pond and aim at the water.' };
    if (item === 'can' && water(x,y)) {
      farm.water = 12;
      return { changed: true, message: 'Watering can refilled.', sound: 'water' };
    }
    if (resource && ((item === 'axe' && resource.kind !== 'rock') || (item === 'pick' && resource.kind === 'rock'))) {
      if (!spend(3)) return tired;
      resource.hits--;
      if (resource.hits > 0) return { changed: true, message: 'One more hit.', sound: 'hit' };
      const drop = resource.kind === 'rock' ? 'stone' : 'wood';
      farm.resources = farm.resources.filter(entry => entry !== resource);
      this.gain(drop,3);
      farm.totals.gathered += 3;
      return { changed: true, message: `+3 ${ITEMS[drop].name}`, sound: 'success' };
    }
    if (item === 'axe' && farm.fences.includes(tile)) {
      if (!spend(2)) return tired;
      farm.fences = farm.fences.filter(entry => entry !== tile);
      add(farm.bag,'fence',1);
      return { changed: true, message: 'Fence picked up.', sound: 'hit' };
    }
    if (item === 'fence') {
      if (this.solid(x,y) || plot || path(x,y) || near(farm.position,target,0.75)) return { message: 'Choose a free grass tile.' };
      farm.fences.push(tile);
      add(farm.bag,item,-1);
      return { changed: true, message: 'Fence placed.', sound: 'hit' };
    }
    if (item === 'hoe' && inPlot(x,y) && !plot && !this.solid(x,y)) {
      if (!spend(2)) return tired;
      farm.plots[tile] = { age: 0, watered: false };
      return { changed: true, message: 'Soil tilled.', sound: 'hit' };
    }
    if (item === 'turnipSeed' || item === 'carrotSeed') {
      if (!plot || plot.seed) return { message: 'Choose an empty tilled tile.' };
      plot.seed = item;
      add(farm.bag,item,-1);
      return { changed: true, message: 'Seed planted.', sound: 'success' };
    }
    if (item === 'can') {
      if (!plot || plot.watered) return { message: plot ? 'This soil is already watered.' : 'Aim at tilled soil or the pond.' };
      if (!farm.water) return { message: 'Refill at Willow Pond or rest overnight.' };
      if (!spend(1)) return tired;
      farm.water--;
      plot.watered = true;
      return { changed: true, message: 'Soil watered.', sound: 'water' };
    }
    return { message: item === 'hoe' ? 'Till a free square inside the farm plot.' : 'Choose a matching tool and target.' };
  }
}
