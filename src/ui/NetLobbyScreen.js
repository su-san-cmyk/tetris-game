export class NetLobbyScreen {
  constructor(container, net, onMatched, onBack) {
    this.container = container;
    this.net       = net;
    this.onMatched = onMatched;
    this.onBack    = onBack;
    this._unsubs   = [];
  }

  show() {
    this.container.innerHTML = `
      <div class="netlobby-screen">
        <div class="netlobby-header">
          <button class="btn btn-small btn-ghost" id="nl-back">← 戻る</button>
          <h2 class="netlobby-title">ネット対戦</h2>
        </div>

        <div class="netlobby-body">
          <!-- 部屋を作る -->
          <div class="netlobby-card">
            <div class="netlobby-card-icon">🏠</div>
            <div class="netlobby-card-label">部屋を作る</div>
            <div class="netlobby-card-desc">ルームコードを友達に教えて待つ</div>
            <button class="btn btn-primary" id="nl-create">部屋を作る</button>
          </div>

          <div class="netlobby-or">または</div>

          <!-- 参加する -->
          <div class="netlobby-card">
            <div class="netlobby-card-icon">🚪</div>
            <div class="netlobby-card-label">コードで参加</div>
            <div class="netlobby-card-desc">友達から聞いたコードを入力</div>
            <div class="netlobby-input-row">
              <input class="netlobby-input" id="nl-code" placeholder="ABCD" maxlength="4" autocomplete="off" />
            </div>
            <button class="btn btn-secondary" id="nl-join">参加する</button>
          </div>
        </div>

        <div class="netlobby-status" id="nl-status" style="display:none"></div>
      </div>
    `;

    document.getElementById('nl-back').addEventListener('click', () => {
      this.net.disconnect();
      this._cleanup();
      this.onBack();
    });

    document.getElementById('nl-create').addEventListener('click', () => this._create());
    document.getElementById('nl-join').addEventListener('click',   () => this._join());
    document.getElementById('nl-code').addEventListener('keydown', e => {
      if (e.key === 'Enter') this._join();
    });
  }

  async _create() {
    this._setStatus('接続中...'); this._lockUI();
    try {
      const code = await this.net.createRoom();
      this._onCreated(code);

      // 相手が接続してきたら対戦開始
      const unsub = this.net.on('opponent_joined', () => {
        unsub();
        this._setStatus('🎮 対戦相手が見つかりました！');
        this._cleanup();
        setTimeout(() => this.onMatched(), 600);
      });
      this._unsubs.push(unsub);

      // 待機中に切断された場合
      const unsubDc = this.net.on('_disconnect', () => {
        unsubDc();
        this._setStatus('接続が切れました', true);
        this._unlockUI();
      });
      this._unsubs.push(unsubDc);

    } catch {
      this._setStatus('シグナリングサーバーに接続できませんでした', true);
      this._unlockUI();
    }
  }

  async _join() {
    const code = (document.getElementById('nl-code')?.value || '').trim().toUpperCase();
    if (code.length !== 4) { this._setStatus('4文字のコードを入力してください', true); return; }
    this._setStatus('接続中...'); this._lockUI();
    try {
      await this.net.joinRoom(code);
      this._setStatus('✅ 対戦相手に接続しました！');
      this._cleanup();
      setTimeout(() => this.onMatched(), 600);
    } catch (err) {
      const msg = err?.type === 'peer-unavailable'
        ? '部屋が見つかりません（コードを確認してください）'
        : '接続できませんでした';
      this._setStatus(msg, true);
      this._unlockUI();
      this.net.disconnect();
    }
  }

  _onCreated(code) {
    this._setStatus(`
      <div class="nl-code-display">
        <div class="nl-code-label">ルームコード</div>
        <div class="nl-code-value">${code}</div>
        <div class="nl-code-hint">このコードを友達に伝えてください</div>
      </div>
      <div class="nl-waiting">⏳ 相手を待っています...</div>
    `);
  }

  _setStatus(html, isError = false) {
    const el = document.getElementById('nl-status');
    if (!el) return;
    el.style.display = 'block';
    el.innerHTML = isError ? `<span class="nl-error">${html}</span>` : html;
  }

  _lockUI() {
    ['nl-create', 'nl-join', 'nl-code'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });
  }

  _unlockUI() {
    ['nl-create', 'nl-join', 'nl-code'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = false;
    });
  }

  _cleanup() {
    this._unsubs.forEach(fn => fn?.());
    this._unsubs = [];
  }

  hide() {
    this._cleanup();
    this.container.innerHTML = '';
  }
}
