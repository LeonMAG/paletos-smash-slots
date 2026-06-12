import Phaser from 'phaser';
import { FILLER_CHARS, REELS } from '../config';
import { pick } from '../core/rng';

// Columna visible de 3 símbolos (índice 1 = línea de premio central)
export type ReelColumn = [string, string, string];

interface StopRequest {
  rows: ReelColumn;
  onDone: () => void;
}

// Un rodillo: 5 celdas de texto (3 visibles + 1 buffer arriba y abajo) que
// scrollean en bucle. La parada "encaja" la columna final con un rebote.
export class Reel {
  readonly container: Phaser.GameObjects.Container;

  private cells: Phaser.GameObjects.Text[] = [];
  private chars: string[] = [];
  private offset = 0;
  private spinning = false;
  private stopRequest: StopRequest | null = null;
  private readonly baseY: number;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.baseY = y;
    this.container = scene.add.container(x, y);
    for (let i = 0; i < 5; i++) {
      const char = pick(FILLER_CHARS);
      const cell = scene.add
        .text(0, (i - 2) * REELS.symbolH, char, {
          fontSize: '96px',
          fontFamily: 'system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif',
        })
        .setOrigin(0.5)
        .setPadding(12);
      this.cells.push(cell);
      this.chars.push(char);
      this.container.add(cell);
    }
  }

  get isSpinning(): boolean {
    return this.spinning;
  }

  start(): void {
    this.spinning = true;
    this.stopRequest = null;
    this.offset = 0;
    // estirado vertical sutil mientras gira: sensación de velocidad
    this.cells.forEach((c) => c.setScale(1, 1.18).setAlpha(0.85));
  }

  requestStop(rows: ReelColumn, onDone: () => void): void {
    this.stopRequest = { rows, onDone };
  }

  update(dtMs: number): void {
    if (!this.spinning) return;
    this.offset += (REELS.speed * dtMs) / 1000;
    while (this.offset >= REELS.symbolH) {
      this.offset -= REELS.symbolH;
      this.cycle();
      if (this.stopRequest) {
        this.settle();
        return;
      }
    }
    this.layout();
  }

  // El símbolo que sale por abajo reaparece por arriba con un carácter nuevo
  private cycle(): void {
    for (let i = this.chars.length - 1; i >= 1; i--) this.chars[i] = this.chars[i - 1];
    this.chars[0] = pick(FILLER_CHARS);
    this.applyChars();
  }

  private settle(): void {
    const { rows, onDone } = this.stopRequest!;
    this.stopRequest = null;
    this.spinning = false;
    this.offset = 0;

    // a la velocidad de giro el ojo no sigue los caracteres: se puede fijar
    // la columna final directamente y vender la parada con el rebote
    this.chars[0] = pick(FILLER_CHARS);
    this.chars[1] = rows[0];
    this.chars[2] = rows[1];
    this.chars[3] = rows[2];
    this.chars[4] = pick(FILLER_CHARS);
    this.applyChars();
    this.layout();

    this.cells.forEach((c) => c.setAlpha(1).setScale(1, 0.86));
    this.container.y = this.baseY + 24;
    this.scene.tweens.add({
      targets: this.container,
      y: this.baseY,
      duration: 260,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: this.cells,
      scaleY: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });

    onDone();
  }

  private applyChars(): void {
    this.cells.forEach((c, i) => c.setText(this.chars[i]));
  }

  private layout(): void {
    this.cells.forEach((c, i) => {
      c.y = (i - 2) * REELS.symbolH + this.offset;
    });
  }
}
