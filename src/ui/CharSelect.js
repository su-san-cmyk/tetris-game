import { CHARACTERS } from '../characters/characters.js';

export class CharSelect {
  constructor(container, onSelect, onBack, mode = 'solo', difficulty = null) {
    this.container = container;
    this.onSelect = onSelect;
    this.onBack = onBack;
    this.mode = mode;
    this.difficulty = difficulty;
    this.selectedIndex = 0;
  }

  _modeLabel() {
    if (this.mode === 'cpu' && this.difficulty) {
      return `🤖 CPU対戦 ／ ${this.difficulty.icon} ${this.difficulty.label}`;
    }
    return '🎮 1人プレイ';
  }

  show() {
    this.container.innerHTML = `
      <div class="charselect-screen">
        <div class="charselect-header">
          <button class="btn btn-small btn-ghost" id="cs-back">← 戻る</button>
          <h2 class="charselect-title">キャラクター選択</h2>
          <span class="charselect-mode-badge">${this._modeLabel()}</span>
        </div>
        <div class="char-cards" id="char-cards">
          ${CHARACTERS.map((c, i) => this._renderCard(c, i)).join('')}
        </div>
        <div class="charselect-footer">
          <button class="btn btn-primary btn-large" id="cs-confirm">このキャラで開始</button>
        </div>
      </div>
    `;

    CHARACTERS.forEach((_, i) => {
      document.getElementById(`char-card-${i}`).addEventListener('click', () => {
        this.selectedIndex = i;
        this._updateSelection();
      });
    });

    document.getElementById('cs-back').addEventListener('click', () => this.onBack());
    document.getElementById('cs-confirm').addEventListener('click', () => {
      this.onSelect(CHARACTERS[this.selectedIndex]);
    });

    this._updateSelection();
  }

  _renderCard(char, index) {
    const hs = localStorage.getItem(`highscore_${char.id}`) || '0';
    return `
      <div class="char-card" id="char-card-${index}" style="--char-color: ${char.color}; --char-accent: ${char.accentColor}">
        <div class="char-card-bg" style="background: ${char.bgGradient}"></div>
        <div class="char-card-content">
          <div class="char-face">${char.svgFace}</div>
          <div class="char-name">${char.name}</div>
          <div class="char-subtitle">${char.subtitle}</div>
          <div class="char-desc">${char.description}</div>
          <div class="char-hs">Best: <span class="font-mono">${parseInt(hs).toLocaleString()}</span></div>
        </div>
      </div>
    `;
  }

  _updateSelection() {
    document.querySelectorAll('.char-card').forEach((el, i) => {
      el.classList.toggle('selected', i === this.selectedIndex);
    });
  }

  hide() {
    this.container.innerHTML = '';
  }
}
