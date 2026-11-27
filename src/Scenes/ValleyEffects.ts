import Phaser from 'phaser';
import { paintIcon } from '../Assets/icons.ts';
import type { Point } from '../Components/position.ts';
import { TILE } from '../Config/game.ts';
import { ITEMS } from '../Items/catalog.ts';
import type { ItemId } from '../Items/catalog.ts';
import type { ActionEffect } from '../Systems/effects.ts';
import { hash } from '../World/map.ts';

type Shape = 'chip' | 'spark' | 'drop' | 'leaf';
type Burst = { colors: number[]; count: number; life: number; width: number; lift: number; shape: Shape };
const dust = { colors: [0xd0a06e, 0xa4744b, 0xf1c58a], count: 13, life: 560, width: 26, lift: 18, shape: 'chip' } satisfies Burst;
const spray = { colors: [0xa8dbce, 0x76bbc4, 0xe0f3d0], count: 11, life: 525, width: 19, lift: 16, shape: 'drop' } satisfies Burst;
const leaves = { colors: [0x7ca459, 0xa1b962, 0xd3c979], count: 15, life: 760, width: 30, lift: 26, shape: 'leaf' } satisfies Burst;
const sparks = { colors: [0xffd886, 0xffebbc, 0xd5a975], count: 10, life: 580, width: 19, lift: 21, shape: 'spark' } satisfies Burst;
const stone = { colors: [0x999a8d, 0xddd5ba, 0x747e73], count: 14, life: 600, width: 31, lift: 24, shape: 'chip' } satisfies Burst;

const impacts: Partial<Record<ActionEffect | 'bite', { burst: Burst; delay: number }>> = {
  till: { burst: dust, delay: 100 }, plant: { burst: { ...leaves, count: 8, width: 12, life: 470 }, delay: 90 },
  water: { burst: spray, delay: 245 }, refill: { burst: spray, delay: 130 }, harvest: { burst: leaves, delay: 65 },
  chop: { burst: leaves, delay: 90 }, fell: { burst: { ...leaves, count: 23, width: 47 }, delay: 140 },
  mine: { burst: stone, delay: 90 }, breakRock: { burst: { ...stone, count: 22 }, delay: 100 },
  build: { burst: dust, delay: 90 }, liftFence: { burst: dust, delay: 80 }, eat: { burst: sparks, delay: 175 },
  cast: { burst: spray, delay: 200 }, bite: { burst: spray, delay: 0 },
  catch: { burst: spray, delay: 0 }, escape: { burst: { ...spray, count: 6 }, delay: 0 },
  trade: { burst: sparks, delay: 45 }, craft: { burst: sparks, delay: 125 }, quest: { burst: { ...sparks, count: 17 }, delay: 30 },
};

const tools: Partial<Record<ActionEffect, ItemId>> = {
  till: 'hoe', water: 'can', refill: 'can', chop: 'axe', fell: 'axe', liftFence: 'axe',
  mine: 'pick', breakRock: 'pick', cast: 'rod', catch: 'rod', eat: 'snack',
};
type Particle = {
  x: number; y: number; born: number; life: number; vx: number; vy: number;
  lift: number; color: number; size: number; shape: Shape;
};
type Motion = { from: Point; to: Point; at: number; duration: number };
type Pop = { sprite: Phaser.GameObjects.Image; from: Point; to: Point; born: number; life: number; arc: number; roll: number };
type CastView = { until: number; target: Point };
export const tileCenter = (value: number) => value * TILE + TILE / 2;
const atTile = (p: Point): Point => ({ x: tileCenter(p.x), y: tileCenter(p.y) });
const lerp = Phaser.Math.Linear;

export class ValleyEffects {
  private readonly airborne: Phaser.GameObjects.Graphics;
  private readonly atmosphere: Phaser.GameObjects.Graphics;
  private readonly fishingLine: Phaser.GameObjects.Graphics;
  private readonly tool: Phaser.GameObjects.Image;
  private readonly daylight: Phaser.GameObjects.Rectangle;
  private particles: Particle[] = [];
  private pops: Pop[] = [];
  private circles: { point: Point; born: number; life: number; radius: number }[] = [];
  private streams: Motion[] = [];
  private swing: (Motion & { item: ItemId }) | null = null;
  private dawnAt = -Infinity;

  constructor(scene: Phaser.Scene) {
    for (const id of [...Object.keys(ITEMS), 'gold']) {
      const texture = scene.textures.createCanvas('fx-' + id, 13, 13)!;
      paintIcon(texture.getCanvas(), id);
      texture.refresh().setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.atmosphere = scene.add.graphics().setDepth(820);
    this.fishingLine = scene.add.graphics().setDepth(1240);
    this.airborne = scene.add.graphics().setDepth(1350);
    this.tool = scene.add.image(0, 0, 'fx-hoe').setOrigin(.24, .76).setVisible(false);
    this.daylight = scene.add.rectangle(0, 0, 1, 1, 0xffd390, 0).setDepth(5100);
  }

  reset() {
    this.particles = [];
    this.circles = [];
    this.streams = [];
    this.pops.forEach(pop => pop.sprite.destroy());
    this.pops = [];
    this.dawnAt = -Infinity;
    this.swing = null;
    this.tool.setVisible(false);
    this.airborne.clear();
    this.fishingLine.clear();
  }

  private scatter(point: Point, burst: Burst, now: number) {
    for (let i = 0; i < burst.count; i++) {
      const theta = (i / burst.count + Math.random() * .14) * Math.PI * 2;
      const range = (.35 + Math.random() * .65) * burst.width;
      this.particles.push({
        x: point.x, y: point.y, born: now + (i % 4) * 19, life: burst.life * (.76 + Math.random() * .32),
        vx: Math.cos(theta) * range, vy: Math.sin(theta) * range * .43,
        lift: burst.lift * (.38 + Math.random() * .62), color: burst.colors[i % burst.colors.length],
        size: 2 + i % 3, shape: burst.shape,
      });
    }
    if (this.particles.length > 240) this.particles.splice(0, this.particles.length - 240);
  }

  step(position: Point, dirt: boolean, foot: number, now: number) {
    const point = atTile(position);
    this.scatter({ x: point.x + foot * 4, y: point.y + 6 },
      dirt ? { ...dust, count: 4, width: 10, lift: 5, life: 310 } : { ...leaves, count: 3, width: 8, lift: 5, life: 320 }, now);
  }

  action(scene: Phaser.Scene, effect: ActionEffect | 'bite', position: Point, target: Point, now: number, item?: ItemId,
    resource?: Phaser.GameObjects.Image, remote = false) {
    const origin = atTile(position);
    const dest = atTile(target);
    const hand = { x: origin.x, y: origin.y - 7 };
    const impact = impacts[effect];
    if (impact) this.scatter(dest, impact.burst, now + impact.delay);
    const tool = effect !== 'bite' ? tools[effect] : undefined;
    if (tool && !remote) this.swing = { from: hand, to: dest, at: now, duration: effect === 'water' ? 520 : 310, item: tool };
    if (effect === 'water') this.streams.push({ from: hand, to: dest, at: now + 90, duration: 450 });
    if (effect === 'cast' || effect === 'catch' || effect === 'bite' || effect === 'escape' || effect === 'refill')
      this.circles.push({ point: dest, born: now + (impact?.delay ?? 0), life: 610, radius: effect === 'bite' ? 24 : 16 });
    if (effect === 'sleep') this.dawnAt = now;
    if (effect === 'chop' || effect === 'mine') {
      if (resource) {
        scene.tweens.killTweensOf(resource);
        resource.x = dest.x;
        scene.tweens.add({ targets: resource, x: dest.x + 3, delay: 78, duration: 45, yoyo: true, repeat: 1 });
      }
    }
    if (effect === 'fell' && resource && resource.texture.key.startsWith('tree-')) {
      const sprite = scene.add.image(resource.x, resource.y, resource.texture.key).setOrigin(.5, .91)
        .setScale(resource.scaleX).setDepth(resource.depth);
      const side = origin.x > dest.x ? -1 : 1;
      this.pops.push({ sprite, from: { x: resource.x, y: resource.y }, to: { x: dest.x + side * 14, y: resource.y + 2 },
        born: now + 65, life: 540, arc: 0, roll: side * 1.36 });
    }
    const reward = effect === 'quest' || effect === 'trade' ? 'gold' : item;
    if (reward) {
      const point = { x: dest.x, y: dest.y - 4 };
      const sprite = scene.add.image(point.x, point.y, 'fx-' + reward).setScale(1.42).setDepth(1380).setVisible(false);
      const end = effect === 'catch' ? { x: hand.x, y: hand.y - 18 } : { x: point.x, y: point.y - 29 };
      this.pops.push({ sprite, from: point, to: end, born: now + 100, life: 760, arc: effect === 'catch' ? 26 : 10, roll: 0 });
    }
    if (this.pops.length > 32) this.pops.splice(0, this.pops.length - 32).forEach(pop => pop.sprite.destroy());
  }

  private drawParticles(now: number) {
    const g = this.airborne;
    this.particles = this.particles.filter(p => now < p.born + p.life);
    for (const p of this.particles) {
      const age = (now - p.born) / p.life;
      if (age < 0) continue;
      const travel = 1 - (1 - age) ** 2;
      const lift = Math.sin(age * Math.PI) * p.lift;
      const x = Math.round(p.x + p.vx * travel), y = Math.round(p.y + p.vy * travel - lift);
      const alpha = Math.min(1, (1 - age) * 2.7) * .93;
      g.fillStyle(p.color, alpha);
      if (p.shape === 'spark') {
        g.fillRect(x - 2, y, 5, 1);
        g.fillRect(x, y - 2, 1, 5);
        g.fillStyle(0xfff5d8, alpha);
        g.fillRect(x, y, 1, 1);
      } else if (p.shape === 'drop') {
        g.fillRect(x, y, 2, p.size + 1);
        g.fillStyle(0xe4f5cd, alpha);
        g.fillRect(x, y, 1, 1);
      } else if (p.shape === 'leaf') {
        g.fillRect(x, y, p.size + 1, 2);
        g.fillRect(x + 1, y - 1, 2, 4);
      } else {
        g.fillRect(x, y, p.size, p.size - 1);
      }
    }
  }

  private drawAction(now: number) {
    this.drawParticles(now);
    const g = this.airborne;
    this.circles = this.circles.filter(ring => now < ring.born + ring.life);
    for (const ring of this.circles) {
      const age = (now - ring.born) / ring.life;
      if (age < 0) continue;
      g.lineStyle(1, 0xc4efce, (1 - age) * .77)
        .strokeEllipse(ring.point.x, ring.point.y, 3 + ring.radius * age * 2, 2 + ring.radius * age * .86);
    }
    this.streams = this.streams.filter(stream => now < stream.at + stream.duration);
    for (const stream of this.streams) {
      for (let i = 0; i < 12; i++) {
        const t = (now - stream.at - i * 21) / 210;
        if (t < 0 || t > 1) continue;
        const x = lerp(stream.from.x, stream.to.x, t) + (i % 4 - 1.5) * t * 4;
        const y = lerp(stream.from.y, stream.to.y, t) - Math.sin(Math.PI * t) * 16;
        g.fillStyle(i % 3 ? 0x91cfd1 : 0xd7f2da, .85).fillRect(Math.round(x), Math.round(y), 2, i % 3 ? 3 : 2);
      }
    }
    this.pops = this.pops.filter(pop => {
      const age = (now - pop.born) / pop.life;
      if (age >= 1) { pop.sprite.destroy(); return false; }
      if (age < 0) return true;
      const tween = pop.roll ? age * age : 1 - (1 - age) ** 2;
      pop.sprite.setVisible(true).setPosition(
        Math.round(lerp(pop.from.x, pop.to.x, tween)),
        Math.round(lerp(pop.from.y, pop.to.y, tween) - Math.sin(age * Math.PI) * pop.arc),
      ).setRotation(pop.roll * tween).setAlpha(Math.min(1, (1 - age) * 3.5));
      return true;
    });
    const swing = this.swing;
    if (!swing || now >= swing.at + swing.duration) {
      this.tool.setVisible(false);
      this.swing = null;
      return;
    }
    const t = Math.max(0, (now - swing.at) / swing.duration);
    const base = Math.atan2(swing.to.y - swing.from.y, swing.to.x - swing.from.x);
    const flip = Math.cos(base) < 0 ? -1 : 1;
    const reach = Math.sin(t * Math.PI) * 6 + 6;
    const sweep = swing.item === 'can' ? Math.sin(t * Math.PI) * .55 : lerp(-1.18, 1.06, t);
    this.tool.setTexture('fx-' + swing.item).setVisible(true).setDepth(1260).setScale(1.42)
      .setPosition(Math.round(swing.from.x + Math.cos(base) * reach), Math.round(swing.from.y + Math.sin(base) * reach))
      .setRotation(base + Math.PI / 4 + flip * sweep).setAlpha(Math.min(1, (1 - t) * 5));
  }

  private drawFishing(position: Point, cast: CastView | null, now: number, reduced: boolean) {
    const g = this.fishingLine;
    g.clear();
    if (!cast) return;
    const hand = atTile(position), float = atTile(cast.target);
    const ready = now >= cast.until;
    const landing = reduced ? 1 : Phaser.Math.Clamp((now - cast.until + 1300) / 205, 0, 1);
    const x = lerp(hand.x, float.x, landing), y = lerp(hand.y - 7, float.y, landing)
      - Math.sin(landing * Math.PI) * 20 + (reduced ? 0 : Math.sin(now / (ready ? 55 : 225)) * (ready ? 3 : 1));
    const startX = hand.x + Math.sign(float.x - hand.x) * 8, startY = hand.y - 11;
    g.lineStyle(1, 0xefe5b9, .7).beginPath().moveTo(startX, startY)
      .lineTo(lerp(startX, x, .58), lerp(startY, y, .58) - (landing < 1 ? 7 : 2)).lineTo(x, y).strokePath();
    g.fillStyle(0x703d39).fillRect(x - 2, y - 3, 5, 5);
    g.fillStyle(0xe97e5d).fillRect(x - 1, y - 2, 3, 2);
    g.fillStyle(0xffedcd).fillRect(x - 1, y, 3, 1);
    if (ready) {
      g.fillStyle(0x513925).fillRect(float.x - 4, float.y - 20, 9, 13);
      g.fillStyle(0xffda79).fillRect(float.x, float.y - 18, 2, 5).fillRect(float.x, float.y - 11, 2, 2);
    }
  }

  private drawAtmosphere(now: number, minute: number, reduced: boolean) {
    const g = this.atmosphere;
    g.clear();
    if (reduced) return;
    // Small chimney puffs disperse above the roof without covering the field.
    for (let i = 0; i < 6; i++) {
      const life = (now / 3700 + i / 6) % 1;
      const x = Math.round(tileCenter(12) + 41 + life * 20 + Math.sin(i + life * 4) * 3);
      const y = Math.round(tileCenter(5) - 10 - life * 38);
      const width = 3 + Math.round(life * 8);
      g.fillStyle(0xe0cfb5, Math.sin(life * Math.PI) * .34).fillRect(x - width / 2, y, width, 3)
        .fillRect(x - width / 2 + 2, y - 2, width - 2, 2);
    }
    const night = Phaser.Math.Clamp((minute - 1050) / 170, 0, 1);
    for (let i = 0; i < 23; i++) {
      const phase = (now / (4200 + i * 141) + hash(i, 31)) % 1;
      const x = Math.round(67 + hash(i * 5, 18) * 1100 + phase * 25);
      const y = Math.round(120 + hash(i, 11) * 620 + Math.sin(phase * Math.PI * 2 + i) * 15);
      const alpha = Math.sin(phase * Math.PI) ** 2 * (.4 + night * .45);
      g.fillStyle(night > .25 ? 0xffd687 : 0xecc981, alpha);
      g.fillRect(x, y, 2, 2);
      if (night > .25) g.fillStyle(0xffdc84, alpha * .28).fillRect(x - 2, y - 2, 6, 6);
    }
  }

  update(now: number, realTime: number, camera: Phaser.Cameras.Scene2D.Camera, position: Point,
    minute: number, cast: CastView | null, reduced: boolean) {
    if (reduced) this.reset();
    this.airborne.clear();
    this.drawAtmosphere(now, minute, reduced);
    this.drawFishing(position, cast, realTime, reduced);
    if (!reduced) this.drawAction(now);
    const alpha = Math.max(0, 1 - (now - this.dawnAt) / 1150) ** 2 * .23;
    this.daylight.setPosition(camera.midPoint.x, camera.midPoint.y)
      .setSize(camera.width / camera.zoom + 20, camera.height / camera.zoom + 20).setAlpha(alpha);
  }
}
