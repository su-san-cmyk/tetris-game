export const CPU_DIFFICULTIES = {
  easy: {
    id: 'easy', label: 'やさしい', icon: '😊', color: '#22C55E',
    desc: 'とてもゆっくり動きます。\nテトリスが初めての人向け。',
    baseThinkMs: 1200,  // 基本思考時間（落下速度でキャップされる）
    stepMs: 180,        // 1アクションごとの間隔（ms）
    topK: 6,            // 上位6手からランダム選択
  },
  normal: {
    id: 'normal', label: 'ふつう', icon: '😐', color: '#F97316',
    desc: '一般的なペースで動きます。\n手ごたえのある対戦が楽しめます。',
    baseThinkMs: 400,
    stepMs: 60,
    topK: 2,            // 上位2手からランダム選択
  },
  hard: {
    id: 'hard', label: 'むずかしい', icon: '😈', color: '#EF4444',
    desc: '高速・高精度なCPU。\n上級者向けの本気の挑戦。',
    baseThinkMs: 100,   // わずかな思考ポーズ
    stepMs: 25,         // 高速だが視認可能な動き
    topK: 1,            // 常に最善手
  },
};

export class DifficultySelect {
  constructor(container, onSelect, onBack) {
    this.container = container;
    this.onSelect = onSelect; // (difficulty) => void
    this.onBack = onBack;
    this.selected = 'normal';
  }

  show() {
    this.container.innerHTML = `
      <div class="diffselect-screen">
        <div class="diffselect-header">
          <button class="btn btn-small btn-ghost" id="ds-back">← 戻る</button>
          <h2 class="diffselect-title">CPUの強さを選択</h2>
        </div>

        <div class="diff-cards">
          ${Object.values(CPU_DIFFICULTIES).map(d => this._renderCard(d)).join('')}
        </div>

        <div class="diffselect-footer">
          <button class="btn btn-primary btn-large" id="ds-confirm">この強さで対戦</button>
        </div>
      </div>
    `;

    Object.values(CPU_DIFFICULTIES).forEach(d => {
      document.getElementById(`diff-${d.id}`).addEventListener('click', () => {
        this.selected = d.id;
        this._updateSelection();
      });
    });

    document.getElementById('ds-back').addEventListener('click', () => this.onBack());
    document.getElementById('ds-confirm').addEventListener('click', () => {
      this.onSelect(CPU_DIFFICULTIES[this.selected]);
    });

    this._updateSelection();
  }

  _renderCard(d) {
    return `
      <div class="diff-card" id="diff-${d.id}" style="--diff-color: ${d.color}">
        <div class="diff-icon">${d.icon}</div>
        <div class="diff-name" style="color: ${d.color}">${d.label}</div>
        <div class="diff-desc">${d.desc.replace('\n', '<br>')}</div>
        <div class="diff-meter">
          ${this._renderMeter(d.id)}
        </div>
      </div>
    `;
  }

  _renderMeter(id) {
    const levels = { easy: 1, normal: 2, hard: 3 };
    const n = levels[id];
    return Array.from({ length: 3 }, (_, i) =>
      `<div class="diff-bar ${i < n ? 'diff-bar-on' : ''}" style="${i < n ? `background: var(--diff-color)` : ''}"></div>`
    ).join('');
  }

  _updateSelection() {
    document.querySelectorAll('.diff-card').forEach(el => {
      el.classList.toggle('selected', el.id === `diff-${this.selected}`);
    });
  }

  hide() {
    this.container.innerHTML = '';
  }
}
