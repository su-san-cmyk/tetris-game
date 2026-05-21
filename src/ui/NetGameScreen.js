import { Game } from '../core/Game.js';
import { BOARD_COLS, BOARD_ROWS } from '../core/constants.js';

const CS   = 25;
const MINI = CS * 4;
const GARBAGE = [0, 0, 1, 2, 4];

export class NetGameScreen {
  constructor(container, playerChar, opponentChar, net, soundManager, onBack, onTitle) {
    this.container    = container;
    this.playerChar   = playerChar;
    this.opponentChar = opponentChar;
    this.net          = net;
    this.soundManager = soundManager;
    this.onBack       = onBack;
    this.onTitle      = onTitle;

    this.playerGame   = null;
    this.isOver       = false;

    this.opponentGrid     = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
    this.opponentScore    = 0;
    this.opponentDead     = false;
    this.opponentPiece    = null;
    this.opponentNext     = [];
    this.opponentHold     = null;
    this.opponentCanHold  = true;
    this._lastPieceSyncTime = 0;

    this._keyHandler = this._onKey.bind(this);
    this._unsubs     = [];
  }

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
                <div class="cpug-stat-item"><div class="cpug-label">SCORE</div><div class="cpug-val font-mono" id="p-score">0</div></div>
                <div class="cpug-stat-item"><div class="cpug-label">LV</div><div class="cpug-val font-mono" id="p-level">1</div></div>
                <div class="cpug-stat-item"><div class="cpug-label">LINES</div><div class="cpug-val font-mono" id="p-lines">0</div></div>
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
        <div class="cpug-vs-col"><div class="cpug-vs">VS</div></div>

        <!-- 相手側 -->
        <div class="cpug-side cpug-cpu-side">
          <div class="cpug-char-label">
            <div class="cpug-face">${this.opponentChar.svgFace}</div>
            <div>
              <div class="cpug-name">${this.opponentChar.name}</div>
              <div class="cpug-role" style="color:#A78BFA">ONLINE</div>
            </div>
          </div>
          <div class="cpug-panels">
            <div class="cpug-col cpug-col-left">
              <div class="cpug-label">HOLD</div>
              <canvas id="c-hold" width="${MINI}" height="${MINI}"></canvas>
              <div class="cpug-stats" style="margin-top:12px">
                <div class="cpug-stat-item"><div class="cpug-label">SCORE</div><div class="cpug-val font-mono" id="c-score">0</div></div>
              </div>
            </div>
            <div class="cpug-board-wrap">
              <canvas id="c-board" width="${BW}" height="${BH}"></canvas>
              <div class="cpug-garbage-alert" id="c-garbage"></div>
            </div>
            <div class="cpug-col cpug-col-right">
              <div class="cpug-label">NEXT</div>
              <canvas id="c-next" width="${MINI}" height="${NH}"></canvas>
            </div>
          </div>
        </div>

        <!-- ポーズ -->
        <div class="cpug-overlay" id="cpug-pause" style="display:none">
          <div class="cpug-overlay-box">
            <div class="cpug-overlay-title">一時停止</div>
            <p style="color:rgba(255,255,255,0.6);font-size:13px">P キーで再開</p>
            <button class="btn btn-primary" id="cpug-resume">再開</button>
            <button class="btn btn-secondary" id="cpug-to-title">タイトルへ</button>
          </div>
        </div>

        <!-- 結果 -->
        <div class="cpug-overlay" id="cpug-result" style="display:none">
          <div class="cpug-result-box" id="cpug-result-content"></div>
        </div>
      </div>
    `;

    this.pBoardCtx = document.getElementById('p-board').getContext('2d');
    this.pHoldCtx  = document.getElementById('p-hold').getContext('2d');
    this.pNextCtx  = document.getElementById('p-next').getContext('2d');
    this.cBoardCtx = document.getElementById('c-board').getContext('2d');
    this.cHoldCtx  = document.getElementById('c-hold').getContext('2d');
    this.cNextCtx  = document.getElementById('c-next').getContext('2d');

    this.pScoreEl = document.getElementById('p-score');
    this.pLevelEl = document.getElementById('p-level');
    this.pLinesEl = document.getElementById('p-lines');
    this.cScoreEl = document.getElementById('c-score');

    document.getElementById('cpug-resume').addEventListener('click', () => this._pause(false));
    document.getElementById('cpug-to-title').addEventListener('click', () => this._goTitle());
    document.addEventListener('keydown', this._keyHandler);

    this._unsubs.push(
      this.net.on('board_update',  (msg) => this._onOpponentUpdate(msg)),
      this.net.on('piece_update',  (msg) => this._onOpponentPieceUpdate(msg)),
      this.net.on('garbage',       (msg) => this._onReceiveGarbage(msg.count)),
      this.net.on('game_over',     ()    => this._handleOver('player')),
      this.net.on('_disconnect',   ()    => this._onDisconnect()),
    );

    this.playerGame = this._createGame();
    this._renderOpponent();

    this._applyScale();
    this._addTouchControls();
    this._resizeHandler = () => this._applyScale();
    window.addEventListener('resize', this._resizeHandler);

    this.soundManager.playBGM();
    this.playerGame.start();
  }

  _createGame() {
    return new Game(this.playerChar, {
      onRender: () => {
        this._renderPlayer();
        if (!this.isOver) {
          const now = Date.now();
          if (now - this._lastPieceSyncTime >= 80) {
            this._lastPieceSyncTime = now;
            const p    = this.playerGame.currentPiece;
            const held = this.playerGame.heldPiece;
            this.net.send({
              type: 'piece_update',
              cells:      p    ? p.getCells()            : null,
              color:      p    ? p.color                 : null,
              nextPieces: this.playerGame.nextPieces.slice(0, 3).map(n => ({
                cells: n.getCellsAt(0, 0, 0),
                color: n.color,
              })),
              holdPiece:  held ? { cells: held.getCellsAt(0, 0, 0), color: held.color } : null,
              canHold:    this.playerGame.canHold,
            });
          }
        }
      },
      onScoreUpdate: (sc, lv, ln) => {
        this.pScoreEl.textContent = sc.toLocaleString();
        this.pLevelEl.textContent = lv;
        this.pLinesEl.textContent = ln;
        this.net.send({ type: 'board_update', grid: this.playerGame.board.grid, score: sc });
      },
      onLinesCleared: (n) => {
        this.soundManager.playSE('line-clear');
        const g = GARBAGE[Math.min(n, 4)];
        if (g > 0 && !this.isOver) {
          this.net.send({ type: 'garbage', count: g });
          this._showGarbage('c-garbage', g);
        }
      },
      onPieceLocked:  () => this.soundManager.playSE('drop'),
      onPieceRotated: () => this.soundManager.playSE('rotate'),
      onGameOver: () => {
        this.net.send({ type: 'game_over' });
        this._handleOver('cpu');
      },
    });
  }

  _applyScale() {
    const screen = this.container.querySelector('.cpug-screen');
    if (!screen) return;
    const NATURAL_W = 1118;
    const scale = Math.min((window.innerWidth - 8) / NATURAL_W, 1);
    screen.style.zoom = scale < 1 ? String(scale) : '';
  }

  _addTouchControls() {
    this._touchPanel?.remove();
    const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const tp = document.createElement('div');
    tp.className = 'touch-controls' + (hasTouch ? ' tc-visible' : '');
    if (hasTouch) this.container.querySelector('.cpug-screen')?.classList.add('has-touch');
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

  // ─── ネットイベント ───────────────────────────────────────
  _onOpponentUpdate({ grid, score }) {
    this.opponentGrid  = grid;
    this.opponentScore = score;
    if (this.cScoreEl) this.cScoreEl.textContent = score.toLocaleString();
    this._renderOpponent();
  }

  _onOpponentPieceUpdate({ cells, color, nextPieces, holdPiece, canHold }) {
    this.opponentPiece   = cells ? { cells, color } : null;
    this.opponentNext    = nextPieces  || [];
    this.opponentHold    = holdPiece   || null;
    this.opponentCanHold = canHold !== false;
    this._renderOpponent();
  }

  _onReceiveGarbage(count) {
    if (this.isOver) return;
    this.playerGame?.addGarbageLines(count);
    this._showGarbage('p-garbage', count);
  }

  _onDisconnect() {
    if (this.isOver) return;
    this._showResult('player', true);
  }

  // ─── ゲームオーバー ──────────────────────────────────────
  _handleOver(winner) {
    if (this.isOver) return;
    this.isOver = true;
    this.playerGame?.destroy();
    this.soundManager.stopBGM();
    this.soundManager.playSE('gameover');
    setTimeout(() => this._showResult(winner, false), 900);
  }

  _showResult(winner, disconnected = false) {
    const isWin  = winner === 'player';
    const pScore = this.playerGame?.score ?? 0;
    const cScore = this.opponentScore;

    document.getElementById('cpug-result-content').innerHTML = `
      <div class="cpug-result-banner ${isWin ? 'banner-win' : 'banner-lose'}">
        ${disconnected ? '🔌 相手が切断しました' : isWin ? '🏆 YOU WIN!' : '💀 YOU LOSE...'}
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
          <div class="cpug-result-face">${this.opponentChar.svgFace}</div>
          <div class="cpug-result-charname">${this.opponentChar.name}</div>
          <div class="cpug-result-score font-mono">${cScore.toLocaleString()}</div>
          <div class="cpug-result-label">ONLINE</div>
        </div>
      </div>
      <div class="cpug-result-btns">
        ${disconnected ? '' : '<button class="btn btn-primary" id="r-rematch">もう一度</button>'}
        <button class="btn btn-secondary" id="r-mode">モード選択</button>
        <button class="btn btn-ghost" id="r-title">タイトルへ</button>
      </div>
    `;
    document.getElementById('cpug-result').style.display = 'flex';
    document.getElementById('r-rematch')?.addEventListener('click', () => this._requestRematch());
    document.getElementById('r-mode').addEventListener('click',  () => { this._cleanup(); this.onBack(); });
    document.getElementById('r-title').addEventListener('click', () => { this._cleanup(); this.onTitle(); });
  }

  // ─── リマッチ ─────────────────────────────────────────────
  _requestRematch() {
    document.getElementById('cpug-result-content').innerHTML = `
      <div style="color:#E8ECEF;font-size:20px;margin-bottom:20px">⏳ 相手を待っています...</div>
      <button class="btn btn-ghost" id="r-cancel-rematch">キャンセル</button>
    `;

    let unsubRematch, unsubDc, retryTimer, resolved = false;

    const cleanup = () => {
      clearInterval(retryTimer);
      unsubRematch?.();
      unsubDc?.();
    };

    unsubRematch = this.net.on('rematch', () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      this._doRematch();
    });

    unsubDc = this.net.on('_disconnect', () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      document.getElementById('cpug-result-content').innerHTML = `
        <div style="color:#E8ECEF;font-size:18px;margin-bottom:20px">接続が切れました</div>
        <button class="btn btn-secondary" id="r-back-dc">モード選択へ</button>
      `;
      document.getElementById('r-back-dc')?.addEventListener('click', () => { this._cleanup(); this.onBack(); });
    });

    this.net.send({ type: 'rematch' });
    retryTimer = setInterval(() => this.net.send({ type: 'rematch' }), 1000);

    document.getElementById('r-cancel-rematch').addEventListener('click', () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      this._cleanup();
      this.onBack();
    });
  }

  _doRematch() {
    this.isOver           = false;
    this.opponentGrid     = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
    this.opponentScore    = 0;
    this.opponentDead     = false;
    this.opponentPiece    = null;
    this.opponentNext     = [];
    this.opponentHold     = null;
    this.opponentCanHold  = true;
    this._lastPieceSyncTime = 0;

    document.getElementById('cpug-result').style.display = 'none';
    if (this.pScoreEl) this.pScoreEl.textContent = '0';
    if (this.pLevelEl) this.pLevelEl.textContent = '1';
    if (this.pLinesEl) this.pLinesEl.textContent = '0';
    if (this.cScoreEl) this.cScoreEl.textContent = '0';

    this._renderOpponent();
    this.playerGame = this._createGame();
    this.soundManager.playBGM();
    this.playerGame.start();
  }

  // ─── お邪魔警告 ──────────────────────────────────────────
  _showGarbage(elId, count) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = `⚠ +${count} ライン`;
    el.classList.remove('garbage-flash');
    void el.offsetWidth;
    el.classList.add('garbage-flash');
    setTimeout(() => { el.textContent = ''; el.classList.remove('garbage-flash'); }, 1400);
  }

  // ─── ポーズ ───────────────────────────────────────────────
  _pause(on) {
    if (this.isOver) return;
    const pausing = on ?? !this.playerGame.isPaused;
    if (pausing) {
      if (!this.playerGame.isPaused) this.playerGame.togglePause();
      this.soundManager.pauseBGM();
      document.getElementById('cpug-pause').style.display = 'flex';
    } else {
      if (this.playerGame.isPaused) this.playerGame.togglePause();
      this.soundManager.resumeBGM();
      document.getElementById('cpug-pause').style.display = 'none';
    }
  }

  _goTitle() { this._cleanup(); this.onTitle(); }

  _cleanup() {
    this._unsubs.forEach(fn => fn?.());
    this._unsubs = [];
    this.playerGame?.destroy();
    this.net.disconnect();
    this.soundManager.stopBGM();
    document.removeEventListener('keydown', this._keyHandler);
  }

  // ─── キーボード ───────────────────────────────────────────
  _onKey(e) {
    if (!this.playerGame || this.isOver) return;
    if (this.playerGame.isPaused && e.code !== 'KeyP' && e.code !== 'Escape') return;
    switch (e.code) {
      case 'ArrowLeft':  e.preventDefault(); this.playerGame.moveLeft();   break;
      case 'ArrowRight': e.preventDefault(); this.playerGame.moveRight();  break;
      case 'ArrowDown':  e.preventDefault(); this.playerGame.softDrop();   break;
      case 'ArrowUp':    e.preventDefault(); this.playerGame.rotate(1);    break;
      case 'KeyZ':       this.playerGame.rotate(-1);  break;
      case 'Space':      e.preventDefault(); this.playerGame.hardDrop();   break;
      case 'KeyC':       this.playerGame.hold();       break;
      case 'KeyP':       this._pause();                break;
      case 'Escape':     this._goTitle();              break;
    }
  }

  // ─── 描画 ─────────────────────────────────────────────────
  _renderPlayer() {
    this._drawBoard(this.pBoardCtx, this.playerGame.board.grid,
      this.playerGame.currentPiece, this.playerGame,
      this.playerChar.clearEffect);
    this._drawHold(this.pHoldCtx, this.playerGame);
    this._drawNext(this.pNextCtx, this.playerGame);
  }

  _renderOpponent() {
    this._drawBoard(this.cBoardCtx, this.opponentGrid, null, null, null);
    if (this.opponentPiece && !this.opponentDead) {
      this.opponentPiece.cells.forEach(([x, y]) => {
        if (y >= 0) this._drawCell(this.cBoardCtx, x, y, this.opponentPiece.color);
      });
    }
    this._drawHoldData(this.cHoldCtx, this.opponentHold, this.opponentCanHold);
    this._drawNextData(this.cNextCtx, this.opponentNext);
    if (this.opponentDead) {
      this.cBoardCtx.fillStyle = 'rgba(0,0,0,0.65)';
      this.cBoardCtx.fillRect(0, 0, CS * BOARD_COLS, CS * BOARD_ROWS);
      this.cBoardCtx.fillStyle = '#fff';
      this.cBoardCtx.font = `bold ${CS}px Inter,sans-serif`;
      this.cBoardCtx.textAlign = 'center';
      this.cBoardCtx.fillText('終了', CS * BOARD_COLS / 2, CS * BOARD_ROWS / 2);
    }
  }

  _drawBoard(ctx, grid, currentPiece, game, clearEffect) {
    const W = CS * BOARD_COLS, H = CS * BOARD_ROWS;
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(232,236,239,0.07)';
    ctx.lineWidth   = 0.5;
    for (let c = 0; c <= BOARD_COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c*CS,0); ctx.lineTo(c*CS,H); ctx.stroke();
    }
    for (let r = 0; r <= BOARD_ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0,r*CS); ctx.lineTo(W,r*CS); ctx.stroke();
    }

    for (let r = 0; r < BOARD_ROWS; r++)
      for (let c = 0; c < BOARD_COLS; c++)
        if (grid[r][c]) this._drawCell(ctx, c, r, grid[r][c]);

    if (currentPiece && game) {
      const ghostY = game.getGhostPosition();
      currentPiece.getCellsAt(currentPiece.x, ghostY, currentPiece.rotation)
        .forEach(([x, y]) => {
          if (y >= 0) { ctx.fillStyle = currentPiece.color + '30'; ctx.fillRect(x*CS+1,y*CS+1,CS-2,CS-2); }
        });
      currentPiece.getCells()
        .forEach(([x, y]) => { if (y >= 0) this._drawCell(ctx, x, y, currentPiece.color); });

      if (game.clearingRows?.length) this._drawClearEffect(ctx, game, clearEffect);
    }
  }

  _drawClearEffect(ctx, game, effect) {
    const phase = game.clearPhase;
    const W     = BOARD_COLS * CS;
    game.clearingRows.forEach(r => {
      const y = r * CS;
      switch (effect) {
        case 'flash': {
          ctx.fillStyle = `rgba(255,255,255,${Math.sin(phase * Math.PI) * 0.92})`;
          ctx.fillRect(0, y, W, CS); break;
        }
        case 'ripple': {
          const mid = BOARD_COLS / 2, span = phase * (mid + 1);
          for (let c = 0; c < BOARD_COLS; c++) {
            if (Math.abs(c + 0.5 - mid) < span) {
              const a = (1 - Math.abs(c+0.5-mid)/span*0.5) * (1-phase*0.6);
              ctx.fillStyle = `rgba(0,207,255,${a*0.95})`;
              ctx.fillRect(c*CS+1, y+1, CS-2, CS-2);
            }
          }
          break;
        }
        case 'burn': {
          if (phase < 0.55) {
            const p = phase / 0.55, covered = Math.ceil(p * (BOARD_COLS/2+1));
            for (let c = 0; c < BOARD_COLS; c++) {
              if (c < covered || c >= BOARD_COLS - covered) {
                ctx.fillStyle = `rgba(255,${Math.floor(60+80*(1-p))},0,0.88)`;
                ctx.fillRect(c*CS+1, y+1, CS-2, CS-2);
              }
            }
          } else {
            const b = (phase-0.55)/0.45;
            ctx.fillStyle = `rgba(255,${Math.floor(120*(1-b))},0,${(1-b)*0.95})`;
            ctx.fillRect(0, y, W, CS);
          }
          break;
        }
        case 'glitch': {
          const shift = Math.round(Math.sin(r*137+phase*18)*14*phase);
          ctx.save();
          ctx.globalAlpha = 1 - phase * 0.75;
          ctx.fillStyle = `rgba(255,255,255,${phase*0.8})`; ctx.fillRect(0,y,W,CS);
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          for (let i = 1; i < CS; i += 3) ctx.fillRect(0, y+i, W, 1);
          if (phase > 0.25) {
            ctx.globalAlpha = (phase-0.25)*0.6;
            ctx.fillStyle = `rgba(0,255,200,0.7)`; ctx.fillRect(shift, y+2, W, Math.floor(CS/3));
            ctx.fillStyle = `rgba(255,0,100,0.7)`; ctx.fillRect(-shift, y+Math.floor(CS*0.55), W, Math.floor(CS/3));
          }
          ctx.restore();
          break;
        }
      }
    });
  }

  _drawCell(ctx, col, row, color) {
    const x = col*CS, y = row*CS;
    ctx.fillStyle = color; ctx.fillRect(x+1,y+1,CS-2,CS-2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x+1,y+1,CS-2,2); ctx.fillRect(x+1,y+1,2,CS-2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x+1,y+CS-3,CS-2,2); ctx.fillRect(x+CS-3,y+1,2,CS-2);
  }

  // 実際のPieceオブジェクトを描画（自分側）
  _drawMini(ctx, piece, slotW, slotH, offsetY) {
    if (!piece) return;
    const cells = piece.getCellsAt(0,0,0);
    const minC = Math.min(...cells.map(([c])=>c)), maxC = Math.max(...cells.map(([c])=>c));
    const minR = Math.min(...cells.map(([,r])=>r)), maxR = Math.max(...cells.map(([,r])=>r));
    const cs = Math.floor(MINI/4*0.82);
    const sx = (slotW-(maxC-minC+1)*cs)/2, sy = offsetY+(slotH-(maxR-minR+1)*cs)/2;
    cells.forEach(([c,r]) => {
      const dx = sx+(c-minC)*cs, dy = sy+(r-minR)*cs;
      ctx.fillStyle = piece.color; ctx.fillRect(dx+1,dy+1,cs-2,cs-2);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(dx+1,dy+1,cs-2,2); ctx.fillRect(dx+1,dy+1,2,cs-2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(dx+1,dy+cs-3,cs-2,2);
    });
  }

  // シリアライズ済みデータを描画（相手側）
  _drawMiniData(ctx, cells, color, slotW, slotH, offsetY) {
    if (!cells || cells.length === 0) return;
    const minC = Math.min(...cells.map(([c]) => c)), maxC = Math.max(...cells.map(([c]) => c));
    const minR = Math.min(...cells.map(([, r]) => r)), maxR = Math.max(...cells.map(([, r]) => r));
    const cs = Math.floor(MINI / 4 * 0.82);
    const sx = (slotW - (maxC - minC + 1) * cs) / 2;
    const sy = offsetY + (slotH - (maxR - minR + 1) * cs) / 2;
    cells.forEach(([c, r]) => {
      const dx = sx + (c - minC) * cs, dy = sy + (r - minR) * cs;
      ctx.fillStyle = color; ctx.fillRect(dx+1, dy+1, cs-2, cs-2);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(dx+1, dy+1, cs-2, 2); ctx.fillRect(dx+1, dy+1, 2, cs-2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(dx+1, dy+cs-3, cs-2, 2);
    });
  }

  _drawHold(ctx, game) {
    ctx.fillStyle = '#1a2a3a'; ctx.fillRect(0,0,MINI,MINI);
    if (game.heldPiece) {
      ctx.globalAlpha = game.canHold ? 1 : 0.4;
      this._drawMini(ctx, game.heldPiece, MINI, MINI, 0);
      ctx.globalAlpha = 1;
    }
  }

  _drawHoldData(ctx, holdPiece, canHold) {
    if (!ctx) return;
    ctx.fillStyle = '#1a2a3a'; ctx.fillRect(0, 0, MINI, MINI);
    if (holdPiece) {
      ctx.globalAlpha = canHold ? 1 : 0.4;
      this._drawMiniData(ctx, holdPiece.cells, holdPiece.color, MINI, MINI, 0);
      ctx.globalAlpha = 1;
    }
  }

  _drawNext(ctx, game) {
    const H = MINI*3+8, slotH = H/3;
    ctx.fillStyle = '#1a2a3a'; ctx.fillRect(0,0,MINI,H);
    game.nextPieces.slice(0,3).forEach((piece,i) => this._drawMini(ctx,piece,MINI,slotH,i*slotH));
  }

  _drawNextData(ctx, nextPieces) {
    if (!ctx) return;
    const H = MINI * 3 + 8, slotH = H / 3;
    ctx.fillStyle = '#1a2a3a'; ctx.fillRect(0, 0, MINI, H);
    (nextPieces || []).slice(0, 3).forEach((piece, i) => {
      this._drawMiniData(ctx, piece.cells, piece.color, MINI, slotH, i * slotH);
    });
  }

  hide() {
    this._touchPanel?.remove();
    this._touchPanel = null;
    window.removeEventListener('resize', this._resizeHandler);
    this._cleanup();
    this.container.innerHTML = '';
  }
}
