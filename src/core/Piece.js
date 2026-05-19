import { PIECE_SHAPES, WALL_KICKS_JLSTZ, WALL_KICKS_I, DEFAULT_MINO_COLORS } from './constants.js';

export class Piece {
  constructor(type, minoColors = DEFAULT_MINO_COLORS) {
    this.type = type;
    this.rotation = 0;
    this.x = 3; // ボード上のX位置
    this.y = 0; // ボード上のY位置
    this.color = minoColors[type] || DEFAULT_MINO_COLORS[type];
    this.minoColors = minoColors;
  }

  // 現在の回転状態のセル座標を返す（ボード座標）
  getCells() {
    return PIECE_SHAPES[this.type][this.rotation].map(([c, r]) => [
      this.x + c, this.y + r
    ]);
  }

  // 指定の回転状態のセル座標（オフセット付き）
  getCellsAt(x, y, rotation) {
    const rot = ((rotation % 4) + 4) % 4;
    return PIECE_SHAPES[this.type][rot].map(([c, r]) => [x + c, y + r]);
  }

  // Wall Kick データ取得
  getWallKicks(fromRot, toRot, range = 1) {
    const key = `${fromRot}->${toRot}`;
    const kicks = this.type === 'I'
      ? (WALL_KICKS_I[key] || [])
      : (WALL_KICKS_JLSTZ[key] || []);
    // range が広い場合は追加のkickデータを含む
    return kicks.slice(0, Math.min(kicks.length, range));
  }
}
