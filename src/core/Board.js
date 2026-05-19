import { BOARD_COLS, BOARD_ROWS } from './constants.js';

export class Board {
  constructor() {
    this.grid = this.createEmptyGrid();
  }

  createEmptyGrid() {
    return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
  }

  reset() {
    this.grid = this.createEmptyGrid();
  }

  // セルが空かチェック
  isEmpty(x, y) {
    if (x < 0 || x >= BOARD_COLS || y >= BOARD_ROWS) return false;
    if (y < 0) return true; // 上方向はOK
    return this.grid[y][x] === null;
  }

  // ピースが有効位置かチェック
  isValidPosition(cells) {
    return cells.every(([x, y]) => this.isEmpty(x, y));
  }

  // ピースを固定
  lockPiece(cells, color) {
    cells.forEach(([x, y]) => {
      if (y >= 0 && y < BOARD_ROWS && x >= 0 && x < BOARD_COLS) {
        this.grid[y][x] = color;
      }
    });
  }

  // 消えるライン行インデックスを返す（実際には消去しない）
  findClearedRows() {
    const rows = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      if (this.grid[r].every(c => c !== null)) rows.push(r);
    }
    return rows;
  }

  // ライン消去。消えたライン数を返す
  clearLines() {
    const newGrid = this.grid.filter(row => row.some(cell => cell === null));
    const cleared = BOARD_ROWS - newGrid.length;
    // 上に空行を追加
    while (newGrid.length < BOARD_ROWS) {
      newGrid.unshift(Array(BOARD_COLS).fill(null));
    }
    this.grid = newGrid;
    return cleared;
  }

  // お邪魔ブロック追加（2人対戦用に準備、今は未使用）
  addGarbageLines(count) {
    const gapCol = Math.floor(Math.random() * BOARD_COLS);
    for (let i = 0; i < count; i++) {
      this.grid.shift();
      const row = Array(BOARD_COLS).fill('#888888');
      row[gapCol] = null;
      this.grid.push(row);
    }
  }

  // ゲームオーバー判定（最上段が埋まっているか）
  isTopOut() {
    return this.grid[0].some(cell => cell !== null) || this.grid[1].some(cell => cell !== null);
  }
}
