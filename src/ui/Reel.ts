import Phaser from 'phaser';
import { FILLER_KEYS, REELS } from '../config';
import { pick } from '../core/rng';

// Columna visible de 3 símbolos (índice 1 = línea de premio central),
// expresada como claves de textura.
export type ReelColumn = [string, string, string];

interface StopRequest {
  rows: ReelColumn;
  onDone: () => void;
}

// Tamaño en pantalla del símbolo dentro de la celda de 150px. Las texturas
// SVG se rasterizan a 256px, así que se reescala (nítido incluso en 1080p).
const SYMBOL_SIZE = 118;
const TEX_SIZE = 256;
const BASE_SCALE = SYMBOL_SIZE / TEX_SIZE;

// Un rodillo: 5 celdas de imagen (3 visibles + 1 buffer arriba y abajo) que
// scrollean en bucle. La parada "encaja" la columna final con un rebote.
export class Reel {
  readonly container: Phaser.GameObjects.Container;

  private cells: Phaser.GameObjects.Image[] = [];
  private keys: string[] = [];
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
      const key = pick(FILLER_KEYS);
      const cell = scene.add
        .image(0, (i - 2) * REELS.symbolH, key)
        .setScale(BASE_SCALE);
      this.cells.push(cell);
      this.keys.push(key);
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
    this.cells.forEach((c) => c.setScale(BASE_SCALE, BASE_SCALE * 1.16).setAlpha(0.88));
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

  // El símbolo que sale por abajo reaparece por arriba con una textura nueva
  private cycle(): void {
    for (let i = this.keys.length - 1; i >= 1; i--) this.keys[i] = this.keys[i - 1];
    this.keys[0] = pick(FILLER_KEYS);
    this.applyKeys();
  }

  private settle(): void {
    const { rows, onDone } = this.stopRequest!;
    this.stopRequest = null;
    this.spinning = false;
    this.offset = 0;

    // a la velocidad de giro el ojo no sigue los símbolos: se puede fijar
    // la columna final directamente y vender la parada con el rebote
    this.keys[0] = pick(FILLER_KEYS);
    this.keys[1] = rows[0];
    this.keys[2] = rows[1];
    this.keys[3] = rows[2];
    this.keys[4] = pick(FILLER_KEYS);
    this.applyKeys();
    this.layout();

    this.cells.forEach((c) => c.setAlpha(1).setScale(BASE_SCALE, BASE_SCALE * 0.86));
    this.container.y = this.baseY + 24;
    this.scene.tweens.add({
      targets: this.container,
      y: this.baseY,
      duration: 260,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: this.cells,
      scaleY: BASE_SCALE,
      duration: 220,
      ease: 'Back.easeOut',
    });

    onDone();
  }

  private applyKeys(): void {
    this.cells.forEach((c, i) => c.setTexture(this.keys[i]));
  }

  private layout(): void {
    this.cells.forEach((c, i) => {
      c.y = (i - 2) * REELS.symbolH + this.offset;
    });
  }
}
