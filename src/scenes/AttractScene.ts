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
        .image(randInt(100, GAME_WIDTH - 100), randInt(100, GAME_HEIGHT - 100), pick(FILLER_KEYS))
        .setScale(randInt(22, 36) / 100)
        .setAlpha(0.1)
        .setAngle(randInt(-16, 16));
      this.tweens.add({
        targets: img,
        y: img.y + randInt(-56, 56),
        angle: img.angle + randInt(-10, 10),
        duration: randInt(2400, 4400),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const eyebrow = this.add
      .text(CX, 172, '★ PALETOS CLUB ★ ARCADE ★', monoStyle(22, HEX.red))
      .setOrigin(0.5);
    eyebrow.setLetterSpacing(7);

    // titular con sombra stamp roja: dos capas de texto desplazadas
    const titleShadow = this.add
      .text(CX + 9, 312 + 9, 'PALETOS ARCADE', displayStyle(122, HEX.red))
      .setOrigin(0.5);
    const title = this.add
      .text(CX, 312, 'PALETOS ARCADE', displayStyle(122, HEX.paper))
      .setOrigin(0.5);
    this.tweens.add({
      targets: [title, titleShadow],
      scale: 1.03,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(CX, 488, 'SMASH SLOTS', displayStyle(62, HEX.yellow)).setOrigin(0.5);

    const info = this.add
      .text(
        CX,
        608,
        'CASCADAS · TIRADAS GRATIS · SCATTER · PREMIOS DE VERDAD',
        bodyStyle(25, HEX.grey300),
      )
      .setOrigin(0.5);
    info.setLetterSpacing(3);

    // CTA tipo botón de la marca: caja roja con borde scribble y sombra
    // stamp mostaza
    const ctaY = 790;
    const ctaPts = scribbleRectPoints(640, 100, 23, 2.6);
    const ctaShadow = this.add.graphics({ x: CX - 320 + 8, y: ctaY - 50 + 8 });
    ctaShadow.fillStyle(YELLOW, 1);
    ctaShadow.fillPoints(ctaPts, true);
    const ctaBox = this.add.graphics({ x: CX - 320, y: ctaY - 50 });
    ctaBox.fillStyle(RED, 1);
    ctaBox.fillPoints(ctaPts, true);
    ctaBox.lineStyle(4, INK, 1);
    ctaBox.strokePoints(ctaPts, true, true);
    const ctaText = this.add
      .text(CX, ctaY, 'PULSA EL BOTÓN', bodyStyle(36, HEX.paper))
      .setOrigin(0.5);
    ctaText.setLetterSpacing(4);
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
      .text(0, GAME_HEIGHT - 36, chunk.repeat(6), monoStyle(24, HEX.yellowDeep))
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
