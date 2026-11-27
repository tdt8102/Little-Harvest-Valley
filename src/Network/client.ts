import { GAME_VERSION, socketAddress } from './protocol.ts';
import type { ClientPacket, RoomCommand, ServerPacket } from './protocol.ts';

type JoinRequest = { address:string; code:string; name:string; outfit:number };
const TOKEN_PREFIX='little-harvest-valley:coop:';

export class RoomClient {
  private socket: WebSocket | null = null;
  private lastMove = {x:0,y:0,at:0};
  private timer = 0;
  constructor(
    private readonly receive: (message: ServerPacket) => void,
    private readonly disconnected: () => void,
  ) {}

  connect(request: JoinRequest) {
    this.disconnect();
    const socket=new WebSocket(socketAddress(request.address));
    this.socket=socket;
    const key=TOKEN_PREFIX+request.code;
    // The room code stays the same when the host gets a new temporary tunnel URL.
    let token: string|undefined;
    try { token=localStorage.getItem(key) ?? undefined; } catch { /* A fresh player can still join. */ }
    this.timer=window.setTimeout(()=>socket.close(),9000);
    socket.addEventListener('open',()=>{
      if (this.socket!==socket) return;
      this.send({type:'join',version:GAME_VERSION,code:request.code,name:request.name,outfit:request.outfit,token});
    });
    socket.addEventListener('message',event=>{
      if (this.socket!==socket || typeof event.data!=='string') return;
      let packet: ServerPacket;
      try { packet=JSON.parse(event.data) as ServerPacket; } catch { return; }
      if (!packet || typeof packet.type!=='string') return;
      if (packet.type==='ready') {
        window.clearTimeout(this.timer);
        try { localStorage.setItem(key,packet.token); } catch { /* The session remains playable. */ }
      }
      this.receive(packet);
    });
    socket.addEventListener('close',()=>{
      if (this.socket!==socket) return;
      window.clearTimeout(this.timer);
      this.socket=null;
      this.disconnected();
    });
  }

  disconnect() {
    window.clearTimeout(this.timer);
    const socket=this.socket;
    this.socket=null;
    this.lastMove={x:0,y:0,at:0};
    socket?.close();
  }

  private send(packet: ClientPacket) {
    if (this.socket?.readyState===WebSocket.OPEN) this.socket.send(JSON.stringify(packet));
  }
  action(packet: RoomCommand) { this.send(packet); }
  move(x:number,y:number) {
    const now=performance.now();
    const last=this.lastMove;
    if (last.x===x && last.y===y && ((!x&&!y) || now-last.at<160)) return;
    this.lastMove={x,y,at:now};
    this.send({type:'move',x,y});
  }
}
