import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CHARACTER, newFarm } from '../src/Core/state.ts';
import { HOME } from '../src/Config/game.ts';
import { Gameplay } from '../src/Systems/gameplay.ts';
import { water, SHOP, NPC_SPOT } from '../src/World/map.ts';
import { readFarm, readOptions, storeFarm, storeOptions } from '../src/Save/storage.ts';
import { createLocale } from '../src/UI/locale.ts';

const fresh = () => new Gameplay(newFarm(DEFAULT_CHARACTER));
const use = (game, item, x, y, at = 0) => game.dispatch({ type:'use', item, target:{x,y}, at });
const sleep = game => game.dispatch({type:'sleep'});
const moveTo = (game,x,y) => {game.farm.position={x,y};};

test('till, sow, water twice, harvest three turnips, claim quest, sell and buy', () => {
  const game=fresh();
  const tiles=[14,15,16];
  for(const x of tiles){
    moveTo(game,x,14);
    assert.equal(use(game,'hoe',x,13).changed,true);
    assert.equal(use(game,'turnipSeed',x,13).changed,true);
    assert.equal(use(game,'can',x,13).changed,true);
  }
  assert.equal(game.farm.bag.turnipSeed,3);
  assert.equal(game.farm.energy,91);
  assert.deepEqual(sleep(game).summary,{earned:0,spent:0,harvested:0,gathered:0});
  assert.deepEqual(game.farm.position,HOME);
  assert.equal(game.farm.day,2);
  assert.equal(game.farm.energy,100);
  for(const x of tiles){
    moveTo(game,x,14);
    assert.equal(use(game,null,x,13).changed,undefined);
    assert.equal(use(game,'can',x,13).changed,true);
  }
  sleep(game);
  for(const x of tiles){
    moveTo(game,x,14);
    assert.equal(use(game,null,x,13).changed,true);
  }
  assert.equal(game.farm.bag.turnip,3);
  assert.equal(game.dispatch({type:'claim',id:'first'}).changed,true);
  assert.equal(game.dispatch({type:'claim',id:'first'}).changed,undefined);
  moveTo(game,SHOP.x,SHOP.y);
  assert.equal(game.interact().panel,'shop');
  assert.equal(game.dispatch({type:'trade',mode:'sell',item:'turnip'}).changed,true);
  assert.equal(game.dispatch({type:'trade',mode:'buy',item:'turnipSeed'}).changed,true);
  assert.equal(game.farm.bag.turnip,2);
  assert.equal(game.farm.bag.turnipSeed,4);
  assert.equal(game.farm.coins,390);
  assert.deepEqual(sleep(game).summary,{earned:152,spent:12,harvested:3,gathered:0});
});

test('dry days do not grow crops and distant actions do not spend resources', () => {
  const game=fresh();
  assert.equal(use(game,'hoe',20,18).changed,undefined);
  assert.equal(game.farm.energy,100);
  moveTo(game,13,14);
  use(game,'hoe',13,13);
  use(game,'carrotSeed',13,13);
  sleep(game);
  assert.equal(game.farm.plots['13,13'].age,0);
  for(let i=0;i<3;i++){
    moveTo(game,13,14);
    assert.equal(use(game,'can',13,13).changed,true);
    sleep(game);
  }
  moveTo(game,13,14);
  assert.equal(use(game,null,13,13).changed,true);
  assert.equal(game.farm.bag.carrot,1);
});

test('collision, tree and rock gathering, crafting, fence placement and removal', () => {
  const game=fresh();
  game.move(0,-.7);
  assert.deepEqual(game.farm.position,HOME);
  moveTo(game,6,14);
  assert.equal(use(game,'pick',7,14).changed,true);
  assert.equal(use(game,'pick',7,14).changed,true);
  moveTo(game,6,15);
  assert.equal(use(game,'axe',6,16).changed,true);
  assert.equal(game.farm.bag.wood,3);
  assert.equal(game.farm.bag.stone,3);
  assert.equal(game.dispatch({type:'craft',item:'fence'}).changed,true);
  assert.equal(game.farm.bag.fence,2);
  assert.equal(use(game,'fence',6,16).changed,true);
  assert.equal(game.solid(6,16),true);
  assert.equal(use(game,'axe',6,16).changed,true);
  assert.equal(game.solid(6,16),false);
  assert.equal(game.farm.bag.fence,2);
});

test('fishing requires a bank, bite timing and an active cast', () => {
  const game=fresh();
  moveTo(game,23,17);
  assert.equal(water(25,17),true);
  assert.equal(use(game,'rod',25,17,0).changed,undefined);
  moveTo(game,24,17);
  assert.equal(use(game,'rod',25,17,100).changed,true);
  assert.equal(use(game,'rod',25,17,400).changed,undefined);
  assert.equal(use(game,'rod',25,17,1500).changed,true);
  assert.equal(game.farm.bag.fish,1);
  use(game,'rod',25,17,1700);
  assert.equal(use(game,'rod',25,17,6000).notice,'fishEscaped');
  assert.equal(game.farm.bag.fish,1);
  moveTo(game,NPC_SPOT.x,NPC_SPOT.y);
  assert.equal(game.interact().panel,'dialogue');
});

test('local storage round-trips progress and rejects corrupt data', () => {
  const backing = new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem:key=>backing.get(key)??null,setItem:(key,value)=>backing.set(key,value),
  }});
  const game=fresh();
  sleep(game);
  assert.equal(storeFarm(game.farm),true);
  assert.deepEqual(readFarm(),game.farm);
  backing.set('little-harvest-valley:v1','invalid');
  assert.equal(readFarm(),null);
});

test('language options migrate older settings and persist an explicit choice', () => {
  const settingsKey = 'little-harvest-valley:settings';
  const backing = new Map([[settingsKey,JSON.stringify({volume:0.3,reducedMotion:true})]]);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem:key=>backing.get(key)??null,setItem:(key,value)=>backing.set(key,value),
  }});
  assert.deepEqual(readOptions(),{volume:0.3,reducedMotion:true,language:'vi'});
  storeOptions({...readOptions(),language:'en'});
  assert.deepEqual(readOptions(),{volume:0.3,reducedMotion:true,language:'en'});
  backing.set(settingsKey,JSON.stringify({language:'fr'}));
  assert.equal(readOptions().language,'vi');
});

test('the same gameplay result can be shown in Vietnamese or English', () => {
  const game = fresh();
  const vi = createLocale('vi'), en = createLocale('en');
  const result = game.dispatch({type:'trade',mode:'buy',item:'turnipSeed'});
  assert.equal(vi.notice(result.notice),'Đã mua · Hạt củ cải');
  assert.equal(en.notice(result.notice),'Purchased · Turnip Seeds');
  assert.equal(vi.notice({kind:'claimed',quest:'first',reward:120}),'Vụ mùa đầu tiên · +120 G');
  assert.equal(vi.day(29).label,'Hạ 1');
  assert.equal(en.day(29).label,'Summer 1');
  assert.equal(vi.time(13 * 60 + 5),'13:05');
  assert.equal(en.time(13 * 60 + 5),'1:05 PM');
});
