import { OUTFITS } from '../Entities/types.ts';
import type { Direction } from '../Components/position.ts';
import { hash } from '../World/map.ts';

type Rect = (x: number, y: number, w: number, h: number, color: string) => void;
type Poly = (coords: number[], color: string) => void;
type Ink = { rect: Rect; poly: Poly; ellipse: (x: number,y: number,w: number,h: number,c: string) => void };
export function draw(canvas: HTMLCanvasElement, paint: (ink: Ink) => void) {
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  paint({
    rect(x,y,w,h,color) { ctx.fillStyle = color; ctx.fillRect(x,y,w,h); },
    poly(points,color) {
      // Scanline fills keep diagonal edges hard at the native pixel resolution.
      ctx.fillStyle = color;
      const ys = points.filter((_,i) => i % 2);
      for (let y = Math.min(...ys); y < Math.max(...ys); y++) {
        const cuts: number[] = [];
        for (let i=0, j=points.length-2; i<points.length; j=i,i+=2) {
          const a = points[j+1], b = points[i+1];
          if ((a > y + .5) !== (b > y + .5)) cuts.push(points[j] + (y + .5 - a)*(points[i]-points[j])/(b-a));
        }
        cuts.sort((a,b) => a-b);
        for (let i=0;i<cuts.length-1;i+=2) ctx.fillRect(Math.round(cuts[i]),y,Math.round(cuts[i+1])-Math.round(cuts[i]),1);
      }
    },
    ellipse(x,y,w,h,color) {
      ctx.fillStyle = color;
      for (let yy=0;yy<h;yy++) {
        const span = Math.round(w * Math.sqrt(1 - ((yy + .5 - h/2)/(h/2)) ** 2));
        ctx.fillRect(Math.round(x+(w-span)/2),y+yy,span,1);
      }
    },
  });
}

export function tileArt(kind: string, variant: number, {rect:r,poly:p,ellipse:e}: Ink) {
  const n = (i: number,j: number) => hash(i + variant*13,j + variant*7);
  if (kind === 'grass' || kind === 'field') {
    r(0,0,32,32,kind==='field' ? ['#9e894e','#9b864b','#a18b4e'][variant%3] : ['#778e4c','#788f4d','#7c924e','#758b49','#7b914c','#79904b'][variant%6]);
    for (let i=0;i<19;i++) {
      const x=Math.floor(n(i,9)*31), y=Math.floor(n(i,14)*31);
      r(x,y,1 + (i%4===0?1:0),1,i%2 ? '#a6ad622f' : '#43593230');
    }
    if (variant%3===0) {
      const x=6+variant*2,y=13+variant;
      r(x,y,1,5,'#546938'); r(x+2,y-2,1,6,'#a2ab64'); r(x+3,y+1,2,2,'#647a3f');
    }
    return;
  }
  if (kind === 'path') {
    r(0,0,32,32,['#b48c5a','#ba9260','#b8905d','#b58f5b','#bd9562','#b79060'][variant%6]);
    for (let i=0;i<22;i++) {
      const x=Math.floor(n(i,8)*28),y=Math.floor(n(i,12)*31);
      r(x,y,1+i%4,1,i%3 ? '#e1b78362' : '#85604269');
    }
    return;
  }
  if (kind === 'sea') {
    r(0,0,32,32,['#4a8f8d','#4c9491','#509995','#488e8d'][variant%4]);
    for (let i=0;i<7;i++) {
      const x=Math.floor(n(i,3)*24),y=Math.floor(n(i,12)*31);
      r(x,y,3+i%6,1,i%2 ? '#94c5a67d' : '#3a7f858c');
    }
    return;
  }
  if (kind === 'soil' || kind === 'wet') {
    const wet=kind==='wet';
    p([2,3,7,1,27,1,30,5,31,26,27,30,4,30,1,26],wet?'#594335':'#875939');
    p([4,5,27,4,29,8,28,26,25,28,5,27,3,24],wet?'#6e5342':'#a37145');
    for(let i=0;i<12;i++) r(5+Math.floor(n(i,8)*20),6+Math.floor(n(i,19)*21),2+i%4,1,i%2 ? '#4c382b77' : '#d2a3737a');
  }
}

export function treeArt(kind: number, {rect:r,poly:p,ellipse:e}: Ink) {
  const palettes = [
    ['#233f2b','#335434','#44683b','#568047','#6d9350','#91a661'],
    ['#263e2b','#3c5730','#56733b','#688843','#82974b','#a8ad5c'],
    ['#2a442d','#345a3a','#407745','#548950','#70a262','#97b772'],
    ['#3a4228','#595730','#747341','#88854a','#a19651','#c7aa65'],
  ];
  const [edge,deep,mid,green,light,shine] = palettes[kind%4];
  e(1,62,66,16,'#26331b62');
  p([26,49,40,47,39,62,46,70,40,73,34,70,24,74,21,71,28,65], '#493d28');
  p([30,48,36,48,35,66,40,70,34,69,28,71,31,63], '#896847');
  r(32,57,2,11,'#bb8f5d');
  const clusters=[[10,26,28,28],[27,31,29,28],[37,23,28,27],[19,16,35,30],[3,19,29,27],[42,12,24,29],[28,5,27,25],[14,3,27,26],[5,10,26,23],[19,9,30,30]];
  clusters.forEach(([x,y,w,h],i)=>{
    p([x,y+8,x+5,y+4,x+8,y+4,x+8,y+1,x+w-9,y,x+w-9,y+3,x+w-4,y+3,x+w-4,y+7,x+w,y+8,x+w,y+h-8,x+w-4,y+h-6,x+w-5,y+h-3,x+w-11,y+h,x+8,y+h,x+8,y+h-3,x+4,y+h-4,x+4,y+h-8,x,y+h-10],edge);
    p([x+2,y+8,x+8,y+6,x+10,y+2,x+w-10,y+2,x+w-9,y+5,x+w-5,y+5,x+w-2,y+10,x+w-2,y+h-9,x+w-10,y+h-4,x+9,y+h-4,x+4,y+h-9],i<3?deep:mid);
    p([x+3,y+9,x+10,y+7,x+10,y+4,x+w-11,y+3,x+w-6,y+7,x+w-5,y+12,x+w-11,y+15,x+13,y+16,x+9,y+13,x+4,y+15],i<3?mid:green);
    r(x+10,y+7,4,2,light); r(x+15,y+5,5,2,i>4?shine:light);
    r(x+7,y+12,2,2,light); r(x+w-11,y+10,3,1,light);
    r(x+w-13,y+h-8,5,2,deep);
    if (kind%4===3 && i%2===0) { r(x+10,y+12,3,3,'#b96b43'); r(x+11,y+12,2,1,'#e19556'); }
  });
}

export function buildingArt(shop: boolean, {rect:r,poly:p,ellipse:e}: Ink) {
  e(8,128,170,22,'#30331e6b');
  r(24,67,136,68,'#634532'); r(27,66,128,65,shop?'#c69c66':'#d7b783');
  r(28,123,125,12,'#8e7863');
  for(let y=124;y<135;y+=5) for(let x=29+(y%2)*5;x<150;x+=11) {r(x,y,9,3,'#aa9071');r(x,y,7,1,'#c6aa83');}
  for(let y=73;y<120;y+=7) {r(28,y,125,1,'#a37c56');r(28,y+1,125,1,'#e4c192');}
  r(28,69,5,54,'#845f40'); r(149,69,5,54,'#845f40');
  r(126,14,16,35,'#644539'); r(129,12,13,29,'#9c6950'); r(125,12,20,5,'#c18360');
  for(let y=20;y<39;y+=5) {r(129,y,13,1,'#755040');r(131+y%3,y+1,1,3,'#b17a58');}
  const roof=shop?'#50786b':'#a55342', low=shop?'#34574f':'#793c35', high=shop?'#70958a':'#c56d52', gold=shop?'#95ae91':'#e08b64';
  p([8,71,58,21,116,21,170,70,170,78,8,78],'#513a32');
  p([10,69,60,22,114,22,167,69,162,73,15,73],roof);
  for(let row=0;row<9;row++) {
    const y=26+row*5,left=57-row*5,right=116+row*5;
    r(left,y,right-left,1,high); r(left-2,y+3,right-left+4,2,low);
    for(let x=left+5+(row%2)*4;x<right-4;x+=11) {
      r(x,y+1,1,3,low);
      r(x+1,y+1,4,1,(x+row)%4===0?gold:high);
    }
  }
  p([8,69,58,20,116,20,171,69,169,73,114,25,60,25,12,74],high);
  r(9,73,161,5,low); r(13,73,153,1,gold);
  if(!shop) {
    p([68,58,88,38,108,58,108,72,68,72],'#704535');
    p([72,58,88,43,104,58,104,70,72,70],'#ca9c6a');
    p([66,58,88,36,111,58,108,60,88,41,69,60],high);
    r(82,53,13,14,'#5f463d');r(84,55,9,10,'#e7b46b');r(88,55,2,10,'#8b6247');r(84,60,9,1,'#8b6247');
  }
  r(76,96,29,38,'#654632');r(79,99,23,34,'#8e6041');
  for(let x=81;x<102;x+=5) r(x,101,1,29,'#a8774b');
  r(94,115,4,3,'#e2b66b');
  r(73,133,35,4,'#ad8b67');r(70,137,41,4,'#c19970');r(70,141,41,2,'#866144');
  for (const x of [40,116]) {
    r(x,92,22,21,'#724b37');r(x+3,95,16,15,'#f1cb82');
    r(x+5,96,11,11,'#eab063');r(x+10,94,2,17,'#83593d');r(x+2,102,18,2,'#83593d');
    r(x-2,112,26,3,'#946345');
    r(x+1,114,20,4,'#72523b');
    for(let i=0;i<5;i++){r(x+i*4+1,112,3,2,'#587142');r(x+i*4+1,110+i%2,2,2,shop?'#f3ca62':'#e17e69');}
  }
  if(shop) {
    r(50,78,79,12,'#624632');r(52,80,75,8,'#b28755');
    for(let x=57;x<125;x+=5) r(x,82,3,3,'#eed397');
    p([26,87,68,87,71,98,23,98],'#d7b17b');
    p([113,87,153,87,159,98,110,98],'#d7b17b');
    for(let x=25;x<160;x+=8) if(x<69||x>110) r(x,89,4,9,'#698c74');
  }
  r(67,112,5,9,'#684d37');r(68,114,3,5,'#ffca66');
  r(109,112,5,9,'#684d37');r(110,114,3,5,'#ffca66');
  if(!shop) { r(16,113,10,18,'#705038');r(17,116,8,2,'#a77a50');r(17,126,8,2,'#a77a50'); }
  else {r(155,122,13,9,'#775337');r(156,123,11,2,'#b98a55');r(157,119,5,4,'#c98254');r(163,118,4,4,'#ad9c58');}
}

export function personArt(direction: Direction, frame: number, outfit: number, {rect:r,poly:p,ellipse:e}: Ink) {
  const color=OUTFITS[outfit] ?? OUTFITS[0], side=direction==='left'||direction==='right', offset=direction==='left'?-2:direction==='right'?2:0;
  const bob=frame===4?1:frame%2, stride=frame===1?1:frame===3?-1:0; const y=5-bob;
  e(5,29,24,7,'#29312180');
  r(10+(side?stride*2:0),26,5,5+(stride===1?2:0),'#3f3330');
  r(18-(side?stride*2:0),25,5,6+(stride===-1?2:0),'#4b382d');
  r(10,24,13,5,'#465963');r(12,24,8,3,'#64737a');
  p([9,18,23,18,25,22,24,27,9,27,7,23],'#513b30');
  p([10,18,22,18,23,24,21,26,11,26,9,23],color);
  r(8,22-bob+stride,3,4,'#d5a06d');r(23,21+bob-stride,3,5,'#c38a60');
  r(11,22,3,4,'#e2ae5f');
  if(direction==='up') {r(10,y+6,13,10,'#6e4b35');r(12,y+8,9,8,'#97673e');}
  else {
    r(9+offset,y+6,15,9,'#70462e');r(10+offset,y+8,13,7,'#dba26c');r(12+offset,y+8,8,3,'#efbd81');r(11+offset,y+13,11,2,'#bd7957');
    r(side?(direction==='left'?9:22):12,y+10,2,2,'#483226');
    if(!side)r(20,y+10,2,2,'#483226');
  }
  p([5,y+5,9,y+5,10,y+2,13,y,22,y,25,y+3,25,y+5,28,y+5,28,y+9,5,y+9],'#694b31');
  p([6,y+5,11,y+5,12,y+2,21,y+1,24,y+4,24,y+6,27,y+6,27,y+8,6,y+8],'#d2a963');
  r(11,y+5,13,2,'#ac684d');r(13,y+2,8,1,'#efcc83');r(7,y+7,19,1,'#e1b875');
}

export function propArt(kind: string, variant: number, {rect:r,poly:p,ellipse:e}: Ink) {
  if(kind==='fence') {
    r(0,16,32,5,'#6d4b35');r(0,17,32,2,'#a7794f');r(0,23,32,4,'#79553a');r(0,23,32,1,'#bd8c55');
    p([12,11,15,8,21,9,22,30,11,30,11,13],'#654632');
    r(13,12,6,16,'#bf8e55');r(13,11,5,2,'#daa466');r(18,14,2,13,'#956540');
  } else if(kind==='rock') {
    e(4,23,25,7,'#3d4a2d69');
    p([3,23,4,17,8,13,11,9,21,9,25,15,28,17,29,24,23,28,8,28],'#4f5750');
    p([5,19,10,14,13,11,20,11,24,16,24,19,18,21,9,22],'#a0a397');
    p([8,22,18,21,24,18,27,20,26,24,22,26,10,26],'#787e72');
    r(12,14,6,2,'#c2bfb0');r(18,18,3,2,'#70766b'); r(6,24,5,2,'#788656');
  } else if(kind==='stump') {
    e(3,22,27,7,'#37472b73');p([5,24,10,21,10,15,14,11,22,11,25,15,25,22,29,25,20,28,10,27],'#69503a');
    e(10,11,15,10,'#c0905a');e(13,13,9,6,'#966942');e(15,14,5,3,'#d3a66c');
    r(12,21,2,4,'#a2744f');r(21,21,2,5,'#9b7048');
  } else if (kind==='flowers') {
    for(let i=0;i<5;i++){
      const x=4+i*5,y=12+Math.round(hash(i,variant)*10);
      r(x,y,1,7,'#4e713e');r(x-1,y+3,3,1,'#91a75b');
      r(x-1,y,3,2,variant%2?'#edc26f':'#e7d4a0');r(x,y-1,1,1,variant%2?'#f2a759':'#fff0bd');
    }
  } else if(kind==='reeds') {
    for(let i=0;i<7;i++){
      const x=4+i*3,y=8+Math.round(hash(i,variant)*12);
      r(x,y,1,27-y,i%2?'#829847':'#556d3a');r(x-1,y-2,3,4,i%2?'#8e7048':'#685e3c');
    }
  } else if(kind==='lily') {
    e(4,19,16,7,'#376b58');e(5,17,15,7,'#7e9c61');r(13,17,7,2,'#519693');
    r(10,15,5,3,variant%2?'#e9b6a7':'#7c9f64');r(12,14,2,2,'#e9cf8b');
  } else if(kind==='sign') {
    r(14,11,4,17,'#735239');r(15,11,2,16,'#a47c4c');
    r(4,6,24,12,'#674831');r(5,7,22,9,'#c2995d');r(8,10,14,1,'#886442');r(11,13,10,1,'#886442');
  } else if(kind==='lamp') {
    r(15,11,3,18,'#674835');r(16,14,1,14,'#a37b4a');
    p([10,8,14,4,19,4,23,8,21,16,12,16],'#654937');r(13,8,7,6,'#f6bd62');r(14,9,5,4,'#ffe19d');
  }
}

export function cropArt(age: number, carrot: boolean, {rect:r,poly:p,ellipse:e}: Ink) {
  if(!age){r(13,20,2,2,'#ddbd77');r(18,15,2,2,'#daba77');r(21,22,1,1,'#e3c487');return;}
  e(6,21,21,5,'#4b362c85');
  if(age>=3){
    p([9,19,12,15,20,15,24,19,23,24,18,28,13,26,9,23],carrot?'#d57d3f':'#e0cdc0');
    r(12,19,7,2,carrot?'#f6aa58':'#f8e4cc');r(20,22,3,2,carrot?'#a85b38':'#ab7583');
    r(16,26,2,4,carrot?'#cd7741':'#bd8e8d');
  }
  for(let i=0;i<3;i++){
    const x=7+i*6,y=(i===1?7:11)+(age===1?5:0);
    p([16,22,x,y+4,x,y,x+5,y,x+9,y+5,18,22],'#406644');
    r(x+1,y+1,5,2,age>=3?'#a5b956':'#86ab55');
    r(x+3,y+3,4,2,'#6d994d');
  }
}
