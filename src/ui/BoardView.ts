import Phaser from 'phaser';
import { BOARD } from '../config';
import { CascadeStep, randomSymbol } from '../core/board';

// Las texturas SVG se rasterizan a 512px y se muestran a 138px dentro de la
// celda de 160 — nítido incluso con reescalado del kiosko.
const TEX_SIZE = 512;
const SYMBOL_SIZE = 138;
const BASE_SCALE = SYMBOL_SIZE / TEX_SIZE;

export interface BoardFx {
  pop(x: number, y: number): void;
  columnStop(col: number, x: number, y: number): void;
}

// Vista del tablero 6×5. El "giro" es un barajado rápido de texturas por
// columna (a esta velocidad el ojo no sigue los símbolos); la parada encaja
// la columna final con un rebote. Las cascadas reutilizan los mismos 30
// sprites con un pool (pop → cae → respawn).
export class BoardView {
  private sprites: Phaser.GameObjects.Image[][] = [];
  private spinningCols: boolean[] = [];
  private shuffleAccum = 0;

  constructor(
    private scene: Phaser.Scene,
    private originX: number,
    private originY: number,
    private fx: BoardFx,
  ) {
    for (let c = 0; c < BOARD.cols; c++) {
      const col: Phaser.GameObjects.Image[] = [];
      for (let r = 0; r < BOARD.rows; r++) {
        col.push(scene.add.image(this.x(c), this.y(r), randomSymbol()).setScale(BASE_SCALE));
      }
      this.sprites.push(col);
      this.spinningCols.push(false);
    }
  }

  x(c: number): number {
    return this.originX + c * BOARD.cell;
  }

  y(r: number): number {
    return this.originY + r * BOARD.cell;
  }

  applyMask(mask: Phaser.Display.Masks.GeometryMask): void {
    this.sprites.flat().forEach((s) => s.setMask(mask));
  }

  get anySpinning(): boolean {
    return this.spinningCols.some(Boolean);
  }

  isSpinning(c: number): boolean {
    return this.spinningCols[c];
  }

  firstSpinning(): number {
    return this.spinningCols.findIndex(Boolean);
  }

  startSpin(): void {
    for (let c = 0; c < BOARD.cols; c++) this.spinningCols[c] = true;
    this.sprites.flat().forEach((s) => s.setAlpha(0.85).setScale(BASE_SCALE, BASE_SCALE * 1.12));
  }

  update(dtMs: number): void {
    if (!this.anySpinning) return;
    this.shuffleAccum += dtMs;
    if (this.shuffleAccum < BOARD.shuffleMs) return;
    this.shuffleAccum = 0;
    for (let c = 0; c < BOARD.cols; c++) {
      if (!this.spinningCols[c]) continue;
      for (let r = 0; r < BOARD.rows; r++) {
        this.sprites[c][r].setTexture(randomSymbol());
      }
    }
  }

  stopColumn(c: number, rows: string[], onSettled: () => void): void {
    this.spinningCols[c] = false;
    for (let r = 0; r < BOARD.rows; r++) {
      const s = this.sprites[c][r];
      s.setTexture(rows[r]).setAlpha(1).setScale(BASE_SCALE);
      s.y = this.y(r) - 26;
      this.scene.tweens.add({
        targets: s,
        y: this.y(r),
        duration: 240,
        ease: 'Back.easeOut',
        onComplete: r === BOARD.rows - 1 ? () => {
          this.fx.columnStop(c, this.x(c), this.y(BOARD.rows - 1) + 50);
          onSettled();
        } : undefined,
      });
    }
  }

  // Anima un paso de cascada: explotan los cluster, caen los de arriba y
  // entran piezas nuevas desde fuera del tablero (los sprites se reciclan).
  applyStep(step: CascadeStep, onDone: () => void): void {
    const clearedPool: Phaser.GameObjects.Image[] = [];
    for (const cell of step.cleared) {
      const s = this.sprites[cell.col][cell.row];
      clearedPool.push(s);
      this.fx.pop(s.x, s.y);
      this.scene.tweens.add({
        targets: s,
        scale: 0,
        alpha: 0,
        duration: 180,
        ease: 'Back.easeIn',
      });
    }

    const next = this.sprites.map((col) => [...col]);
    for (const f of step.falls) next[f.col][f.toRow] = this.sprites[f.col][f.fromRow];

    const missingByCol = new Map<number, number>();
    for (const sp of step.spawns) {
      missingByCol.set(sp.col, (missingByCol.get(sp.col) ?? 0) + 1);
    }
    for (const sp of step.spawns) {
      const s = clearedPool.pop()!;
      next[sp.col][sp.row] = s;
    }

    this.scene.time.delayedCall(190, () => {
      for (const f of step.falls) {
        this.scene.tweens.add({
          targets: next[f.col][f.toRow],
          y: this.y(f.toRow),
          duration: 230,
          ease: 'Cubic.easeIn',
        });
      }
      for (const sp of step.spawns) {
        const s = next[sp.col][sp.row];
        this.scene.tweens.killTweensOf(s);
        s.setTexture(sp.id).setScale(BASE_SCALE).setAlpha(1);
        s.x = this.x(sp.col);
        s.y = this.y(sp.row - (missingByCol.get(sp.col) ?? 1));
        this.scene.tweens.add({
          targets: s,
          y: this.y(sp.row),
          duration: 260,
          ease: 'Cubic.easeIn',
        });
      }
      this.sprites = next;
      this.scene.time.delayedCall(310, onDone);
    });
  }
}
