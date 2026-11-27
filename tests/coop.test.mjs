import test from 'node:test';
import assert from 'node:assert/strict';
import { GameRoom } from '../server/room.ts';
import { GAME_VERSION, parseClientPacket, socketAddress } from '../src/Network/protocol.ts';
import { HOME } from '../src/Config/game.ts';

function connect(room, name, token, code = room.code) {
  const messages=[];
  const session=room.join({type:'join',version:GAME_VERSION,code,name,outfit:0,token},
    packet=>messages.push(structuredClone(packet)),()=>{});
  return { session,messages,latest:type=>messages.findLast(packet=>packet.type===type) };
}
const command = (room,player,packet,at) => room.receive(player.session,packet,at);

test('two players share plots and day advancement, with private bags and profiles', () => {
  const room=new GameRoom();
  const robin=connect(room,'Robin'), minh=connect(room,'Minh');
  assert.equal(minh.latest('ready').peers[0].name,'Robin');
  robin.session.game.farm.position={x:12,y:11.25};
  minh.session.game.farm.position={x:12,y:11.25};
  const use=(player,item,time)=>command(room,player,{type:'use',item,target:{x:12,y:13}},time);
  use(robin,'hoe',100);
  assert.equal(minh.latest('sync').farm.plots['12,13'].age,0);
  use(minh,'turnipSeed',100);
  use(robin,'can',300);
  assert.equal(robin.latest('sync').farm.bag.turnipSeed,6);
  assert.equal(minh.latest('sync').farm.bag.turnipSeed,5);
  assert.equal(minh.latest('sync').farm.plots['12,13'].watered,true);
  const remote=minh.messages.find(packet=>packet.type==='event' && packet.origin);
  assert.equal(remote.result.effect,'till');

  robin.session.game.farm.position={...HOME};
  minh.session.game.farm.position={...HOME};
  command(room,robin,{type:'sleep'},500);
  room.tick(50,550);
  assert.deepEqual(robin.latest('motion').vote,{ready:1,total:2,mine:true});
  assert.equal(robin.latest('sync').farm.day,1);
  command(room,minh,{type:'sleep'},600);
  assert.equal(minh.latest('sync').farm.day,2);
  assert.equal(minh.latest('sync').farm.plots['12,13'].age,1);
  assert.equal(minh.latest('sync').farm.plots['12,13'].watered,false);
  assert.deepEqual(robin.latest('event').result.summary,{earned:0,spent:0,harvested:0,gathered:0});

  const saved=JSON.parse(JSON.stringify(room.snapshot()));
  const restarted=new GameRoom(saved);
  const returning=connect(restarted,'New name',minh.latest('ready').token);
  assert.equal(returning.latest('ready').farm.character.name,'Minh');
  assert.equal(returning.latest('ready').farm.bag.turnipSeed,5);
  assert.equal(returning.latest('ready').farm.day,2);
});

test('movement and requests are authorized by the host and the room is capped at four players', () => {
  const room=new GameRoom();
  assert.equal(connect(room,'Not invited',undefined,'F'.repeat(14)).session,'invalidCode');
  const first=connect(room,'First');
  const second=connect(room,'Second');
  connect(room,'Third');
  connect(room,'Fourth');
  assert.equal(connect(room,'Fifth').session,'roomFull');
  command(room,first,{type:'trade',mode:'buy',item:'turnipSeed'},100);
  assert.equal(first.latest('error').code,'invalidCommand');
  command(room,first,{type:'move',x:0,y:-1},200);
  for(let now=250;now<=950;now+=50)room.tick(50,now);
  assert.ok(first.latest('motion').position.y>=8.69);
  assert.equal(second.latest('motion').peers.find(peer=>peer.name==='First').direction,'up');
  room.leave(second.session,1000);
  assert.equal(typeof connect(room,'New fourth').session,'object');
});

test('internet links use secure WebSockets and invalid or oversized action fields are rejected', () => {
  assert.equal(socketAddress('https://example.com/'),'wss://example.com/co-op');
  assert.equal(socketAddress('http://127.0.0.1:8080/'),'ws://127.0.0.1:8080/co-op');
  assert.throws(()=>socketAddress('https://alice:secret@example.com'));
  for (const action of [
    {type:'move',x:9,y:0},
    {type:'use',item:'__proto__',target:{x:13,y:13}},
    {type:'use',item:null,target:{x:12.5,y:13}},
    {type:'use',item:null,target:{x:4096,y:13}},
    {type:'equip',slot:12,item:'hoe'},
  ]) assert.equal(parseClientPacket(JSON.stringify(action)),null);
});
