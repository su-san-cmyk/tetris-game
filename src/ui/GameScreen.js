import { Game } from '../core/Game.js';
import { CELL_SIZE, BOARD_COLS, BOARD_ROWS } from '../core/constants.js';

export class GameScreen {
  constructor(container, character, soundManager, onGameOver, onTitle) {
    this.container = container;
    this.character = character;
    this.soundManager = soundManager;
    this.onGameOver = onGameOver;
    this.onTitle = onTitle;

    this.game = null;
    this.canvas = null;
    this.ctx = null;
    this.holdCanvas = null;
    this.holdCtx = null;
    this.nextCanvas = null;
    this.nextCtx = null;
    this.scoreEl = null;
    this.levelEl = null;
    this.linesEl = null;
    this.bestEl = null;
    this.flashLines = [];
    this.flashFrame = 0;

    this._keyHandler = this._onKeyDown.bind(this);
  }

  show() {
    const BOARD_W = CELL_SIZE * BOARD_COLS;
    const BOARD_H = CELL_SIZE * BOARD_ROWS;

    this.container.innerHTML = `
      <div class="game-screen">
        <div class="game-layout">
          <!-- 左パネル: HOLD -->
          <div class="side-panel left-panel">
            <div class="panel-section">
              <div class="panel-label">HOLD</div>
              <canvas id="hold-canvas" width="${CELL_SIZE * 4}" height="${CELL_SIZE * 4}"></canvas>
            </div>
            <div class="panel-section">
              <div class="panel-label">キャラ</div>
              <div class="char-badge" style="background:${this.character.bgGradient}">
                <div class="char-badge-face">${this.character.svgFace}</div>
                <span>${this.character.name}</span>
              </div>
            </div>
          </div>

          <!-- 中央: メインボード -->
          <div class="board-container">
            <canvas id="game-canvas" width="${BOARD_W}" height="${BOARD_H}"></canvas>
            <div class="pause-overlay" id="pause-overlay" style="display:none">
              <div class="pause-content">
                <h2>一時停止</h2>
                <p>P キーで再開</p>
                <button class="btn btn-primary" id="btn-resume">再開</button>
                <button class="btn btn-secondary" id="btn-to-title">タイトルへ</button>
              </div>
            </div>
          </div>

          <!-- 右パネル: NEXT/スコア -->
          <div class="side-panel right-panel">
            <div class="panel-section">
              <div class="panel-label">NEXT</div>
              <canvas id="next-canvas" width="${CELL_SIZE * 4}" height="${CELL_SIZE * 4 * 3 + 8}"></canvas>
            </div>
            <div class="panel-section score-panel">
              <div class="score-item">
                <div class="score-label">SCORE</div>
                <div class="score-value font-mono" id="score-val">0</div>
              </div>
              <div class="score-item">
                <div class="score-label">LEVEL</div>
                <div class="score-value font-mono" id="level-val">1</div>
              </div>
              <div class="score-item">
                <div class="score-label">LINES</div>
                <div class="score-value font-mono" id="lines-val">0</div>
              </div>
              <div class="score-item">
                <div class="score-label">BEST</div>
                <div class="score-value font-mono" id="best-val">0</div>
              </div>
            </div>
            <div class="panel-section">
              <button class="btn btn-small btn-ghost" id="btn-pause-side">⏸ 一時停止</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.holdCanvas = document.getElementById('hold-canvas');
    this.holdCtx = this.holdCanvas.getContext('2d');
    this.nextCanvas = document.getElementById('next-canvas');
    this.nextCtx = this.nextCanvas.getContext('2d');

    this.scoreEl = document.getElementById('score-val');
    this.levelEl = document.getElementById('level-val');
    this.linesEl = document.getElementById('lines-val');
    this.bestEl = document.getElementById('best-val');

    document.getElementById('btn-resume').addEventListener('click', () => this._resume());
    document.getElementById('btn-to-title').addEventListener('click', () => this._goTitle());
    document.getElementById('btn-pause-side').addEventListener('click', () => this._togglePause());

    document.addEventListener('keydown', this._keyHandler);

    this.game = new Game(this.character, {
      onRender: () => this._render(),
      onScoreUpdate: (score, level, lines) => this._updateHUD(score, level, lines),
      onGameOver: (score, level, lines) => this._handleGameOver(score, level, lines),
      onLinesCleared: (n) => {
        this.soundManager.playSE('line-clear');
      },
      onPieceLocked: () => {
        this.soundManager.playSE('drop');
      },
      onPieceRotated: () => {
        this.soundManager.playSE('rotate');
      },
      onPauseChange: (paused) => {
        const overlay = document.getElementById('pause-overlay');
        if (overlay) overlay.style.display = paused ? 'flex' : 'none';
      },
    });

    const hs = this.game.getHighScore(this.character.id);
    this.bestEl.textContent = hs.toLocaleString();

    this.soundManager.playBGM();
    this.game.start();
  }

  _onKeyDown(e) {
    if (!this.game) return;
    switch (e.code) {
      case 'ArrowLeft':  e.preventDefault(); this.game.moveLeft(); break;
      case 'ArrowRight': e.preventDefault(); this.game.moveRight(); break;
      case 'ArrowDown':  e.preventDefault(); this.game.softDrop(); break;
      case 'ArrowUp':    e.preventDefault(); this.game.rotate(1); break;
      case 'KeyZ':       this.game.rotate(-1); break;
      case 'Space':      e.preventDefault(); this.game.hardDrop(); break;
      case 'KeyC':       this.game.hold(); break;
      case 'KeyP':       this._togglePause(); break;
      case 'Escape':     this._goTitle(); break;
    }
  }

  _togglePause() {
    if (!this.game) return;
    this.game.togglePause();
    if (this.game.isPaused) {
      this.soundManager.pauseBGM();
    } else {
      this.soundManager.resumeBGM();
    }
  }

  _resume() {
    if (this.game && this.game.isPaused) this._togglePause();
  }

  _goTitle() {
    this.game && this.game.destroy();
    this.soundManager.stopBGM();
    document.removeEventListener('keydown', this._keyHandler);
    this.onTitle();
  }

  _handleGameOver(score, level, lines) {
    this.soundManager.stopBGM();
    this.soundManager.playSE('gameover');
    document.removeEventListener('keydown', this._keyHandler);
    setTimeout(() => {
      this.onGameOver(score, level, lines, this.character);
    }, 1500);
  }

  _updateHUD(score, level, lines) {
    if (this.scoreEl) this.scoreEl.textContent = score.toLocaleString();
    if (this.levelEl) this.levelEl.textContent = level;
    if (this.linesEl) this.linesEl.textContent = lines;
    if (this.bestEl) {
      const hs = Math.max(score, this.game.getHighScore(this.character.id));
      this.bestEl.textContent = hs.toLocaleString();
    }
  }

  _render() {
    this._drawBoard();
    this._drawHold();
    this._drawNext();
  }

  _drawBoard() {
    const ctx = this.ctx;
    const cs = CELL_SIZE;

    // 背景
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(0, 0, BOARD_COLS * cs, BOARD_ROWS * cs);

    // グリッド線
    ctx.strokeStyle = 'rgba(232,236,239,0.08)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= BOARD_COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, BOARD_ROWS * cs); ctx.stroke();
    }
    for (let r = 0; r <= BOARD_ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * cs); ctx.lineTo(BOARD_COLS * cs, r * cs); ctx.stroke();
    }

    // 固定ブロック
    const grid = this.game.board.grid;
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (grid[r][c]) {
          this._drawCell(ctx, c, r, grid[r][c]);
        }
      }
    }

    // ゴーストピース
    if (this.game.currentPiece) {
      const ghostY = this.game.getGhostPosition();
      const ghostCells = this.game.currentPiece.getCellsAt(
        this.game.currentPiece.x, ghostY, this.game.currentPiece.rotation
      );
      ghostCells.forEach(([x, y]) => {
        if (y >= 0) {
          ctx.fillStyle = this.game.currentPiece.color + '40';
          ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
          ctx.strokeStyle = this.game.currentPiece.color + '80';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
        }
      });

      // 現在ピース
      this.game.currentPiece.getCells().forEach(([x, y]) => {
        if (y >= 0) this._drawCell(ctx, x, y, this.game.currentPiece.color);
      });
    }

    // ライン消去エフェクト
    this._drawClearEffect(ctx, this.game, cs);

    // ゲームオーバーオーバーレイ
    if (this.game.isGameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, BOARD_COLS * cs, BOARD_ROWS * cs);
      ctx.fillStyle = '#FFB85C';
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', BOARD_COLS * cs / 2, BOARD_ROWS * cs / 2);
    }
  }

  _drawClearEffect(ctx, game, cs) {
    if (!game.clearingRows?.length) return;
    const phase  = game.clearPhase;
    const effect = this.character.clearEffect || 'flash';
    const W = BOARD_COLS * cs;

    game.clearingRows.forEach(r => {
      const y = r * cs;
      switch (effect) {

        case 'flash': {
          // 白くフラッシュして消える（sin カーブで自然に）
          const a = Math.sin(phase * Math.PI);
          ctx.fillStyle = `rgba(255,255,255,${a * 0.92})`;
          ctx.fillRect(0, y, W, cs);
          break;
        }

        case 'ripple': {
          // 水色の波が中央から左右に広がる
          const mid  = BOARD_COLS / 2;
          const span = phase * (mid + 1);
          for (let c = 0; c < BOARD_COLS; c++) {
            if (Math.abs(c + 0.5 - mid) < span) {
              const dist = Math.abs(c + 0.5 - mid) / span;
              const a    = (1 - dist * 0.5) * (1 - phase * 0.6);
              ctx.fillStyle = `rgba(0,207,255,${a * 0.95})`;
              ctx.fillRect(c * cs + 1, y + 1, cs - 2, cs - 2);
            }
          }
          break;
        }

        case 'burn': {
          // 炎色で両端から中央へ燃え広がり、後半で爆発
          if (phase < 0.55) {
            const progress = phase / 0.55;
            const covered  = Math.ceil(progress * (BOARD_COLS / 2 + 1));
            for (let c = 0; c < BOARD_COLS; c++) {
              const fromEdge = c < covered || c >= BOARD_COLS - covered;
              if (fromEdge) {
                const g = Math.floor(60 + 80 * (1 - progress));
                ctx.fillStyle = `rgba(255,${g},0,0.88)`;
                ctx.fillRect(c * cs + 1, y + 1, cs - 2, cs - 2);
              }
            }
          } else {
            const burst = (phase - 0.55) / 0.45;
            const a     = (1 - burst) * 0.95;
            const g     = Math.floor(120 * (1 - burst));
            ctx.fillStyle = `rgba(255,${g},0,${a})`;
            ctx.fillRect(0, y, W, cs);
          }
          break;
        }

        case 'glitch': {
          // 行ごとにランダムにずれてノイズで溶ける
          const seed  = r * 137;
          const shift = Math.round(Math.sin(seed + phase * 18) * 14 * phase);
          ctx.save();
          ctx.globalAlpha = 1 - phase * 0.75;
          // 白いフラッシュ
          ctx.fillStyle = `rgba(255,255,255,${phase * 0.8})`;
          ctx.fillRect(0, y, W, cs);
          // スキャンライン
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          for (let i = 1; i < cs; i += 3) ctx.fillRect(0, y + i, W, 1);
          // 横ずれカラーノイズ
          if (phase > 0.25) {
            ctx.globalAlpha = (phase - 0.25) * 0.6;
            ctx.fillStyle   = `rgba(0,255,200,0.7)`;
            ctx.fillRect(shift, y + 2, W, Math.floor(cs / 3));
            ctx.fillStyle = `rgba(255,0,100,0.7)`;
            ctx.fillRect(-shift, y + Math.floor(cs * 0.55), W, Math.floor(cs / 3));
          }
          ctx.restore();
          break;
        }
      }
    });
  }

  _drawCell(ctx, col, row, color, alpha = 1) {
    const cs = CELL_SIZE;
    const x = col * cs;
    const y = row * cs;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);

    // ハイライト（上・左）
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x + 1, y + 1, cs - 2, 3);
    ctx.fillRect(x + 1, y + 1, 3, cs - 2);

    // シャドウ（下・右）
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 1, y + cs - 4, cs - 2, 3);
    ctx.fillRect(x + cs - 4, y + 1, 3, cs - 2);

    ctx.globalAlpha = 1;
  }

  _drawMiniPiece(ctx, piece, canvasW, canvasH, offsetY = 0) {
    if (!piece) return;
    const cs = CELL_SIZE * 0.8;
    const cells = piece.getCellsAt(0, 0, 0);
    const minC = Math.min(...cells.map(([c]) => c));
    const maxC = Math.max(...cells.map(([c]) => c));
    const minR = Math.min(...cells.map(([, r]) => r));
    const maxR = Math.max(...cells.map(([, r]) => r));
    const pw = (maxC - minC + 1) * cs;
    const ph = (maxR - minR + 1) * cs;
    const startX = (canvasW - pw) / 2;
    const slotH = CELL_SIZE * 4 * 0.8;
    const startY = offsetY + (slotH - ph) / 2;

    cells.forEach(([c, r]) => {
      const dx = startX + (c - minC) * cs;
      const dy = startY + (r - minR) * cs;
      ctx.fillStyle = piece.color;
      ctx.fillRect(dx + 1, dy + 1, cs - 2, cs - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(dx + 1, dy + 1, cs - 2, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(dx + 1, dy + cs - 3, cs - 2, 2);
    });
  }

  _drawHold() {
    const ctx = this.holdCtx;
    const w = this.holdCanvas.width;
    const h = this.holdCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(0, 0, w, h);

    if (this.game.heldPiece) {
      ctx.globalAlpha = this.game.canHold ? 1.0 : 0.4;
      this._drawMiniPiece(ctx, this.game.heldPiece, w, h);
      ctx.globalAlpha = 1.0;
    }
  }

  _drawNext() {
    const ctx = this.nextCtx;
    const w = this.nextCanvas.width;
    const h = this.nextCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(0, 0, w, h);

    const slotH = h / 3;
    this.game.nextPieces.slice(0, 3).forEach((piece, i) => {
      this._drawMiniPiece(ctx, piece, w, slotH, i * slotH);
    });
  }

  hide() {
    this.container.innerHTML = '';
    document.removeEventListener('keydown', this._keyHandler);
    if (this.game) {
      this.game.destroy();
      this.game = null;
    }
  }
}
