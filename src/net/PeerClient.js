import Peer from 'peerjs';

const CHARS  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PREFIX = 'tbg-';

function genCode() {
  return Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

export class PeerClient {
  constructor() {
    this.peer     = null;
    this.conn     = null;
    this.handlers = {};
    this._buffer  = []; // リスナー未登録のメッセージを一時保持
  }

  // ホスト: 部屋を作る → Promise<code>
  createRoom() {
    return new Promise((resolve, reject) => {
      const code   = genCode();
      const peerId = PREFIX + code;

      this.peer = new Peer(peerId);

      const timer = setTimeout(() => {
        this.peer?.destroy();
        reject(new Error('接続タイムアウト'));
      }, 15000);

      this.peer.on('open', () => {
        clearTimeout(timer);
        resolve(code);
      });

      this.peer.on('error', (err) => {
        clearTimeout(timer);
        if (err.type === 'unavailable-id') {
          // コードが使用中なら別のコードで再試行
          this.peer.destroy();
          this.peer = null;
          this.createRoom().then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });

      // ゲストからの接続を待つ
      this.peer.on('connection', (conn) => {
        this.conn = conn;
        conn.on('open', () => {
          this._setupConn();
          this._emit('opponent_joined', {});
        });
      });
    });
  }

  // ゲスト: 部屋に参加 → Promise<void>
  joinRoom(code) {
    return new Promise((resolve, reject) => {
      const peerId = PREFIX + code.toUpperCase().trim();

      this.peer = new Peer();

      const timer = setTimeout(() => {
        this.peer?.destroy();
        reject(new Error('接続タイムアウト'));
      }, 15000);

      this.peer.on('open', () => {
        const conn = this.peer.connect(peerId, { reliable: true });
        this.conn  = conn;

        conn.on('open', () => {
          clearTimeout(timer);
          this._setupConn();
          resolve();
        });

        conn.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });

      this.peer.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  _setupConn() {
    this.conn.on('data',  (data) => { if (data?.type) this._emit(data.type, data); });
    this.conn.on('close', ()     => this._emit('_disconnect', {}));
    this.conn.on('error', ()     => this._emit('_disconnect', {}));
  }

  on(type, handler) {
    if (!this.handlers[type]) this.handlers[type] = [];
    this.handlers[type].push(handler);
    // リスナー登録前に届いていたメッセージを即時配送
    const pending = this._buffer.filter(m => m.type === type);
    this._buffer  = this._buffer.filter(m => m.type !== type);
    pending.forEach(m => handler(m));
    return () => this.off(type, handler);
  }

  off(type, handler) {
    if (!this.handlers[type]) return;
    this.handlers[type] = this.handlers[type].filter(h => h !== handler);
  }

  _emit(type, data) {
    const handlers = this.handlers[type] || [];
    if (handlers.length === 0) {
      this._buffer.push(data); // リスナーがいなければバッファに積む
    } else {
      handlers.forEach(h => h(data));
    }
  }

  send(obj) {
    if (this.conn?.open) this.conn.send(obj);
  }

  disconnect() {
    this.conn?.close();
    this.peer?.destroy();
    this.conn     = null;
    this.peer     = null;
    this.handlers = {};
    this._buffer  = [];
  }
}
