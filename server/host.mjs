import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { WebSocket, WebSocketServer } from 'ws';
import { ROOM_PATH, parseClientPacket, validCode } from '../src/Network/protocol.ts';
import { GameRoom } from './room.ts';

const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const savePath=process.env.VALLEY_SAVE
  ? resolve(process.env.VALLEY_SAVE)
  : fileURLToPath(new URL('../.valley-host/farm.json',import.meta.url));
const argument=process.argv.slice(2).find(value=>value.startsWith('--port='));
const port=Number(argument?.slice(7) ?? process.env.VALLEY_PORT ?? 8080);
if (!Number.isInteger(port) || port<0 || port>65535) throw new Error('Invalid host port.');
if (!existsSync(resolve(dist,'index.html'))) throw new Error('Run pnpm build before starting the co-op host.');

function readSave() {
  if (!existsSync(savePath)) return undefined;
  const saved=JSON.parse(readFileSync(savePath,'utf8'));
  if (saved?.version!==1 || !validCode(saved.code) || !saved.land || !Array.isArray(saved.profiles))
    throw new Error('The co-op save could not be loaded. Preserve the file before starting with a different save path.');
  return saved;
}
const room=new GameRoom(readSave());
function flush() {
  if (!room.dirty) return;
  try {
    mkdirSync(dirname(savePath),{recursive:true});
    const pending=savePath+'.tmp';
    writeFileSync(pending,JSON.stringify(room.snapshot()),{mode:0o600});
    renameSync(pending,savePath);
    room.dirty=false;
  } catch (error) { console.error('Could not save the co-op farm:',error.message); }
}

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
const base=resolve(dist)+sep;
const server=createServer((request,response)=>{
  response.setHeader('X-Content-Type-Options','nosniff');
  if (!['GET','HEAD'].includes(request.method)) {
    response.writeHead(405,{Allow:'GET, HEAD'}).end();
    return;
  }
  try {
    const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
    const name=pathname==='/'?'index.html':pathname.slice(1);
    const file=resolve(dist,name);
    if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    const type=types[extname(file)] ?? 'application/octet-stream';
    response.writeHead(200,{'Content-Type':type,'Cache-Control':name.startsWith('assets/')?'public, max-age=31536000, immutable':'no-cache'});
    if (request.method==='HEAD') response.end();
    else createReadStream(file).on('error',()=>response.destroy()).pipe(response);
  } catch { response.writeHead(400).end(); }
});
server.requestTimeout=10000;
server.headersTimeout=10000;
const sockets=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false});
server.on('upgrade',(request,socket,head)=>{
  if (request.url!==ROOM_PATH || sockets.clients.size>=20) { socket.destroy(); return; }
  sockets.handleUpgrade(request,socket,head,ws=>sockets.emit('connection',ws));
});

const heartbeat=new WeakMap();
sockets.on('connection',ws=>{
  heartbeat.set(ws,true);
  ws.on('pong',()=>heartbeat.set(ws,true));
  ws.on('error',()=>{});
  let session;
  let windowStart=performance.now(), messages=0;
  const joinTimer=setTimeout(()=>ws.close(1008,'Join timeout'),6000);
  const send=packet=>{
    if (ws.readyState!==WebSocket.OPEN) return;
    if (ws.bufferedAmount>256*1024) { ws.terminate(); return; }
    ws.send(JSON.stringify(packet));
  };
  ws.on('message',(data,isBinary)=>{
    const now=performance.now();
    if (now-windowStart>=1000) { windowStart=now; messages=0; }
    if (++messages>48) { ws.close(1008,'Too many requests'); return; }
    const packet=isBinary ? null : parseClientPacket(data.toString('utf8'));
    if (!packet) {
      if (!session) { send({type:'error',code:'invalidCode'}); ws.close(1008); }
      return;
    }
    if (session) {
      room.receive(session,packet,now);
      return;
    }
    if (packet.type!=='join') { ws.close(1008); return; }
    const joined=room.join(packet,send,()=>ws.close(4000,'Session rejoined'));
    if (typeof joined==='string') { send({type:'error',code:joined}); ws.close(1008); return; }
    clearTimeout(joinTimer);
    session=joined;
  });
  ws.on('close',()=>{
    clearTimeout(joinTimer);
    if (session) room.leave(session,performance.now());
  });
});
let last=performance.now();
const tick=setInterval(()=>{
  const now=performance.now();
  room.tick(Math.min(100,now-last),now);
  last=now;
},65);
const saveTimer=setInterval(flush,2400);
const pingTimer=setInterval(()=>{
  for (const ws of sockets.clients) {
    if (!heartbeat.get(ws)) { ws.terminate(); continue; }
    heartbeat.set(ws,false);
    ws.ping();
  }
},12000);

let tunnel;
server.listen(port,'127.0.0.1',()=>{
  const localUrl=`http://127.0.0.1:${server.address().port}`;
  flush();
  console.log(`Little Harvest Valley co-op: ${localUrl}`);
  console.log(`Room code: ${room.code}`);
  console.log('In the game, select Co-op and enter the room code.');
  if (process.argv.includes('--share')) {
    tunnel=spawn('cloudflared',['tunnel','--url',localUrl],{stdio:'inherit',windowsHide:true});
    tunnel.on('error',()=>console.error('Install cloudflared and add it to PATH to share this farm over the Internet.'));
  }
});
function shutdown() {
  clearInterval(tick);
  clearInterval(saveTimer);
  clearInterval(pingTimer);
  flush();
  tunnel?.kill();
  for (const ws of sockets.clients) {
    if (ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'error',code:'roomEnded'}));
    ws.close(1001,'Host stopped');
  }
  server.close();
  setTimeout(()=>process.exit(0),800).unref();
}
process.once('SIGINT',shutdown);
process.once('SIGTERM',shutdown);
