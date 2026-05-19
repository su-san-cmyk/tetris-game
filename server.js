import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 8080;
const wss  = new WebSocketServer({ port: PORT });

// code → { players: [ws, ws?] }
const rooms = new Map();

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function getRoom(ws) {
  return ws.roomCode ? rooms.get(ws.roomCode) : null;
}

function relay(ws, obj) {
  const room = getRoom(ws);
  if (!room) return;
  room.players.forEach(p => { if (p !== ws) send(p, obj); });
}

wss.on('connection', ws => {
  ws.roomCode = null;

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'create_room': {
        let code;
        do { code = genCode(); } while (rooms.has(code));
        rooms.set(code, { players: [ws] });
        ws.roomCode = code;
        send(ws, { type: 'room_created', code });
        console.log(`[room] created ${code}`);
        break;
      }

      case 'join_room': {
        const code = (msg.code || '').toUpperCase().trim();
        const room  = rooms.get(code);
        if (!room)               { send(ws, { type: 'error', msg: '部屋が見つかりません' }); return; }
        if (room.players.length >= 2) { send(ws, { type: 'error', msg: '部屋が満員です' }); return; }
        room.players.push(ws);
        ws.roomCode = code;
        send(ws, { type: 'room_joined', code });
        send(room.players[0], { type: 'opponent_joined' });
        console.log(`[room] ${code} full`);
        break;
      }

      // それ以外はそのまま相手に中継
      default:
        relay(ws, msg);
        break;
    }
  });

  ws.on('close', () => {
    const code = ws.roomCode;
    if (!code) return;
    relay(ws, { type: 'opponent_disconnected' });
    rooms.delete(code);
    console.log(`[room] ${code} closed`);
  });

  ws.on('error', () => {});
});

console.log(`WebSocket server listening on port ${PORT}`);
