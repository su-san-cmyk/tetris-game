import { CHARACTERS } from '../characters/characters.js';

export class TitleScreen {
  constructor(container, soundManager, onStart) {
    this.container = container;
    this.soundManager = soundManager;
    this.onStart = onStart;
    this.settingsOpen = false;
  }

  show() {
    const totalHS = localStorage.getItem('highscore_total') || '0';

    this.container.innerHTML = `
      <div class="title-screen">
        <div class="title-bg"></div>
        <div class="title-content">
          <div class="title-logo">
            <h1 class="title-text">TETRIS</h1>
            <p class="title-sub">ブロックパズル</p>
          </div>
          <div class="title-highscore">
            <span class="hs-label">ハイスコア</span>
            <span class="hs-value font-mono">${parseInt(totalHS).toLocaleString()}</span>
          </div>
          <div class="title-buttons">
            <button class="btn btn-primary btn-large" id="btn-start">
              ゲームスタート
            </button>
            <button class="btn btn-secondary" id="btn-settings">
              ⚙ 設定
            </button>
          </div>
          <div class="title-controls">
            <p>← → 移動 ｜ ↑ 右回転 ｜ Z 左回転</p>
            <p>↓ ソフトドロップ ｜ Space ハードドロップ ｜ C ホールド</p>
          </div>
        </div>

        <!-- 設定モーダル -->
        <div class="modal-overlay" id="modal-settings" style="display:none">
          <div class="modal">
            <h2 class="modal-title">設定</h2>
            <div class="setting-row">
              <label>BGM 音量</label>
              <input type="range" id="bgm-vol" min="0" max="1" step="0.05" value="${this.soundManager.bgmVolume}">
              <span id="bgm-vol-val">${Math.round(this.soundManager.bgmVolume * 100)}</span>
            </div>
            <div class="setting-row">
              <label>SE 音量</label>
              <input type="range" id="se-vol" min="0" max="1" step="0.05" value="${this.soundManager.seVolume}">
              <span id="se-vol-val">${Math.round(this.soundManager.seVolume * 100)}</span>
            </div>
            <div class="setting-row">
              <label>ミュート</label>
              <button class="btn btn-small" id="btn-mute">${this.soundManager.muted ? '🔇 OFF' : '🔊 ON'}</button>
            </div>
            <button class="btn btn-primary" id="btn-close-settings">閉じる</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-start').addEventListener('click', () => {
      this.onStart();
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
      document.getElementById('modal-settings').style.display = 'flex';
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      document.getElementById('modal-settings').style.display = 'none';
    });

    document.getElementById('bgm-vol').addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.soundManager.setBGMVolume(v);
      document.getElementById('bgm-vol-val').textContent = Math.round(v * 100);
    });

    document.getElementById('se-vol').addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.soundManager.setSEVolume(v);
      document.getElementById('se-vol-val').textContent = Math.round(v * 100);
    });

    document.getElementById('btn-mute').addEventListener('click', (e) => {
      const muted = this.soundManager.toggleMute();
      e.target.textContent = muted ? '🔇 OFF' : '🔊 ON';
    });
  }

  hide() {
    this.container.innerHTML = '';
  }
}
