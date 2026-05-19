export class NetClient {
  constructor() {
    this.ws       = null;
    this.handlers = {};
  }

  connect(url) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.onopen  = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = ({ data }) => {
        let msg;
        try { msg = JSON.parse(data); } catch { return; }
        (this.handlers[msg.type] || []).forEach(h => h(msg));
      };
      this.ws.onclose = () => {
        (this.handlers['_disconnect'] || []).forEach(h => h());
      };
    });
  }

  on(type, handler) {
    if (!this.handlers[type]) this.handlers[type] = [];
    this.handlers[type].push(handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    if (!this.handlers[type]) return;
    this.handlers[type] = this.handlers[type].filter(h => h !== handler);
  }

  send(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  disconnect() {
    this.ws?.close();
    this.ws       = null;
    this.handlers = {};
  }

  get wsUrl() {
    // 環境変数で上書き可能（本番デプロイ時に設定）
    if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host  = location.hostname === 'localhost' ? 'localhost:8080' : location.host;
    return `${proto}//${host}`;
  }
}
