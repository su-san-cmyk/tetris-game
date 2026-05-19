export class GameOver {
  constructor(container, onRetry, onTitle) {
    this.container = container;
    this.onRetry = onRetry;
    this.onTitle = onTitle;
  }

  show(score, level, lines, character) {
    const prevBest = parseInt(localStorage.getItem(`highscore_${character.id}`) || '0');
    const isNewRecord = score > prevBest;

    this.container.innerHTML = `
      <div class="gameover-screen">
        <div class="gameover-content">
          <div class="gameover-title">GAME OVER</div>
          ${isNewRecord ? '<div class="new-record">🏆 NEW RECORD!</div>' : ''}
          <div class="gameover-char" style="background:${character.bgGradient}">
            ${character.emoji} ${character.name}
          </div>
          <div class="gameover-stats">
            <div class="stat-row">
              <span class="stat-label">スコア</span>
              <span class="stat-value font-mono">${score.toLocaleString()}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">レベル</span>
              <span class="stat-value font-mono">${level}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">ライン数</span>
              <span class="stat-value font-mono">${lines}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">ベスト</span>
              <span class="stat-value font-mono">${Math.max(score, prevBest).toLocaleString()}</span>
            </div>
          </div>
          <div class="gameover-buttons">
            <button class="btn btn-primary btn-large" id="btn-retry">リトライ</button>
            <button class="btn btn-secondary" id="btn-title">タイトルへ</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-retry').addEventListener('click', () => this.onRetry(character));
    document.getElementById('btn-title').addEventListener('click', () => this.onTitle());
  }

  hide() {
    this.container.innerHTML = '';
  }
}
