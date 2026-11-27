import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Direction, Point } from '../src/Components/position.ts';
import { DAY_START, HOME, MAX_ENERGY } from '../src/Config/game.ts';
import { DEFAULT_CHARACTER, emptyTotals, newFarm } from '../src/Core/state.ts';
import type { Farm } from '../src/Core/state.ts';
import { has } from '../src/Inventory/bag.ts';
import { CAPACITY } from '../src/Network/protocol.ts';
import type { CastPacket, ClientPacket, Peer, RoomError, ServerPacket, Vote } from '../src/Network/protocol.ts';
import { advance } from '../src/Systems/clock.ts';
import { Gameplay } from '../src/Systems/gameplay.ts';
import type { Result } from '../src/Systems/gameplay.ts';

type Land = Pick<Farm,'day'|'minutes'|'plots'|'resources'|'fences'>;
const shared = ({day,minutes,plots,resources,fences}: Farm): Land => ({day,minutes,plots,resources,fences});
type Profile = {
  id: string; token: string; privateFarm: Omit<Farm,keyof Land>; direction: Direction;
};
export type RoomSave = { version: 1; code: string; land: Land; profiles: Profile[] };
type Connection = {
  id: string; direction: Direction; game: Gameplay; input: Point; lastInput: number; lastAction: number;
  send: (message: ServerPacket) => void; kick: () => void;
};
type Join = Extract<ClientPacket,{type:'join'}>;
const distance = (a: Point,b: Point) => Math.hypot(a.x-b.x,a.y-b.y);
const redraw = new Set(['till','plant','water','harvest','fell','breakRock','build','liftFence','sleep']);

function getProfile(farm: Farm,id: string,token: string,direction: Direction): Profile {
  const {day,minutes,plots,resources,fences,...privateFarm}=farm;
  return { id, token, privateFarm, direction };
}

export class GameRoom {
  private land: Land;
  private readonly profiles = new Map<string,Profile>();
  private readonly sessions = new Map<string,Connection>();
  private readonly votes = new Set<string>();
  readonly code: string;
  dirty = true;

  constructor(saved?: RoomSave) {
    this.code = saved?.code ?? randomBytes(7).toString('hex').toUpperCase();
    this.land = saved?.land ?? shared(newFarm(DEFAULT_CHARACTER));
    for (const profile of saved?.profiles ?? []) this.profiles.set(profile.id,profile);
  }

  snapshot(): RoomSave {
    for (const session of this.sessions.values()) this.updateProfile(session);
    return { version:1, code:this.code, land:this.land, profiles:[...this.profiles.values()] };
  }

  private updateProfile(session: Connection) {
    const old=this.profiles.get(session.id)!;
    this.profiles.set(session.id,getProfile(session.game.farm,old.id,old.token,session.direction));
  }
  private voteFor(session: Connection): Vote {
    return { ready:this.votes.size,total:this.sessions.size,mine:this.votes.has(session.id) };
  }
  private peersFor(session: Connection): Peer[] {
    return [...this.sessions.values()].filter(other=>other!==session).map(other=>({
      id:other.id,name:other.game.farm.character.name,outfit:other.game.farm.character.outfit,
      position:other.game.farm.position,direction:other.direction,
    }));
  }
  private castFor(session: Connection,now: number): CastPacket | null {
    const cast=session.game.cast;
    return cast ? {target:cast.target,biteIn:cast.until-now,expiresIn:cast.expires-now} : null;
  }

  join(request: Join, send: Connection['send'], kick: Connection['kick']): Connection | RoomError {
    if (request.code.length!==this.code.length || !timingSafeEqual(Buffer.from(request.code),Buffer.from(this.code))) return 'invalidCode';
    let profile=[...this.profiles.values()].find(entry=>entry.token===request.token);
    const old=profile ? this.sessions.get(profile.id) : undefined;
    if (this.sessions.size>=CAPACITY && !old) return 'roomFull';
    if (old) {
      this.updateProfile(old);
      profile=this.profiles.get(old.id)!;
      this.sessions.delete(old.id);
      this.votes.delete(old.id);
      old.kick();
    }
    if (!profile) {
      const character={...DEFAULT_CHARACTER,name:request.name.trim(),outfit:request.outfit};
      profile=getProfile(newFarm(character),randomUUID(),randomBytes(24).toString('hex'),'down');
      this.profiles.set(profile.id,profile);
    }
    const farm={...profile.privateFarm,...this.land};
    const game=new Gameplay(farm);
    if (game.solid(Math.round(farm.position.x),Math.round(farm.position.y))) farm.position={...HOME};
    const session: Connection={id:profile.id,game,direction:profile.direction,input:{x:0,y:0},lastInput:-Infinity,lastAction:-Infinity,send,kick};
    this.sessions.set(session.id,session);
    this.dirty=true;
    send({type:'ready',token:profile.token,farm,peers:this.peersFor(session),vote:this.voteFor(session)});
    return session;
  }

  leave(session: Connection,now: number) {
    if (this.sessions.get(session.id)!==session) return;
    this.updateProfile(session);
    this.sessions.delete(session.id);
    this.votes.delete(session.id);
    this.dirty=true;
    this.beginDayIfReady(now);
  }

  private sync(now: number,rebuild: boolean) {
    for (const session of this.sessions.values()) {
      Object.assign(session.game.farm,this.land);
      session.send({type:'sync',farm:session.game.farm,cast:this.castFor(session,now),redraw:rebuild});
    }
  }
  private event(session: Connection,result: Result,target?: Point) {
    session.send({type:'event',result,target});
    if (target && result.effect) {
      for (const other of this.sessions.values()) {
        if (other===session) continue;
        const publicNotice=typeof result.notice==='object' ? result.notice : undefined;
        other.send({type:'event',result:{effect:result.effect,notice:publicNotice},target,origin:session.game.farm.position});
      }
    }
  }

  private beginDayIfReady(now: number) {
    if (!this.sessions.size || this.votes.size!==this.sessions.size) return;
    const first=this.sessions.values().next().value!;
    const totals=first.game.dispatch({type:'sleep'}).summary!;
    this.land=shared(first.game.farm);
    this.land.minutes=DAY_START;
    this.votes.clear();
    for (const session of this.sessions.values()) {
      const farm=session.game.farm;
      const summary=session===first ? totals : farm.totals;
      farm.totals=emptyTotals();
      farm.energy=MAX_ENERGY;
      farm.water=12;
      farm.position={...HOME};
      session.input={x:0,y:0};
      session.game.cast=null;
      this.event(session,{effect:'sleep',summary});
    }
    this.dirty=true;
    this.sync(now,true);
  }

  receive(session: Connection,message: ClientPacket,now: number) {
    if (this.sessions.get(session.id)!==session) return;
    const {game}=session;
    if (message.type==='join') return;
    if (message.type==='move') {
      session.input={x:message.x,y:message.y};
      session.lastInput=now;
      return;
    }
    if (now-session.lastAction<85) return;
    session.lastAction=now;
    Object.assign(game.farm,this.land);
    if (message.type==='equip') {
      if (!has(game.farm.bag,message.item)) return;
      game.farm.belt[message.slot]=message.item;
      this.dirty=true;
      session.send({type:'sync',farm:game.farm,cast:this.castFor(session,now),redraw:false});
      return;
    }
    if (message.type==='sleep') {
      if (game.interact().panel!=='sleep') return session.send({type:'error',code:'invalidCommand'});
      this.votes.add(session.id);
      this.beginDayIfReady(now);
      return;
    }
    if (message.type==='trade') {
      const near=game.interact().panel;
      if (near!=='shop' && near!=='dialogue') return session.send({type:'error',code:'invalidCommand'});
    }
    const target=message.type==='use' ? (message.item==='rod' ? game.cast?.target : undefined) ?? message.target : undefined;
    const result=message.type==='use' ? game.dispatch({...message,at:now}) : game.dispatch(message);
    this.event(session,result,target);
    if (result.changed || result.effect==='escape') {
      this.land=shared(game.farm);
      this.dirty=true;
      this.sync(now,!!result.effect && redraw.has(result.effect));
    }
  }

  tick(elapsed: number,now: number) {
    if (!this.sessions.size) return;
    this.land.minutes=advance(this.land.minutes,elapsed);
    this.dirty=true;
    for (const session of this.sessions.values()) {
      const {game}=session;
      Object.assign(game.farm,this.land);
      if (now-session.lastInput>750) session.input={x:0,y:0};
      const {x,y}=session.input;
      if (x || y) {
        session.direction=y>0?'down':y<0?'up':x>0?'right':'left';
        const speed=elapsed*.0044/(x&&y?Math.SQRT2:1);
        const cast=game.cast;
        if (game.move(x*speed,y*speed) && cast) {
          session.send({type:'event',result:{notice:'castCancelled'}});
          session.send({type:'sync',farm:game.farm,cast:null,redraw:false});
        }
        if (this.votes.has(session.id) && distance(game.farm.position,HOME)>1.4) this.votes.delete(session.id);
      }
      if (game.cast && now>game.cast.expires) {
        const target=game.cast.target;
        game.cast=null;
        this.event(session,{notice:'fishEscaped',effect:'escape'},target);
        session.send({type:'sync',farm:game.farm,cast:null,redraw:false});
      }
    }
    for (const session of this.sessions.values())
      session.send({type:'motion',position:session.game.farm.position,minutes:this.land.minutes,peers:this.peersFor(session),vote:this.voteFor(session)});
  }
}
