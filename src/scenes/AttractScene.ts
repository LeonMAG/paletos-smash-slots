import Phaser from 'phaser';
import { FILLER_KEYS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { pick, randInt } from '../core/rng';
import { onAction } from '../input';
import { bodyStyle, displayStyle, HEX, INK, monoStyle, RED, YELLOW } from '../theme';
import { scribbleRectPoints } from '../ui/scribble';

const CX = GAME_WIDTH / 2;

// Pantalla de espera de la máquina: invita a jugar hasta que alguien pulsa.
export class AttractScene extends Phaser.Scene {
  constructor() {
    super('attract');
  }

  create(): void {
    // símbolos de comida flotando de fondo, muy sutiles
    for (let i = 0; i < 10; i++) {
      const img = this.add
        .image(randInt(70, GAME_WIDTH - 70), randInt(70, GAME_HEIGHT - 70), pick(FILLER_KEYS))
        .setScale(randInt(28, 44) / 100)
        .setAlpha(0.1)
        .setAngle(randInt(-16, 16));
      this.tweens.add({
        targets: img,
        y: img.y + randInt(-40, 40),
        angle: img.angle + randInt(-10, 10),
        duration: randInt(2400, 4400),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const eyebrow = this.add
      .text(CX, GAME_HEIGHT * 0.16, '★ PALETOS CLUB ★ ARCADE ★', monoStyle(16, HEX.red))
      .setOrigin(0.5);
    eyebrow.setLetterSpacing(5);

    // titular con sombra stamp roja: dos capas de texto desplazadas
    const titleShadow = this.add
      .text(CX + 7, GAME_HEIGHT * 0.29 + 7, 'PALETOS ARCADE', displayStyle(88, HEX.red))
      .setOrigin(0.5);
    const title = this.add
      .text(CX, GAME_HEIGHT * 0.29, 'PALETOS ARCADE', displayStyle(88, HEX.paper))
      .setOrigin(0.5);
    this.tweens.add({
      targets: [title, titleShadow],
      scale: 1.03,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(CX, GAME_HEIGHT * 0.45, 'SMASH SLOTS', displayStyle(46, HEX.yellow))
      .setOrigin(0.5);

    const info = this.add
      .text(
        CX,
        GAME_HEIGHT * 0.56,
        'SCATTER · SÚPER SCATTER · PREMIOS DE VERDAD',
        bodyStyle(19, HEX.grey300),
      )
      .setOrigin(0.5);
    info.setLetterSpacing(2);

    // CTA tipo botón de la marca: caja roja con borde scribble y sombra
    // stamp mostaza
    const ctaY = GAME_HEIGHT * 0.72;
    const ctaPts = scribbleRectPoints(470, 76, 23, 2.2);
    const ctaShadow = this.add.graphics({ x: CX - 235 + 6, y: ctaY - 38 + 6 });
    ctaShadow.fillStyle(YELLOW, 1);
    ctaShadow.fillPoints(ctaPts, true);
    const ctaBox = this.add.graphics({ x: CX - 235, y: ctaY - 38 });
    ctaBox.fillStyle(RED, 1);
    ctaBox.fillPoints(ctaPts, true);
    ctaBox.lineStyle(3, INK, 1);
    ctaBox.strokePoints(ctaPts, true, true);
    const ctaText = this.add
      .text(CX, ctaY, 'PULSA EL BOTÓN', bodyStyle(27, HEX.paper))
      .setOrigin(0.5);
    ctaText.setLetterSpacing(3);
    this.tweens.add({
      targets: [ctaBox, ctaText, ctaShadow],
      alpha: 0.45,
      duration: 620,
      yoyo: true,
      repeat: -1,
    });

    // marquee inferior, como el ticker de la marca
    const chunk = 'PULSA Y GANA ★ SMASH SLOTS ★ PREMIOS DE VERDAD ★ ';
    const marquee = this.add
      .text(0, GAME_HEIGHT - 26, chunk.repeat(6), monoStyle(17, HEX.yellowDeep))
      .setOrigin(0, 0.5);
    const chunkWidth = marquee.width / 6;
    this.tweens.add({
      targets: marquee,
      x: -chunkWidth,
      duration: 8000,
      repeat: -1,
      ease: 'Linear',
    });

    onAction(this, () => this.scene.start('game'));
  }
}
