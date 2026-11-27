import Phaser from 'phaser';
import { buildingArt, cropArt, draw, personArt, propArt, tileArt, treeArt } from '../Assets/pixels.ts';
import { DELTA, key } from '../Components/position.ts';
import type { Direction, Point } from '../Components/position.ts';
import { TILE, WORLD } from '../Config/game.ts';
import { ready } from '../Farming/crops.ts';
import { advance } from '../Systems/clock.ts';
import type { ItemId } from '../Items/catalog.ts';
import type { Peer } from '../Network/protocol.ts';
import type { ActionEffect } from '../Systems/effects.ts';
import type { Gameplay } from '../Systems/gameplay.ts';
import { fence, hash, inPlot, NPC_SPOT, path, PLOT, POND, water } from '../World/map.ts';
import { tileCenter as center, ValleyEffects } from './ValleyEffects.ts';
import { ValleyNature } from './ValleyNature.ts';

type Ports = {
  model: () => Gameplay; blocked: () => boolean; reduced: () => boolean;
  use: (target: Point) => void; tick: (delta: number) => void; ready: () => void; reeledIn: () => void;
  inspect: () => boolean;
  landmarks: () => [cottage: string, market: string, pond: string];
  touch: () => boolean;
  touchMovement: () => Point;
  footstep: (dirt: boolean) => void;
  online: () => boolean;
  peers: () => Peer[];
  movement: (x: number, y: number) => void;
};
const directions: Direction[] = ['down','up','left','right'];
type PeerSprite = { sprite: Phaser.GameObjects.Sprite; name: Phaser.GameObjects.Text; point: Point };
export class ValleyScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private dynamic: Phaser.GameObjects.GameObject[] = [];
  private cursor!: Phaser.GameObjects.Graphics;
  private shade!: Phaser.GameObjects.Rectangle;
  private ripples!: Phaser.GameObjects.Graphics;
  private ambience!: ValleyEffects;
  private nature!: ValleyNature;
  private lampGlows: Phaser.GameObjects.Image[] = [];
  private landmarkSigns: Phaser.GameObjects.Text[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private facing: Direction = 'down';
  private resourceSprites = new Map<string, Phaser.GameObjects.Image>();
  private peerSprites = new Map<string, PeerSprite>();
  private stride = 0;
  private foot = 0;
  private actionTime = -Infinity;
  private size = {w:0,h:0,touch:false};
  constructor(private readonly ports: Ports) { super('valley'); }
  create() {
    this.makeTextures();
    this.drawMap();
    this.ripples = this.add.graphics().setDepth(6);
    this.cursor = this.add.graphics().setDepth(900);
    this.player = this.add.sprite(0,0,'person-0-down-0').setOrigin(.5,.86);
    this.placePlayer(false,0);
    this.shade = this.add.rectangle(0,0,1,1,0x252140,0).setDepth(5000);
    this.ambience = new ValleyEffects(this);
    this.nature = new ValleyNature(this);
    this.cameras.main.setBackgroundColor('#344b30');
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT',false) as typeof this.keys;
    this.input.on('pointerdown',(pointer: Phaser.Input.Pointer) => {
      if ((pointer.wasTouch || pointer.leftButtonDown()) && !this.ports.blocked()) this.ports.use(this.pointerTile(pointer));
    });
    window.addEventListener('blur',()=>this.input.keyboard?.resetKeys());
    this.renderChanges();
    this.ports.ready();
  }
  front() {
    const p = this.ports.model().farm.position;
    const d = DELTA[this.facing];
    return { x: Math.round(p.x) + d.x, y: Math.round(p.y) + d.y };
  }
  playEffect(effect: ActionEffect | 'bite', target?: Point, item?: ItemId) {
    const position = this.ports.model().farm.position;
    const at = target ?? position;
    if (target && effect !== 'bite' && effect !== 'escape') {
      const dx = at.x - position.x, dy = at.y - position.y;
      if (Math.hypot(dx,dy) > .15) this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      this.actionTime = this.time.now;
    }
    if (this.ports.reduced()) return;
    this.ambience.action(this,effect,position,at,this.time.now,item,this.resourceSprites.get(key(at.x,at.y)));
  }
  resetEffects() {
    this.ambience.reset();
    this.stride=0;
    this.actionTime=-Infinity;
    for (const {sprite,name} of this.peerSprites.values()) {sprite.destroy();name.destroy();}
    this.peerSprites.clear();
  }
  playRemoteEffect(effect: ActionEffect, player: Point, target: Point, item?: ItemId) {
    if (!this.ports.reduced()) this.ambience.action(this,effect,player,target,this.time.now,item,this.resourceSprites.get(key(target.x,target.y)),true);
  }
  private pointerTile(pointer: Phaser.Input.Pointer) {
    const point = this.cameras.main.getWorldPoint(pointer.x,pointer.y);
    return { x:Math.floor(point.x/TILE),y:Math.floor(point.y/TILE) };
  }
  private texture(name: string,w: number,h: number,paint: Parameters<typeof draw>[1]) {
    const texture = this.textures.createCanvas(name,w,h)!;
    draw(texture.getCanvas(),paint);
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  private makeTextures() {
    for(const kind of ['soil','wet']) for(let i=0;i<6;i++) this.texture(`${kind}-${i}`,32,32,ink=>tileArt(kind,i,ink));
    const terrain = this.textures.createCanvas('terrain', TILE * 6, TILE * 3)!;
    const ctx = terrain.getContext();
    ['grass','path','field'].forEach((kind,row)=>{
      for(let i=0;i<6;i++){
        ctx.save();
        ctx.translate(i*TILE,row*TILE);
        draw(terrain.getCanvas(),ink=>tileArt(kind,i,ink));
        ctx.restore();
      }
    });
    terrain.refresh();
    terrain.setFilter(Phaser.Textures.FilterMode.NEAREST);
    for(let i=0;i<4;i++) this.texture(`tree-${i}`,68,78,ink=>treeArt(i,ink));
    for(const kind of ['fence','rock','stump','flowers','reeds','lily','sign','lamp']) for(let i=0;i<3;i++) this.texture(`${kind}-${i}`,32,32,ink=>propArt(kind,i,ink));
    for(const carrot of [0,1]) for(let age=0;age<4;age++) this.texture(`crop-${carrot}-${age}`,32,32,ink=>cropArt(age,!!carrot,ink));
    for(let outfit=0;outfit<4;outfit++) for(const direction of directions) for(let i=0;i<5;i++) this.texture(`person-${outfit}-${direction}-${i}`,32,36,ink=>personArt(direction,i,outfit,ink));
    this.texture('cottage',184,151,ink=>buildingArt(false,ink));
    this.texture('market',184,151,ink=>buildingArt(true,ink));
    this.texture('glow',64,64,({ellipse})=>{
      for(let i=0;i<9;i++)ellipse(i*3,i*3,64-i*6,64-i*6,'#f5bc6121');
    });
    this.texture('pond',384,256,({rect})=>{
      const cx=192,cy=128,rx=166,ry=107;
      for(let y=16;y<240;y++){
        const dist=(y-cy)/ry;
        if(Math.abs(dist)>1)continue;
        const w=Math.round(rx*Math.sqrt(1-dist*dist)/3)*3;
        rect(cx-w-4,y,w*2+8,1,'#667d46');
        rect(cx-w,y,w*2,1,'#b5a36d');
        if(w>8)rect(cx-w+5,y,w*2-10,1,'#77a28a');
        if(w>13)rect(cx-w+10,y,w*2-20,1,y<85?'#509690':y<163?'#4b918d':'#478988');
      }
      for(let i=0;i<1150;i++){
        const x=25+Math.floor(hash(i,34)*334),y=17+Math.floor(hash(i,61)*221);
        if(((x-cx)/(rx-20))**2+((y-cy)/(ry-12))**2<1)rect(x,y,2+i%9,1,i%3?'#8bb9a45a':'#286e7855');
      }
    });
  }
  private prop(x: number,y: number,name: string) { return this.add.image(center(x),center(y),name).setDepth(center(y)+6); }
  private drawMap() {
    const data = Array.from({length:WORLD.height},(_,y)=>Array.from({length:WORLD.width},(_,x)=>
      (path(x,y)?6:inPlot(x,y)?12:0)+Math.floor(hash(x,y)*6)));
    const map = this.make.tilemap({data,tileWidth:TILE,tileHeight:TILE});
    const tiles = map.addTilesetImage('terrain')!;
    map.createLayer(0,tiles);
    for(let y=0;y<WORLD.height;y++) for(let x=0;x<WORLD.width;x++){
      const variant=Math.floor(hash(x,y)*6), terrain=path(x,y)?'path':inPlot(x,y)?'field':'grass';
      if(fence(x,y))this.prop(x,y,'fence-0');
      if(terrain==='grass' && !water(x,y) && !fence(x,y) && hash(x+71,y*3)>.86)this.prop(x,y,`flowers-${variant%3}`).setDepth(4);
    }
    this.add.image(center(POND.x),center(POND.y),'pond').setDepth(2);
    const border = this.add.graphics().setDepth(1);
    border.fillStyle(0x60442e,.72);
    border.fillRect(PLOT.x*TILE-3,PLOT.y*TILE-3,PLOT.w*TILE+6,3);
    border.fillRect(PLOT.x*TILE-3,(PLOT.y+PLOT.h)*TILE,PLOT.w*TILE+6,3);
    border.fillRect(PLOT.x*TILE-3,PLOT.y*TILE,3,PLOT.h*TILE);
    border.fillRect((PLOT.x+PLOT.w)*TILE,PLOT.y*TILE,3,PLOT.h*TILE);
    border.fillStyle(0xdbc583,.12);
    for(let y=0;y<PLOT.h;y++)for(let x=0;x<PLOT.w;x++)border.fillRect((PLOT.x+x)*TILE,(PLOT.y+y)*TILE,31,1);
    [[25,15],[27,14],[33,15],[32,20],[27,20],[25,18]].forEach(([x,y],i)=>this.prop(x,y,`reeds-${i%3}`));
    [[28,16],[31,16],[30,18],[27,18],[32,18]].forEach(([x,y],i)=>this.prop(x,y,`lily-${i%3}`));
    [[8,10],[15,10],[23,10],[29,10],[22,20]].forEach(([x,y])=>{
      this.prop(x,y,'lamp-0');
      this.lampGlows.push(this.add.image(center(x),center(y)-6,'glow').setScale(.85).setDepth(5010).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD));
    });
    [[14,9],[24,9],[24,18],[11,20]].forEach(([x,y])=>this.prop(x,y,'sign-0'));
    this.add.image(center(12),center(8)+20,'cottage').setOrigin(.5,.94).setScale(1.09).setDepth(center(8)+18);
    this.add.image(center(26),center(8)+20,'market').setOrigin(.5,.94).setScale(1.09).setDepth(center(8)+18);
    this.add.image(center(NPC_SPOT.x),center(NPC_SPOT.y)+7,'person-3-down-0').setOrigin(.5,.86).setDepth(center(NPC_SPOT.y)+8);
    const signStyle={fontFamily:'Consolas, monospace',fontSize:'10px',fontStyle:'bold',color:'#fff0c4',backgroundColor:'#30281dd9',padding:{x:7,y:5}};
    const positions=[[center(12),center(5)-24],[center(26),center(5)-24],[center(POND.x),center(POND.y)+14]];
    this.landmarkSigns=positions.map(([x,y])=>this.add.text(x,y,'',signStyle).setOrigin(.5).setDepth(700).setResolution(2));
    this.landmarkSigns[2].setAlpha(.86);
    this.updateLandmarkLabels();
  }
  updateLandmarkLabels() {
    const labels=this.ports.landmarks();
    this.landmarkSigns.forEach((sign,index)=>sign.setText(labels[index].toUpperCase()));
  }
  renderChanges() {
    if (!this.player) return;
    this.resourceSprites.clear();
    this.dynamic.forEach(object=>object.destroy()); this.dynamic=[];
    const { farm }=this.ports.model();
    for(const entry of farm.resources){
      if(entry.kind==='tree'){
        const variant=Math.floor(hash(entry.x+4,entry.y)*4);
        const tree=this.add.image(center(entry.x),center(entry.y)+11,`tree-${variant}`).setScale(1.14+hash(entry.x,entry.y)*.29).setOrigin(.5,.91).setDepth(center(entry.y)+8);
        this.dynamic.push(tree);
        this.resourceSprites.set(entry.id,tree);
      } else {
        const prop=this.prop(entry.x,entry.y,`${entry.kind}-0`);
        this.resourceSprites.set(entry.id,prop);
        this.dynamic.push(prop);
      }
    }
    for(const entry of farm.fences){
      const [x,y]=entry.split(',').map(Number); this.dynamic.push(this.prop(x,y,'fence-0'));
    }
    for(const [tile,plot] of Object.entries(farm.plots)){
      const [x,y]=tile.split(',').map(Number);
      this.dynamic.push(this.add.image(center(x),center(y),`${plot.watered?'wet':'soil'}-${Math.floor(hash(x,y)*6)}`).setDepth(3));
      if(plot.seed)this.dynamic.push(this.add.image(center(x),center(y),`crop-${plot.seed==='carrotSeed'?1:0}-${ready(plot)?3:Math.min(2,plot.age)}`).setDepth(center(y)+1));
    }
    if(this.ports.inspect()) {
      for(let y=14;y<=17;y++)for(let x=12;x<=19;x++)if((x+y)%4!==0) {
        this.dynamic.push(this.add.image(center(x),center(y),'soil-3').setDepth(3));
        this.dynamic.push(this.add.image(center(x),center(y),`crop-${x%2}-${1+(x+y)%3}`).setDepth(center(y)+1));
      }
    }
  }
  private placePlayer(moving: boolean,time: number) {
    const { farm }=this.ports.model();
    const reduced=this.ports.reduced();
    const actionAge=(time-this.actionTime)/285;
    const pose=!reduced && actionAge >= 0 && actionAge < 1 ? Math.round(Math.sin(actionAge*Math.PI)*2) : 0;
    const frame=reduced?0:moving?(1+Math.floor(this.stride/.30))%4:(pose||time%1570>1050?4:0);
    const p=farm.position;
    this.player.setPosition(center(p.x),center(p.y)+7-pose).setDepth(center(p.y)+7).setTexture(`person-${farm.character.outfit}-${this.facing}-${frame}`);
  }
  private placePeers(delta: number,time: number,reduced: boolean) {
    const peers=this.ports.peers();
    const present=new Set<string>();
    for (const peer of peers) {
      present.add(peer.id);
      let actor=this.peerSprites.get(peer.id);
      if (!actor) {
        const sprite=this.add.sprite(0,0,'person-0-down-0').setOrigin(.5,.86);
        const name=this.add.text(0,0,peer.name,{
          fontFamily:'system-ui, sans-serif',fontSize:'11px',color:'#fff0bf',backgroundColor:'#33291de5',padding:{x:4,y:2},
        }).setOrigin(.5,1).setDepth(799);
        actor={sprite,name,point:{...peer.position}};
        this.peerSprites.set(peer.id,actor);
      }
      const distance=Phaser.Math.Distance.Between(actor.point.x,actor.point.y,peer.position.x,peer.position.y);
      const smooth=reduced||distance>2.4?1:1-Math.exp(-delta/56);
      actor.point.x=Phaser.Math.Linear(actor.point.x,peer.position.x,smooth);
      actor.point.y=Phaser.Math.Linear(actor.point.y,peer.position.y,smooth);
      const x=center(actor.point.x),y=center(actor.point.y);
      const frame=reduced?0:distance>.07?Math.floor(time/95)%4:time%1840>1430?4:0;
      actor.sprite.setPosition(x,y+8).setDepth(y+6).setTexture(`person-${peer.outfit}-${peer.direction}-${frame}`);
      actor.name.setPosition(x,y-26);
    }
    for (const [id,{sprite,name}] of this.peerSprites) {
      if (!present.has(id)) {sprite.destroy();name.destroy();this.peerSprites.delete(id);}
    }
  }
  update(time: number,rawDelta: number) {
    const delta=Math.min(40,rawDelta);
    const frozen=this.ports.blocked();
    const touch=this.ports.touch(), reduced=this.ports.reduced();
    const pad=this.ports.touchMovement();
    const read=(a: string,b: string)=>Number(this.keys[a].isDown||this.keys[b].isDown);
    const x=frozen?0:Math.sign(read('D','RIGHT')-read('A','LEFT')+pad.x);
    const y=frozen?0:Math.sign(read('S','DOWN')-read('W','UP')+pad.y);
    this.ports.movement(x,y);
    const model=this.ports.model();
    const p=model.farm.position, startX=p.x, startY=p.y;
    if(x||y){
      this.facing=y>0?'down':y<0?'up':x>0?'right':'left';
      const run=delta*.0044/(x&&y?Math.SQRT2:1);
      if(model.move(x*run,y*run))this.ports.reeledIn();
    }
    const traveled=Math.hypot(p.x-startX,p.y-startY);
    if (traveled > 0) {
      const lastStep=Math.floor(this.stride/.6);
      this.stride+=traveled;
      if (Math.floor(this.stride/.6)!==lastStep) {
        const tx=Math.round(p.x),ty=Math.round(p.y), dirt=path(tx,ty)||inPlot(tx,ty);
        this.foot=1-this.foot;
        if(!reduced)this.ambience.step(p,dirt,this.foot?1:-1,time);
        this.ports.footstep(dirt);
      }
    } else this.stride=0;
    if(!frozen){
      if(!this.ports.online())model.farm.minutes=advance(model.farm.minutes,delta);
      this.ports.tick(delta);
    }
    this.placePlayer(traveled>0,time);
    this.placePeers(delta,time,reduced);
    const {width:w,height:h}=this.scale.gameSize;
    const camera=this.cameras.main;
    const resized=this.size.w!==w||this.size.h!==h||this.size.touch!==touch;
    if(resized){
      this.size={w,h,touch};
      if(camera.width!==w||camera.height!==h)camera.setSize(w,h);
      camera.setZoom(Math.max(touch ? .90 : .73,Math.min(1.32,Math.max(h/695,w/1400))));
    }
    const z=camera.zoom;
    const desiredX=touch||w<760?center(p.x):center(p.x)+Math.min(w*.18,220)/z;
    const desiredY=h<550?center(p.y)+30:center(p.y)+79;
    const halfX=w/(2*z),halfY=h/(2*z);
    const targetX=Math.max(Math.min(halfX,640),Math.min(Math.max(1280-halfX,640),desiredX));
    const targetY=Math.max(Math.min(halfY,400),Math.min(Math.max(800-halfY,400),desiredY));
    const snap=resized || time<100 || reduced;
    const currentX=camera.scrollX+w/2,currentY=camera.scrollY+h/2;
    camera.centerOn(snap?targetX:Phaser.Math.Linear(currentX,targetX,.12),snap?targetY:Phaser.Math.Linear(currentY,targetY,.12));
    this.shade.setPosition(camera.scrollX+w/2,camera.scrollY+h/2).setSize(w/z+20,h/z+20);
    const minute=model.farm.minutes;
    this.shade.setAlpha(Phaser.Math.Clamp((minute-1050)/540,0,.50));
    this.nature.update(time,minute,reduced);
    this.ripples.clear();
    for(let i=0;i<13;i++){
      const a=((reduced?0:time)/(1850+i*55)+i*.151)%1, px=805+hash(i,17)*286,py=502+hash(i,4)*132;
      if(((px-957)/145)**2+((py-566)/89)**2<1){
        this.ripples.fillStyle(0xa2d2b4,.38*Math.sin(a*Math.PI));
        this.ripples.fillRect(Math.floor(px+a*14),Math.floor(py),9+i%12,1);
      }
    }
    this.cursor.clear();
    if(!frozen){
      const mouse=this.input.activePointer;
      const over=!touch&&!mouse.wasTouch&&mouse.x>=0&&mouse.y>=0&&mouse.x<w&&mouse.y<h;
      const target=over?this.pointerTile(mouse):this.front();
      if(Math.hypot(target.x-p.x,target.y-p.y)<2.1){
        this.cursor.lineStyle(2,0xf5dc96,.85);
        this.cursor.strokeRect(target.x*TILE+2,target.y*TILE+2,28,28);
      }
    }
    const glow = Phaser.Math.Clamp((minute-1050)/170,0,.75);
    this.lampGlows.forEach((light,index)=>light.setAlpha(glow*(reduced?1:.91+Math.sin(time/420+index)*.09)));
    this.ambience.update(time,performance.now(),camera,p,minute,model.cast,reduced);
  }
}
