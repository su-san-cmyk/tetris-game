import { PIECE_SHAPES, BOARD_COLS, BOARD_ROWS } from './constants.js';

export class CpuAI {
  constructor(difficulty) {
    this.difficulty = difficulty;
    this.thinkMs = difficulty.thinkMs;
    this.topK    = difficulty.topK ?? 1;
  }

  // ボードグリッドと現在ピースを受け取り、配置 { x, rotation } を返す
  // topK=1 なら常に最善手、topK>1 なら上位K手からランダム選択（自滅しない難易度差）
  findBestMove(grid, piece) {
    const candidates = this._allValidMoves(grid, piece.type);
    if (candidates.length === 0) return null;

    // 全候補をスコアリングして降順ソート
    const scored = candidates.map(move => {
      const cells = this._getCells(piece.type, move.rotation, move.x, move.landY);
      return { move, score: this._evaluate(grid, cells, piece.color) };
    });
    scored.sort((a, b) => b.score - a.score);

    // 上位 topK 手の中からランダムに選ぶ（最悪手は絶対に選ばない）
    const pick = Math.min(this.topK, scored.length);
    return scored[Math.floor(Math.random() * pick)].move;
  }

  _allValidMoves(grid, type) {
    const moves = [];
    const rotCount = type === 'O' ? 1 : (type === 'S' || type === 'Z' || type === 'I') ? 2 : 4;

    for (let rot = 0; rot < rotCount; rot++) {
      for (let x = -2; x < BOARD_COLS + 2; x++) {
        const spawnCells = this._getCells(type, rot, x, 0);
        if (!this._isValid(grid, spawnCells)) continue;
        const landY = this._dropY(grid, type, rot, x);
        if (landY === null) continue;
        moves.push({ x, rotation: rot, landY });
      }
    }
    return moves;
  }

  // Dellacherie 評価関数
  _evaluate(grid, placedCells, color) {
    // 配置後のグリッドをシミュレート
    const sim = grid.map(r => [...r]);
    for (const [cx, cy] of placedCells) {
      if (cy >= 0 && cy < BOARD_ROWS && cx >= 0 && cx < BOARD_COLS) {
        sim[cy][cx] = color || '#888';
      }
    }

    // ライン消去
    const cleared = sim.filter(r => r.every(c => c !== null)).length;
    const after = sim.filter(r => r.some(c => c === null));
    while (after.length < BOARD_ROWS) after.unshift(Array(BOARD_COLS).fill(null));

    const heights = this._heights(after);
    const aggH   = heights.reduce((a, b) => a + b, 0);
    const holes  = this._holes(after, heights);
    const bump   = this._bumpiness(heights);

    return -0.51 * aggH + 0.76 * cleared - 0.36 * holes - 0.18 * bump;
  }

  _heights(grid) {
    return Array.from({ length: BOARD_COLS }, (_, c) => {
      for (let r = 0; r < BOARD_ROWS; r++) {
        if (grid[r][c] !== null) return BOARD_ROWS - r;
      }
      return 0;
    });
  }

  _holes(grid, heights) {
    let h = 0;
    for (let c = 0; c < BOARD_COLS; c++) {
      const top = BOARD_ROWS - heights[c];
      for (let r = top + 1; r < BOARD_ROWS; r++) {
        if (grid[r][c] === null) h++;
      }
    }
    return h;
  }

  _bumpiness(heights) {
    let b = 0;
    for (let i = 0; i < heights.length - 1; i++) b += Math.abs(heights[i] - heights[i + 1]);
    return b;
  }

  _getCells(type, rotation, x, y) {
    return PIECE_SHAPES[type][rotation % 4].map(([c, r]) => [x + c, y + r]);
  }

  _isValid(grid, cells) {
    return cells.every(([x, y]) => {
      if (x < 0 || x >= BOARD_COLS || y >= BOARD_ROWS) return false;
      if (y < 0) return true;
      return grid[y][x] === null;
    });
  }

  _dropY(grid, type, rotation, x) {
    let y = 0;
    while (true) {
      const next = this._getCells(type, rotation, x, y + 1);
      if (!this._isValid(grid, next)) return y;
      y++;
      if (y > BOARD_ROWS + 4) return null;
    }
  }
}
