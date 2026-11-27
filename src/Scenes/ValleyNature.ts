import Phaser from 'phaser';
import { draw } from '../Assets/pixels.ts';
import { WORLD, TILE } from '../Config/game.ts';
import { POND } from '../World/map.ts';
import { tileCenter } from './ValleyEffects.ts';

const TAU = Math.PI * 2;
const CLOUDS = [
  { phase: .18, speed: 11, lane: 327, scale: 1.24 },
  { phase: .60, speed: 9, lane: 514, scale: 1.38 },
  { phase: .86, speed: 13, lane: 245, scale: 1.05 },
];
const FISH = [
  { radiusX: 101, radiusY: 49, phase: .08, speed: 44, color: 0x2b635c, accent: 0x80ac8b },
  { radiusX: 71, radiusY: 53, phase: .37, speed: 38, color: 0x355d61, accent: 0x8baaa2 },
  { radiusX: 114, radiusY: 37, phase: .58, speed: 53, color: 0x365957, accent: 0x97ad87 },
  { radiusX: 53, radiusY: 30, phase: .78, speed: 31, color: 0x496a59, accent: 0xd0be86 },
];

/** Landscape motion stays decorative so every player can render it locally. */
export class ValleyNature {
  private readonly shadows: Phaser.GameObjects.Image[];
  private readonly fish: Phaser.GameObjects.Graphics;
  private readonly wakes: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    const texture=scene.textures.createCanvas('cloud-shadow',224,112)!;
    draw(texture.getCanvas(),({ellipse})=>{
      const lobes=[[12,40,108,54],[43,22,119,68],[90,17,92,66],[129,37,84,54]];
      for (const [x,y,w,h] of lobes) {
        for(let edge=0;edge<4;edge++){
          const margin=edge*4;
          ellipse(x+margin,y+margin,w-2*margin,h-2*margin,'#14291f11');
        }
      }
    });
    texture.refresh().setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.shadows=CLOUDS.map(cloud=>scene.add.image(0,0,'cloud-shadow').setDepth(5).setScale(cloud.scale));
    this.fish=scene.add.graphics().setDepth(5.2);
    this.wakes=scene.add.graphics().setDepth(6.2);
  }

  update(time: number, minutes: number, reduceMotion: boolean) {
    const sunrise=Phaser.Math.Clamp((minutes-360)/165,.36,1);
    const sunset=1-Phaser.Math.Clamp((minutes-1010)/200,0,1);
    this.shadows.forEach((shadow,i)=>{
      const cloud=CLOUDS[i];
      const distance=WORLD.width*TILE+310;
      const x=(cloud.phase*distance+time*cloud.speed/1000)%distance-155;
      const y=cloud.lane+Math.sin(time/21000+i)*14;
      shadow.setVisible(!reduceMotion && sunset>0).setPosition(Math.round(x),Math.round(y)).setAlpha(sunrise*sunset*.64);
    });

    this.fish.clear();
    this.wakes.clear();
    FISH.forEach((fish,i)=>{
      const motion=reduceMotion?0:time;
      const phase=(fish.phase+motion/(fish.speed*1000))%1;
      const angle=phase*TAU;
      const u=Math.cos(angle), v=Math.sin(angle);
      const x=Math.round(tileCenter(POND.x)+u*fish.radiusX);
      const y=Math.round(tileCenter(POND.y)+v*fish.radiusY+i*4-8);
      const side=v>0?-1:1;
      const tail=Math.round(Math.sin(motion/105+i)*1.6);
      const lift=reduceMotion?0:Math.max(0,1-Math.abs(phase-.73)*31);
      const alpha=.67+lift*.16;
      this.fish.fillStyle(fish.color,alpha).fillRect(x-4,y-2,9,5).fillRect(x-2,y-3,5,7)
        .fillRect(x-side*6,y+tail-1,3,3).fillRect(x-side*7,y+tail-2,2,5);
      this.fish.fillStyle(fish.accent,.33+lift*.3).fillRect(x-side*2,y-2,4,1).fillRect(x+side*3,y,1,1);
      if(lift>.06){
        const ripple=1-lift;
        this.wakes.lineStyle(1,0xc5e9c9,lift*.55).strokeEllipse(x,y-1,12+ripple*24,5+ripple*10);
      }
    });
  }
}
