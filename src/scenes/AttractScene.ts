import Phaser from 'phaser';
import { FILLER_CHARS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { pick, randInt } from '../core/rng';
import { onAction } from '../input';

// Pantalla de espera de la máquina: invita a jugar hasta que alguien pulsa.
export class AttractScene extends Phaser.Scene {
  constructor() {
    super('attract');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // comida flotando de fondo
    for (let i = 0; i < 12; i++) {
      const e = this.add
        .text(randInt(60, GAME_WIDTH - 60), randInt(60, GAME_HEIGHT - 60), pick(FILLER_CHARS), {
          fontSize: `${randInt(40, 70)}px`,
        })
        .setOrigin(0.5)
        .setAlpha(0.14)
        .setAngle(randInt(-18, 18));
      this.tweens.add({
        targets: e,
        y: e.y + randInt(-44, 44),
        angle: e.angle + randInt(-10, 10),
        duration: randInt(2200, 4200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const title = this.add
      .text(cx, GAME_HEIGHT * 0.28, 'PALETOS ARCADE', {
        fontSize: '76px',
        color: '#ffcc00',
        fontStyle: 'bold',
        stroke: '#101014',
        strokeThickness: 10,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: title,
      scale: 1.045,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(cx, GAME_HEIGHT * 0.43, '🍔 SMASH SLOTS 🍟', {
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.54, '⭐ SCATTER · 🔥 SÚPER SCATTER · PREMIOS DE VERDAD', {
        fontSize: '22px',
        color: '#8a8a94',
      })
      .setOrigin(0.5);

    const cta = this.add
      .text(cx, GAME_HEIGHT * 0.72, 'PULSA EL BOTÓN PARA JUGAR', {
        fontSize: '30px',
        color: '#ff4444',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: cta,
      alpha: 0.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    onAction(this, () => this.scene.start('game'));
  }
}
