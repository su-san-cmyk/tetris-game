import { Board } from './Board.js';
import { Piece } from './Piece.js';
import {
  PIECE_TYPES, SCORE_TABLE, FALL_SPEED, LOCK_DELAY_FRAMES, BOARD_ROWS, BOARD_COLS,
  DEFAULT_MINO_COLORS
} from './constants.js';

export class Game {
  constructor(character, callbacks = {}) {
    this.character = character;
    this.board = new Board();
    this.callbacks = callbacks;

    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.isGameOver = false;

    this.currentPiece = null;
    this.heldPiece = null;
    this.canHold = true;
    this.nextPieces = [];
    this.bag = [];

    this.frameCount = 0;
    this.lockFrames = 0;
    this.isLocking = false;
    this.lockMoveCount = 0; // ロック猶予中の移動回数上限

    this.animFrameId = null;
    this.lastTime = 0;
    this.frameAccum = 0;

    this.minoColors = DEFAULT_MINO_COLORS;

    this.clearingRows = [];
    this.clearPhase   = 0;
    this.isAnimating  = false;
  }

  // 7-bag ランダム生成
  _refillBag() {
    const types = [...PIECE_TYPES];
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    this.bag.push(...types);
  }

  _nextFromBag() {
    if (this.bag.length < 4) this._refillBag();
    return this.bag.shift();
  }

  _initNextPieces() {
    while (this.nextPieces.length < 3) {
      this.nextPieces.push(new Piece(this._nextFromBag(), this.minoColors));
    }
  }

  _spawnPiece() {
    if (this.nextPieces.length < 3) this._initNextPieces();
    this.currentPiece = this.nextPieces.shift();
    this.currentPiece.x = 3;
    this.currentPiece.y = 0;
    this.nextPieces.push(new Piece(this._nextFromBag(), this.minoColors));
    this.isLocking = false;
    this.lockFrames = 0;
    this.lockMoveCount = 0;
    this.canHold = true;

    if (!this.board.isValidPosition(this.currentPiece.getCells())) {
      this._triggerGameOver();
      return;
    }
    this.callbacks.onPieceSpawned && this.callbacks.onPieceSpawned();
  }

  addGarbageLines(n) {
    this.board.addGarbageLines(n);
  }

  start() {
    this.board.reset();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.heldPiece = null;
    this.canHold = true;
    this.nextPieces = [];
    this.bag = [];
    this.frameAccum = 0;
    this.lastTime = performance.now();

    this._initNextPieces();
    this._spawnPiece();
    this._loop();
  }

  _loop(timestamp = performance.now()) {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(t => this._loop(t));

    if (this.isPaused) return;

    const delta = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // 60fps基準でフレーム積算
    this.frameAccum += delta / (1000 / 60);

    while (this.frameAccum >= 1) {
      this._update();
      this.frameAccum -= 1;
    }

    this.callbacks.onRender && this.callbacks.onRender();
  }

  _getFallSpeed() {
    const lvl = Math.min(this.level - 1, FALL_SPEED.length - 1);
    return FALL_SPEED[lvl];
  }

  _getLockDelay() {
    return LOCK_DELAY_FRAMES;
  }

  _update() {
    if (!this.currentPiece || this.isAnimating) return;

    this.frameCount++;

    const canMoveDown = this.board.isValidPosition(
      this.currentPiece.getCellsAt(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.rotation)
    );

    if (!canMoveDown) {
      // ロック猶予
      this.isLocking = true;
      this.lockFrames++;
      if (this.lockFrames >= this._getLockDelay() || this.lockMoveCount >= 15) {
        this._lockPiece();
      }
    } else {
      this.isLocking = false;
      this.lockFrames = 0;

      const fallSpeed = this._getFallSpeed();
      if (this.frameCount % Math.max(1, Math.round(fallSpeed)) === 0) {
        this.currentPiece.y++;
      }
    }
  }

  _lockPiece() {
    const cells = this.currentPiece.getCells();
    this.board.lockPiece(cells, this.currentPiece.color);
    this.callbacks.onPieceLocked && this.callbacks.onPieceLocked();

    this.currentPiece = null; // アニメーション中はピースを非表示

    const rows = this.board.findClearedRows();
    if (rows.length > 0) {
      this.clearingRows = rows;
      this.clearPhase   = 0;
      this.isAnimating  = true;
      const startTime   = performance.now();
      const ANIM_MS     = 340;
      const tick = (now) => {
        this.clearPhase = Math.min(1, (now - startTime) / ANIM_MS);
        if (this.clearPhase < 1) {
          requestAnimationFrame(tick);
        } else {
          const cleared = this.board.clearLines();
          this.clearingRows = [];
          this.isAnimating  = false;
          this.clearPhase   = 0;
          this._afterClear(cleared);
        }
      };
      requestAnimationFrame(tick);
    } else {
      this._afterClear(0);
    }
  }

  _afterClear(cleared) {
    if (cleared > 0) {
      this._addScore(cleared);
      this.lines += cleared;
      this.level = Math.floor(this.lines / 10) + 1;
      this.callbacks.onLinesCleared && this.callbacks.onLinesCleared(cleared);
    }
    this.callbacks.onScoreUpdate && this.callbacks.onScoreUpdate(this.score, this.level, this.lines);
    if (this.board.isTopOut()) {
      this._triggerGameOver();
      return;
    }
    this._spawnPiece();
  }

  _addScore(linesCleared) {
    this.score += Math.floor((SCORE_TABLE[linesCleared] || 0) * this.level);
  }

  // ゴーストピース位置計算
  getGhostPosition() {
    if (!this.currentPiece) return null;
    let ghostY = this.currentPiece.y;
    while (this.board.isValidPosition(
      this.currentPiece.getCellsAt(this.currentPiece.x, ghostY + 1, this.currentPiece.rotation)
    )) {
      ghostY++;
    }
    return ghostY;
  }

  // 操作メソッド
  moveLeft() {
    if (!this.currentPiece || this.isPaused || this.isGameOver) return;
    const newCells = this.currentPiece.getCellsAt(this.currentPiece.x - 1, this.currentPiece.y, this.currentPiece.rotation);
    if (this.board.isValidPosition(newCells)) {
      this.currentPiece.x--;
      this._resetLockOnMove();
    }
  }

  moveRight() {
    if (!this.currentPiece || this.isPaused || this.isGameOver) return;
    const newCells = this.currentPiece.getCellsAt(this.currentPiece.x + 1, this.currentPiece.y, this.currentPiece.rotation);
    if (this.board.isValidPosition(newCells)) {
      this.currentPiece.x++;
      this._resetLockOnMove();
    }
  }

  softDrop() {
    if (!this.currentPiece || this.isPaused || this.isGameOver) return;
    const newCells = this.currentPiece.getCellsAt(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.rotation);
    if (this.board.isValidPosition(newCells)) {
      this.currentPiece.y++;
      this.score += 1;
      this.callbacks.onScoreUpdate && this.callbacks.onScoreUpdate(this.score, this.level, this.lines);
    }
  }

  hardDrop() {
    if (!this.currentPiece || this.isPaused || this.isGameOver) return;
    const ghostY = this.getGhostPosition();
    const dist = ghostY - this.currentPiece.y;
    this.currentPiece.y = ghostY;
    this.score += dist * 2;
    this.callbacks.onScoreUpdate && this.callbacks.onScoreUpdate(this.score, this.level, this.lines);
    this._lockPiece();
  }

  rotate(dir = 1) { // 1=右, -1=左
    if (!this.currentPiece || this.isPaused || this.isGameOver) return;
    const fromRot = this.currentPiece.rotation;
    const toRot = ((fromRot + dir) % 4 + 4) % 4;
    // まず基本回転を試みる
    const basicCells = this.currentPiece.getCellsAt(this.currentPiece.x, this.currentPiece.y, toRot);
    if (this.board.isValidPosition(basicCells)) {
      this.currentPiece.rotation = toRot;
      this._resetLockOnMove();
      this.callbacks.onPieceRotated && this.callbacks.onPieceRotated();
      return;
    }

    // Wall Kick を試みる
    const kicks = this.currentPiece.getWallKicks(fromRot, toRot, 4);
    for (const [kx, ky] of kicks) {
      const kickCells = this.currentPiece.getCellsAt(
        this.currentPiece.x + kx, this.currentPiece.y + ky, toRot
      );
      if (this.board.isValidPosition(kickCells)) {
        this.currentPiece.x += kx;
        this.currentPiece.y += ky;
        this.currentPiece.rotation = toRot;
        this._resetLockOnMove();
        this.callbacks.onPieceRotated && this.callbacks.onPieceRotated();
        return;
      }
    }
  }

  _resetLockOnMove() {
    if (this.isLocking) {
      this.lockMoveCount++;
      this.lockFrames = 0;
    }
  }

  hold() {
    if (!this.currentPiece || !this.canHold || this.isPaused || this.isGameOver) return;
    const type = this.currentPiece.type;
    if (this.heldPiece) {
      const held = this.heldPiece;
      this.heldPiece = new Piece(type, this.minoColors);
      this.currentPiece = held;
      this.currentPiece.x = 3;
      this.currentPiece.y = 0;
      this.currentPiece.rotation = 0;
    } else {
      this.heldPiece = new Piece(type, this.minoColors);
      this._spawnPiece();
    }
    this.canHold = false;
    this.isLocking = false;
    this.lockFrames = 0;
  }

  togglePause() {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.lastTime = performance.now();
    }
    this.callbacks.onPauseChange && this.callbacks.onPauseChange(this.isPaused);
  }

  _triggerGameOver() {
    this.isRunning = false;
    this.isGameOver = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this._saveHighScore();
    this.callbacks.onGameOver && this.callbacks.onGameOver(this.score, this.level, this.lines);
  }

  _saveHighScore() {
    const charKey = `highscore_${this.character.id}`;
    const prev = parseInt(localStorage.getItem(charKey) || '0');
    if (this.score > prev) localStorage.setItem(charKey, this.score);

    const totalKey = 'highscore_total';
    const prevTotal = parseInt(localStorage.getItem(totalKey) || '0');
    if (this.score > prevTotal) localStorage.setItem(totalKey, this.score);
  }

  getHighScore(characterId) {
    return parseInt(localStorage.getItem(`highscore_${characterId}`) || '0');
  }

  getTotalHighScore() {
    return parseInt(localStorage.getItem('highscore_total') || '0');
  }

  destroy() {
    this.isRunning = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }
}
