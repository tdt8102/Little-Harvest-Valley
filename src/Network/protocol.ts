import type { Direction, Point } from '../Components/position.ts';
import { WORLD } from '../Config/game.ts';
import type { Farm } from '../Core/state.ts';
import { ITEMS } from '../Items/catalog.ts';
import type { ItemId } from '../Items/catalog.ts';
import type { Result } from '../Systems/gameplay.ts';
import type { Command } from './commands.ts';

export const ROOM_PATH = '/co-op';
export const CAPACITY = 4;
export const GAME_VERSION = 1;
export type Peer = { id: string; name: string; outfit: number; position: Point; direction: Direction };
export type Vote = { ready: number; total: number; mine: boolean };
export type CastPacket = { target: Point; biteIn: number; expiresIn: number };
export type RoomError = 'invalidCode' | 'roomFull' | 'connectionError' | 'invalidCommand' | 'roomEnded';
type Join = { type: 'join'; version: number; code: string; name: string; outfit: number; token?: string };
type Use = { type: 'use'; item: ItemId | null; target: Point };
type Equip = { type: 'equip'; slot: number; item: ItemId };
export type RoomCommand = Exclude<Command, { type: 'use' }> | Use | Equip;
export type ClientPacket = Join | { type: 'move'; x: number; y: number } | RoomCommand;
export type ServerPacket =
  | { type: 'ready'; token: string; farm: Farm; peers: Peer[]; vote: Vote }
  | { type: 'sync'; farm: Farm; cast: CastPacket | null; redraw: boolean }
  | { type: 'motion'; position: Point; minutes: number; peers: Peer[]; vote: Vote }
  | { type: 'event'; result: Result; target?: Point; origin?: Point }
  | { type: 'error'; code: RoomError };

export const cleanCode = (code: string) => code.trim().toUpperCase().replace(/-/g,'');
export const validCode = (code: string) => /^[A-F0-9]{14}$/.test(code);
const validItem = (value: unknown): value is ItemId => typeof value === 'string' && Object.hasOwn(ITEMS,value);
function tile(value: unknown): value is Point {
  if (!value || typeof value !== 'object') return false;
  const {x,y} = value as Point;
  return Number.isInteger(x) && Number.isInteger(y) && x>=0 && y>=0 && x<WORLD.width && y<WORLD.height;
}

export function parseClientPacket(raw: string): ClientPacket | null {
  try {
    const packet = JSON.parse(raw);
    if (!packet || typeof packet !== 'object') return null;
    switch (packet.type) {
      case 'join':
        return packet.version===GAME_VERSION && typeof packet.code==='string' && validCode(packet.code)
          && typeof packet.name==='string' && packet.name.trim().length>=1 && packet.name.length<=18
          && !/[\u0000-\u001f\u007f]/.test(packet.name) && Number.isInteger(packet.outfit) && packet.outfit>=0 && packet.outfit<4
          && (packet.token===undefined || typeof packet.token==='string' && /^[a-f0-9]{48}$/.test(packet.token)) ? packet : null;
      case 'move':
        return [-1,0,1].includes(packet.x) && [-1,0,1].includes(packet.y) ? packet : null;
      case 'use':
        return (packet.item===null || validItem(packet.item)) && tile(packet.target) ? packet : null;
      case 'equip':
        return Number.isInteger(packet.slot) && packet.slot>=0 && packet.slot<12 && validItem(packet.item) ? packet : null;
      case 'trade':
        return (packet.mode==='buy' || packet.mode==='sell') && validItem(packet.item) ? packet : null;
      case 'craft':
        return validItem(packet.item) ? packet : null;
      case 'claim':
        return typeof packet.id==='string' && packet.id.length<=12 ? packet : null;
      case 'sleep': return { type: 'sleep' };
      default: return null;
    }
  } catch { return null; }
}

export function socketAddress(input: string) {
  const url = new URL(input);
  if (!['https:','http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid host address');
  url.protocol = url.protocol==='https:' ? 'wss:' : 'ws:';
  url.pathname = ROOM_PATH;
  url.search = '';
  url.hash = '';
  return url.href;
}
