import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { onAction } from '../input';

// Pantalla de espera de la máquina: invita a jugar hasta que alguien pulsa.
export class AttractScene extends Phaser.Scene {
  constructor() {
    super('attract');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, GAME_HEIGHT * 0.3, 'PALETOS ARCADE', {
        fontSize: '64px',
        color: '#ffcc00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.45, 'SMASH SLOTS · prototipo', {
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const cta = this.add
      .text(cx, GAME_HEIGHT * 0.7, 'PULSA EL BOTÓN PARA JUGAR', {
        fontSize: '28px',
        color: '#ff4444',
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
