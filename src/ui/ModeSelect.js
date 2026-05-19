export class ModeSelect {
  constructor(container, onSelect, onBack) {
    this.container = container;
    this.onSelect = onSelect; // (mode: 'solo' | 'cpu' | 'net') => void
    this.onBack = onBack;
  }

  show() {
    this.container.innerHTML = `
      <div class="modeselect-screen">
        <div class="modeselect-header">
          <button class="btn btn-small btn-ghost" id="ms-back">← 戻る</button>
          <h2 class="modeselect-title">モード選択</h2>
        </div>

        <div class="mode-cards">

          <!-- 1人プレイ -->
          <div class="mode-card" id="mode-solo">
            <div class="mode-card-inner">
              <div class="mode-icon-wrap mode-icon-solo">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="20" r="12" fill="currentColor" opacity="0.9"/>
                  <path d="M10 54c0-12.15 9.85-22 22-22s22 9.85 22 22" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.9"/>
                </svg>
              </div>
              <div class="mode-info">
                <div class="mode-name">1人で遊ぶ</div>
                <div class="mode-desc">スコアを積み上げ自己ベストに挑戦。<br>ハイスコアはキャラ別に記録。</div>
              </div>
              <div class="mode-arrow">→</div>
            </div>
          </div>

          <!-- CPU対戦 -->
          <div class="mode-card" id="mode-cpu">
            <div class="mode-card-inner">
              <div class="mode-icon-wrap mode-icon-cpu">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="14" y="14" width="36" height="36" rx="6" stroke="currentColor" stroke-width="4" fill="none" opacity="0.9"/>
                  <rect x="22" y="22" width="8" height="8" rx="2" fill="currentColor" opacity="0.8"/>
                  <rect x="34" y="22" width="8" height="8" rx="2" fill="currentColor" opacity="0.8"/>
                  <path d="M24 38 Q32 44 40 38" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.8"/>
                  <line x1="22" y1="8" x2="22" y2="14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                  <line x1="32" y1="8" x2="32" y2="14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                  <line x1="42" y1="8" x2="42" y2="14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                  <line x1="22" y1="50" x2="22" y2="56" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                  <line x1="32" y1="50" x2="32" y2="56" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                  <line x1="42" y1="50" x2="42" y2="56" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                  <line x1="8" y1="22" x2="14" y2="22" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                  <line x1="8" y1="32" x2="14" y2="32" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                  <line x1="8" y1="42" x2="14" y2="42" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                  <line x1="50" y1="22" x2="56" y2="22" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                  <line x1="50" y1="32" x2="56" y2="32" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                  <line x1="50" y1="42" x2="56" y2="42" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="mode-info">
                <div class="mode-name">CPU と対戦</div>
                <div class="mode-desc">コンピューターと2人対戦。<br>難易度は3段階から選べます。</div>
                <div class="mode-tags">
                  <span class="mode-tag">やさしい</span>
                  <span class="mode-tag">ふつう</span>
                  <span class="mode-tag">むずかしい</span>
                </div>
              </div>
              <div class="mode-arrow">→</div>
            </div>
          </div>

          <!-- ネット対戦 -->
          <div class="mode-card" id="mode-net">
            <div class="mode-card-inner">
              <div class="mode-icon-wrap mode-icon-net">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="22" stroke="currentColor" stroke-width="4" fill="none" opacity="0.9"/>
                  <ellipse cx="32" cy="32" rx="10" ry="22" stroke="currentColor" stroke-width="3" fill="none" opacity="0.9"/>
                  <line x1="10" y1="32" x2="54" y2="32" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
                  <line x1="13" y1="20" x2="51" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
                  <line x1="13" y1="44" x2="51" y2="44" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
                </svg>
              </div>
              <div class="mode-info">
                <div class="mode-name">ネット対戦</div>
                <div class="mode-desc">ルームコードを友達と共有して<br>リアルタイムで対戦。</div>
              </div>
              <div class="mode-arrow">→</div>
            </div>
          </div>

        </div>
      </div>
    `;

    document.getElementById('ms-back').addEventListener('click', () => this.onBack());
    document.getElementById('mode-solo').addEventListener('click', () => this.onSelect('solo'));
    document.getElementById('mode-cpu').addEventListener('click', () => this.onSelect('cpu'));
    document.getElementById('mode-net').addEventListener('click', () => this.onSelect('net'));
  }

  hide() {
    this.container.innerHTML = '';
  }
}
