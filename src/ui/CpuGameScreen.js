import { Game } from '../core/Game.js';
import { CpuAI } from '../core/CpuAI.js';
import { CHARACTERS } from '../characters/characters.js';
import { BOARD_COLS, BOARD_ROWS, FALL_SPEED, CELL_SIZE } from '../core/constants.js';

const CS = 25;          // セルサイズ（CPU対戦用コンパクト表示）
const MINI = CS * 4;    // ミニキャンバス幅

// ライン消去数 → 送り込むお邪魔ライン数
const GARBAGE = [0, 0, 1, 2, 4];

export class CpuGameScreen {
  constructor(container, playerChar, difficulty, soundManager, onBack, onTitle) {
    this.container = container;
    this.playerChar = playerChar;
    this.difficulty = difficulty;
    this.soundManager = soundManager;
    this.onBack = onBack;   // (action: 'retry'|'mode', char?, diff?) => void
    this.onTitle = onTitle;

    // CPU キャラはプレイヤーと別のものをランダムに選択
    const others = CHARACTERS.filter(c => c.id !== playerChar.id);
    this.cpuChar = others[Math.floor(Math.random() * others.length)];

    this.playerGame = null;
    this.cpuGame    = null;
    this.ai         = new CpuAI(difficulty);
    this.cpuTimer   = null;
    this.isOver     = false;

    this._keyHandler = this._onKey.bind(this);
  }

  // ─── 画面構築 ─────────────────────────────────────────
  show() {
    const BW = CS * BOARD_COLS;
    const BH = CS * BOARD_ROWS;
    const NH = MINI * 3 + 8;

    this.container.innerHTML = `
      <div class="cpug-screen">

        <!-- プレイヤー側 -->
        <div class="cpug-side cpug-player-side">
          <div class="cpug-char-label">
            <div class="cpug-face">${this.playerChar.svgFace}</div>
            <div>
              <div class="cpug-name">${this.playerChar.name}</div>
              <div class="cpug-role cpug-you">YOU</div>
            </div>
          </div>
          <div class="cpug-panels">
            <div class="cpug-col cpug-col-left">
              <div class="cpug-label">HOLD</div>
              <canvas id="p-hold" width="${MINI}" height="${MINI}"></canvas>
              <div class="cpug-stats">
                <div class="cpug-stat-item">
                  <div class="cpug-label">SCORE</div>
                  <div class="cpug-val font-mono" id="p-score">0</div>
                </div>
                <div class="cpug-stat-item">
                  <div class="cpug-label">LV</div>
                  <div class="cpug-val font-mono" id="p-level">1</div>
                </div>
                <div class="cpug-stat-item">
                  <div class="cpug-label">LINES</div>
                  <div class="cpug-val font-mono" id="p-lines">0</div>
                </div>
              </div>
            </div>
            <div class="cpug-board-wrap">
              <canvas id="p-board" width="${BW}" height="${BH}"></canvas>
              <div class="cpug-garbage-alert" id="p-garbage"></div>
            </div>
            <div class="cpug-col cpug-col-right">
              <div class="cpug-label">NEXT</div>
              <canvas id="p-next" width="${MINI}" height="${NH}"></canvas>
            </div>
          </div>
        </div>

        <!-- VS -->
        <div class="cpug-vs-col">
          <div class="cpug-vs">VS</div>
        </div>

        <!-- CPU側 -->
        <div class="cpug-side cpug-cpu-side">
          <div class="cpug-char-label">
            <div class="cpug-face">${this.cpuChar.svgFace}</div>
            <div>
              <div class="cpug-name">${this.cpuChar.name}</div>
              <div class="cpug-role cpug-cpu-role">CPU ${this.difficulty.icon} ${this.difficulty.label}</div>
            </div>
          </div>
          <div class="cpug-panels">
            <div class="cpug-board-wrap">
              <canvas id="c-board" width="${BW}" height="${BH}"></canvas>
              <div class="cpug-garbage-alert" id="c-garbage"></div>
            </div>
            <div class="cpug-col cpug-col-right">
              <div class="cpug-label">NEXT</div>
              <canvas id="c-next" width="${MINI}" height="${NH}"></canvas>
              <div class="cpug-stats" style="margin-top:12px">
                <div class="cpug-stat-item">
                  <div class="cpug-label">SCORE</div>
                  <div class="cpug-val font-mono" id="c-score">0</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ポーズオーバーレイ -->
        <div class="cpug-overlay" id="cpug-pause" style="display:none">
          <div class="cpug-overlay-box">
            <div class="cpug-overlay-title">一時停止</div>
            <p style="color:rgba(255,255,255,0.6);font-size:13px">P キーで再開</p>
            <button class="btn btn-primary" id="cpug-resume">再開</button>
            <button class="btn btn-secondary" id="cpug-to-title">タイトルへ</button>
          </div>
        </div>

        <!-- ゲームオーバーオーバーレイ -->
        <div class="cpug-overlay" id="cpug-result" style="display:none">
          <div class="cpug-result-box" id="cpug-result-content"></div>
        </div>
      </div>
    `;

    // Canvas コンテキスト
    this.pBoardCtx = document.getElementById('p-board').getContext('2d');
    this.pHoldCtx  = document.getElementById('p-hold').getContext('2d');
    this.pNextCtx  = document.getElementById('p-next').getContext('2d');
    this.cBoardCtx = document.getElementById('c-board').getContext('2d');
    this.cNextCtx  = document.getElementById('c-next').getContext('2d');

    // HUD
    this.pScoreEl = document.getElementById('p-score');
    this.pLevelEl = document.getElementById('p-level');
    this.pLinesEl = document.getElementById('p-lines');
    this.cScoreEl = document.getElementById('c-score');

    // ポーズボタン
    document.getElementById('cpug-resume').addEventListener('click', () => this._pause(false));
    document.getElementById('cpug-to-title').addEventListener('click', () => this._goTitle());

    document.addEventListener('keydown', this._keyHandler);
    this._applyScale();
    this._addTouchControls();
    this._resizeHandler = () => this._applyScale();
    window.addEventListener('resize', this._resizeHandler);

    // ゲームインスタンス作成
    this.playerGame = new Game(this.playerChar, {
      onRender:      () => this._renderPlayer(),
      onScoreUpdate: (sc, lv, ln) => {
        this.pScoreEl.textContent = sc.toLocaleString();
        this.pLevelEl.textContent = lv;
        this.pLinesEl.textContent = ln;
      },
      onLinesCleared: (n) => {
        this.soundManager.playSE('line-clear');
        const g = GARBAGE[Math.min(n, 4)];
        if (g > 0 && !this.isOver) {
          this.cpuGame?.addGarbageLines(g);
          this._showGarbage('c-garbage', g);
        }
      },
      onPieceLocked:  () => this.soundManager.playSE('drop'),
      onPieceRotated: () => this.soundManager.playSE('rotate'),
      onGameOver:     () => this._handleOver('cpu'),
    });

    this.cpuGame = new Game(this.cpuChar, {
      onRender:      () => this._renderCpu(),
      onScoreUpdate: (sc) => { this.cScoreEl.textContent = sc.toLocaleString(); },
      onLinesCleared: (n) => {
        const g = GARBAGE[Math.min(n, 4)];
        if (g > 0 && !this.isOver) {
          this.playerGame?.addGarbageLines(g);
          this._showGarbage('p-garbage', g);
        }
      },
      onPieceSpawned: () => this._scheduleCpu(),
      onGameOver:     () => this._handleOver('player'),
    });

    this.soundManager.playBGM();
    this.playerGame.start();
    this.cpuGame.start();
  }

  // ─── CPU AI ───────────────────────────────────────────
  _scheduleCpu() {
    if (this.isOver || !this.cpuGame?.currentPiece) return;
    clearTimeout(this.cpuTimer);

    // ① スポーン直後（y≈0）に最善手を計算 → 位置精度が高い
    const move = this.ai.findBestMove(
      this.cpuGame.board.grid,
      this.cpuGame.currentPiece
    );
    if (!move) return;

    // ② アクション列を組み立て: 回転 → 横移動 → ハードドロップ
    const actions = [];
    const rotSteps = (move.rotation - this.cpuGame.currentPiece.rotation + 4) % 4;
    for (let i = 0; i < rotSteps; i++) actions.push('rotate');
    const dx = move.x - this.cpuGame.currentPiece.x;
    for (let i = 0; i < Math.abs(dx); i++) actions.push(dx > 0 ? 'right' : 'left');
    actions.push('drop');

    // ③ 初期思考ディレイをキャップ（ピースが落ちすぎる前に動き始める）
    const lvIdx = Math.min((this.cpuGame.level ?? 1) - 1, FALL_SPEED.length - 1);
    const msPerCell = FALL_SPEED[lvIdx] * (1000 / 60);
    const safeDelay = Math.min(this.difficulty.baseThinkMs, msPerCell * 2);

    this.cpuTimer = setTimeout(() => this._runActions(actions, 0), safeDelay);
  }

  // アクションを stepMs ごとに1つずつ実行（自然な動きに見せる）
  _runActions(actions, idx) {
    if (idx >= actions.length || this.isOver || !this.cpuGame?.currentPiece || this.cpuGame.isPaused) return;

    const a = actions[idx];
    if      (a === 'rotate') this.cpuGame.rotate(1);
    else if (a === 'right')  this.cpuGame.moveRight();
    else if (a === 'left')   this.cpuGame.moveLeft();
    else if (a === 'drop')   { this.cpuGame.hardDrop(); return; }

    const { stepMs } = this.difficulty;
    if (stepMs > 0) {
      this.cpuTimer = setTimeout(() => this._runActions(actions, idx + 1), stepMs);
    } else {
      this._runActions(actions, idx + 1);
    }
  }

  // ─── ゲームオーバー処理 ────────────────────────────────
  _handleOver(winner) {
    if (this.isOver) return;
    this.isOver = true;
    clearTimeout(this.cpuTimer);
    this.playerGame?.destroy();
    this.cpuGame?.destroy();
    this.soundManager.stopBGM();
    this.soundManager.playSE('gameover');
    setTimeout(() => this._showResult(winner), 900);
  }

  _showResult(winner) {
    const isWin  = winner === 'player';
    const pScore = this.playerGame?.score ?? 0;
    const cScore = this.cpuGame?.score    ?? 0;

    document.getElementById('cpug-result-content').innerHTML = `
      <div class="cpug-result-banner ${isWin ? 'banner-win' : 'banner-lose'}">
        ${isWin ? '🏆 YOU WIN!' : '💀 YOU LOSE...'}
      </div>
      <div class="cpug-result-chars">
        <div class="cpug-result-char ${isWin ? 'rchar-win' : 'rchar-lose'}">
          <div class="cpug-result-face">${this.playerChar.svgFace}</div>
          <div class="cpug-result-charname">${this.playerChar.name}</div>
          <div class="cpug-result-score font-mono">${pScore.toLocaleString()}</div>
          <div class="cpug-result-label">YOU</div>
        </div>
        <div class="cpug-result-vs-label">VS</div>
        <div class="cpug-result-char ${!isWin ? 'rchar-win' : 'rchar-lose'}">
          <div class="cpug-result-face">${this.cpuChar.svgFace}</div>
          <div class="cpug-result-charname">${this.cpuChar.name}</div>
          <div class="cpug-result-score font-mono">${cScore.toLocaleString()}</div>
          <div class="cpug-result-label">CPU · ${this.difficulty.label}</div>
        </div>
      </div>
      <div class="cpug-result-btns">
        <button class="btn btn-primary btn-large" id="r-retry">もう一度</button>
        <button class="btn btn-secondary" id="r-mode">モード選択</button>
        <button class="btn btn-ghost" id="r-title">タイトルへ</button>
      </div>
    `;
    document.getElementById('cpug-result').style.display = 'flex';

    document.getElementById('r-retry').addEventListener('click', () => {
      this._cleanup();
      this.onBack('retry', this.playerChar, this.difficulty);
    });
    document.getElementById('r-mode').addEventListener('click', () => {
      this._cleanup();
      this.onBack('mode');
    });
    document.getElementById('r-title').addEventListener('click', () => {
      this._cleanup();
      this.onTitle();
    });
  }

  // ─── お邪魔ライン警告表示 ─────────────────────────────
  _showGarbage(elId, count) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = `⚠ +${count} ライン`;
    el.classList.remove('garbage-flash');
    void el.offsetWidth; // reflow でアニメーション再トリガー
    el.classList.add('garbage-flash');
    setTimeout(() => { el.textContent = ''; el.classList.remove('garbage-flash'); }, 1400);
  }

  // ─── ポーズ ───────────────────────────────────────────
  _pause(on) {
    if (this.isOver) return;
    const pausing = on ?? !this.playerGame.isPaused;

    if (pausing) {
      if (!this.playerGame.isPaused) this.playerGame.togglePause();
      if (!this.cpuGame.isPaused)    this.cpuGame.togglePause();
      clearTimeout(this.cpuTimer);
      this.soundManager.pauseBGM();
      document.getElementById('cpug-pause').style.display = 'flex';
    } else {
      if (this.playerGame.isPaused) this.playerGame.togglePause();
      if (this.cpuGame.isPaused)    this.cpuGame.togglePause();
      this.soundManager.resumeBGM();
      document.getElementById('cpug-pause').style.display = 'none';
      this._scheduleCpu();
    }
  }

  _goTitle() {
    this._cleanup();
    this.onTitle();
  }

  _cleanup() {
    this.playerGame?.destroy();
    this.cpuGame?.destroy();
    clearTimeout(this.cpuTimer);
    this.soundManager.stopBGM();
    document.removeEventListener('keydown', this._keyHandler);
  }

  // ─── キーボード ───────────────────────────────────────
  _onKey(e) {
    if (!this.playerGame || this.isOver) return;
    if (this.playerGame.isPaused && e.code !== 'KeyP' && e.code !== 'Escape') return;
    switch (e.code) {
      case 'ArrowLeft':  e.preventDefault(); this.playerGame.moveLeft(); break;
      case 'ArrowRight': e.preventDefault(); this.playerGame.moveRight(); break;
      case 'ArrowDown':  e.preventDefault(); this.playerGame.softDrop(); break;
      case 'ArrowUp':    e.preventDefault(); this.playerGame.rotate(1); break;
      case 'KeyZ':       this.playerGame.rotate(-1); break;
      case 'Space':      e.preventDefault(); this.playerGame.hardDrop(); break;
      case 'KeyC':       this.playerGame.hold(); break;
      case 'KeyP':       this._pause(); break;
      case 'Escape':     this._goTitle(); break;
    }
  }

  // ─── 描画 ─────────────────────────────────────────────
  _renderPlayer() {
    this._drawBoard(this.pBoardCtx, this.playerGame);
    this._drawHold(this.pHoldCtx, this.playerGame);
    this._drawNext(this.pNextCtx, this.playerGame);
  }

  _renderCpu() {
    this._drawBoard(this.cBoardCtx, this.cpuGame);
    this._drawNext(this.cNextCtx, this.cpuGame);
  }

  _drawBoard(ctx, game) {
    const W = CS * BOARD_COLS, H = CS * BOARD_ROWS;

    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(0, 0, W, H);

    // グリッド
    ctx.strokeStyle = 'rgba(232,236,239,0.07)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= BOARD_COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * CS, 0); ctx.lineTo(c * CS, H); ctx.stroke();
    }
    for (let r = 0; r <= BOARD_ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CS); ctx.lineTo(W, r * CS); ctx.stroke();
    }

    // 固定ブロック
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const cell = game.board.grid[r][c];
        if (cell) this._drawCell(ctx, c, r, cell);
      }
    }

    // ゴースト
    if (game.currentPiece) {
      const ghostY = game.getGhostPosition();
      game.currentPiece
        .getCellsAt(game.currentPiece.x, ghostY, game.currentPiece.rotation)
        .forEach(([x, y]) => {
          if (y >= 0) {
            ctx.fillStyle = game.currentPiece.color + '30';
            ctx.fillRect(x * CS + 1, y * CS + 1, CS - 2, CS - 2);
          }
        });

      // 現在ピース
      game.currentPiece.getCells().forEach(([x, y]) => {
        if (y >= 0) this._drawCell(ctx, x, y, game.currentPiece.color);
      });
    }

    // ライン消去エフェクト
    this._drawClearEffect(ctx, game, CS);

    // ゲームオーバー暗転
    if (game.isGameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${CS}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('終了', W / 2, H / 2);
    }
  }

  _drawClearEffect(ctx, game, cs) {
    if (!game.clearingRows?.length) return;
    const phase  = game.clearPhase;
    const effect = game.character.clearEffect || 'flash';
    const W      = BOARD_COLS * cs;

    game.clearingRows.forEach(r => {
      const y = r * cs;
      switch (effect) {

        case 'flash': {
          const a = Math.sin(phase * Math.PI);
          ctx.fillStyle = `rgba(255,255,255,${a * 0.92})`;
          ctx.fillRect(0, y, W, cs);
          break;
        }

        case 'ripple': {
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
          if (phase < 0.55) {
            const progress = phase / 0.55;
            const covered  = Math.ceil(progress * (BOARD_COLS / 2 + 1));
            for (let c = 0; c < BOARD_COLS; c++) {
              if (c < covered || c >= BOARD_COLS - covered) {
                const g = Math.floor(60 + 80 * (1 - progress));
                ctx.fillStyle = `rgba(255,${g},0,0.88)`;
                ctx.fillRect(c * cs + 1, y + 1, cs - 2, cs - 2);
              }
            }
          } else {
            const burst = (phase - 0.55) / 0.45;
            ctx.fillStyle = `rgba(255,${Math.floor(120 * (1 - burst))},0,${(1 - burst) * 0.95})`;
            ctx.fillRect(0, y, W, cs);
          }
          break;
        }

        case 'glitch': {
          const seed  = r * 137;
          const shift = Math.round(Math.sin(seed + phase * 18) * 14 * phase);
          ctx.save();
          ctx.globalAlpha = 1 - phase * 0.75;
          ctx.fillStyle = `rgba(255,255,255,${phase * 0.8})`;
          ctx.fillRect(0, y, W, cs);
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          for (let i = 1; i < cs; i += 3) ctx.fillRect(0, y + i, W, 1);
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

  _drawCell(ctx, col, row, color) {
    const x = col * CS, y = row * CS;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, CS - 2, CS - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x + 1, y + 1, CS - 2, 2);
    ctx.fillRect(x + 1, y + 1, 2, CS - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 1, y + CS - 3, CS - 2, 2);
    ctx.fillRect(x + CS - 3, y + 1, 2, CS - 2);
  }

  _drawMini(ctx, piece, slotW, slotH, offsetY) {
    if (!piece) return;
    const cells = piece.getCellsAt(0, 0, 0);
    const minC = Math.min(...cells.map(([c]) => c));
    const maxC = Math.max(...cells.map(([c]) => c));
    const minR = Math.min(...cells.map(([, r]) => r));
    const maxR = Math.max(...cells.map(([, r]) => r));
    const cs  = Math.floor(MINI / 4 * 0.82);
    const pw  = (maxC - minC + 1) * cs;
    const ph  = (maxR - minR + 1) * cs;
    const sx  = (slotW - pw) / 2;
    const sy  = offsetY + (slotH - ph) / 2;
    cells.forEach(([c, r]) => {
      const dx = sx + (c - minC) * cs;
      const dy = sy + (r - minR) * cs;
      ctx.fillStyle = piece.color;
      ctx.fillRect(dx + 1, dy + 1, cs - 2, cs - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(dx + 1, dy + 1, cs - 2, 2);
      ctx.fillRect(dx + 1, dy + 1, 2, cs - 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(dx + 1, dy + cs - 3, cs - 2, 2);
    });
  }

  _drawHold(ctx, game) {
    ctx.clearRect(0, 0, MINI, MINI);
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(0, 0, MINI, MINI);
    if (game.heldPiece) {
      ctx.globalAlpha = game.canHold ? 1 : 0.4;
      this._drawMini(ctx, game.heldPiece, MINI, MINI, 0);
      ctx.globalAlpha = 1;
    }
  }

  _drawNext(ctx, game) {
    const H = MINI * 3 + 8;
    const slotH = H / 3;
    ctx.clearRect(0, 0, MINI, H);
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(0, 0, MINI, H);
    game.nextPieces.slice(0, 3).forEach((piece, i) => {
      this._drawMini(ctx, piece, MINI, slotH, i * slotH);
    });
  }

  _applyScale() {
    const screen = this.container.querySelector('.cpug-screen');
    if (!screen) return;
    // Natural width: padding(32) + 2 sides(466 each) + VS(30) + gaps(24)
    const NATURAL_W = 1018;
    const scale = Math.min((window.innerWidth - 8) / NATURAL_W, 1);
    screen.style.zoom = scale < 1 ? String(scale) : '';
  }

  _addTouchControls() {
    this._touchPanel?.remove();
    const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const tp = document.createElement('div');
    tp.className = 'touch-controls' + (hasTouch ? ' tc-visible' : '');
    if (hasTouch) {
      this.container.querySelector('.cpug-screen')?.classList.add('has-touch');
    }
    tp.innerHTML = `
      <div class="tc-row">
        <button class="touch-btn" id="tc-left">◀</button>
        <button class="touch-btn" id="tc-rotate">↺</button>
        <button class="touch-btn" id="tc-right">▶</button>
        <button class="touch-btn touch-btn-hold" id="tc-hold">HOLD</button>
      </div>
      <div class="tc-row">
        <button class="touch-btn" id="tc-soft">SOFT ▼</button>
        <button class="touch-btn touch-btn-hard" id="tc-hard">HARD DROP</button>
      </div>
    `;
    this.container.appendChild(tp);
    this._touchPanel = tp;

    this._addRepeat('tc-left', () => this.playerGame?.moveLeft());
    this._addRepeat('tc-right', () => this.playerGame?.moveRight());
    this._addRepeat('tc-soft',  () => this.playerGame?.softDrop());
    document.getElementById('tc-rotate').addEventListener('touchstart', e => { e.preventDefault(); this.playerGame?.rotate(1); }, { passive: false });
    document.getElementById('tc-hold').addEventListener('touchstart',   e => { e.preventDefault(); this.playerGame?.hold(); },     { passive: false });
    document.getElementById('tc-hard').addEventListener('touchstart',   e => { e.preventDefault(); this.playerGame?.hardDrop(); }, { passive: false });
  }

  _addRepeat(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    let iv;
    el.addEventListener('touchstart', e => { e.preventDefault(); fn(); iv = setInterval(fn, 80); }, { passive: false });
    const stop = () => clearInterval(iv);
    el.addEventListener('touchend',    stop);
    el.addEventListener('touchcancel', stop);
  }

  hide() {
    this._touchPanel?.remove();
    this._touchPanel = null;
    window.removeEventListener('resize', this._resizeHandler);
    this._cleanup();
    this.container.innerHTML = '';
  }
}
