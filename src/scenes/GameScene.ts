import Phaser from 'phaser';
import {
  FILLER_KEYS,
  GAME_WIDTH,
  HEAT_THRESHOLD,
  IDLE_TO_ATTRACT_MS,
  PrizeTier,
  prizeLabel,
  REELS,
  RESULT_HOLD_MS,
} from '../config';
import { sfx } from '../core/audio';
import { pick } from '../core/rng';
import { ScatterDirector } from '../core/scatterDirector';
import { computeSpin, SpinKind, SpinOutcome } from '../core/slotEngine';
import { onAction } from '../input';
import {
  bodyStyle,
  displayCleanStyle,
  displayStyle,
  HEX,
  INK,
  monoStyle,
  PAPER,
  RED,
  RED_BRIGHT,
  YELLOW,
} from '../theme';
import { Reel, ReelColumn } from '../ui/Reel';
import { scribbleRectPoints } from '../ui/scribble';

type GameState = 'ready' | 'spinning' | 'result';

const CX = GAME_WIDTH / 2;
const REELS_Y = 330;

const TIER_COLORS: Record<PrizeTier, string> = {
  nada: HEX.grey500,
  pequeno: HEX.paper,
  medio: HEX.yellow,
  gordo: HEX.redBright,
};

interface SmashBits {
  dim: Phaser.GameObjects.Rectangle;
  txt: Phaser.GameObjects.Text;
  ring: Phaser.GameObjects.Graphics;
  ringTween: Phaser.Tweens.Tween;
}

export class GameScene extends Phaser.Scene {
  private stateName: GameState = 'ready';
  private director!: ScatterDirector;
  private reels: Reel[] = [];
  private outcome: SpinOutcome | null = null;
  private smashOpen = false;
  private smashHit = false;
  private smashBits: SmashBits | null = null;

  private glowRect!: Phaser.GameObjects.Rectangle;
  private glowPulse: Phaser.Tweens.Tween | null = null;
  private antGlow!: Phaser.GameObjects.Rectangle;
  private antPulse: Phaser.Tweens.Tween | null = null;

  private headline!: Phaser.GameObjects.Text;
  private prizeBanner!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private heatText!: Phaser.GameObjects.Text;

  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  private puff!: Phaser.GameObjects.Particles.ParticleEmitter;

  private tickAccum = 0;
  private lastActivity = 0;

  constructor() {
    super('game');
  }

  create(): void {
    this.stateName = 'ready';
    this.outcome = null;
    this.smashOpen = false;
    this.smashHit = false;
    this.smashBits = null;
    this.reels = [];
    this.director = new ScatterDirector();

    this.buildLayout();
    this.buildParticles();

    this.counterText.setText(`TIRADA #${this.director.spins}`);
    this.updateHeat();
    this.toReady();

    onAction(this, () => this.handleAction());
    this.lastActivity = this.time.now;
  }

  private buildLayout(): void {
    this.add
      .text(CX, 28, '★ PALETOS ARCADE · SMASH SLOTS ★', monoStyle(17, HEX.grey500))
      .setOrigin(0.5);

    // marco de los rodillos: panel de papel con borde scribble (capa
    // hand-drawn del DS) y sombra stamp roja, sin esquinas redondeadas
    const panelPts = scribbleRectPoints(700, 510, 11, 3);
    const panelShadow = this.add.graphics({ x: CX - 350 + 10, y: REELS_Y - 255 + 10 });
    panelShadow.fillStyle(RED, 1);
    panelShadow.fillPoints(panelPts, true);
    const panel = this.add.graphics({ x: CX - 350, y: REELS_Y - 255 });
    panel.fillStyle(PAPER, 1);
    panel.fillPoints(panelPts, true);
    panel.lineStyle(4, INK, 1);
    panel.strokePoints(panelPts, true, true);

    // banda de la línea de premio en mostaza + filos de tinta
    this.add.rectangle(CX, REELS_Y, 640, 150, YELLOW, 0.35);
    const bandLines = this.add.graphics();
    bandLines.lineStyle(2, INK, 0.55);
    bandLines.lineBetween(320, REELS_Y - 75, 960, REELS_Y - 75);
    bandLines.lineBetween(320, REELS_Y + 75, 960, REELS_Y + 75);

    // halos: el general (scatter) y el del tercer rodillo (anticipación)
    this.glowRect = this.add.rectangle(CX, REELS_Y, 720, 530, YELLOW, 1).setAlpha(0);
    this.antGlow = this.add
      .rectangle(CX + REELS.spacing, REELS_Y, REELS.width + 14, 470, YELLOW, 1)
      .setAlpha(0)
      .setVisible(false);

    for (let i = 0; i < REELS.count; i++) {
      this.reels.push(new Reel(this, this.reelX(i), REELS_Y));
    }
    const maskShape = this.add.graphics().setVisible(false);
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(320, REELS_Y - 225, 640, 450);
    const mask = maskShape.createGeometryMask();
    this.reels.forEach((r) => r.container.setMask(mask));

    // marcadores de la línea de premio: la ★ de la marca
    const starL = this.add.text(302, REELS_Y, '★', bodyStyle(26, HEX.red)).setOrigin(0.5);
    const starR = this.add.text(978, REELS_Y, '★', bodyStyle(26, HEX.red)).setOrigin(0.5);
    this.tweens.add({
      targets: [starL, starR],
      alpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.headline = this.add
      .text(CX, 600, '', displayCleanStyle(28, HEX.paper))
      .setOrigin(0.5);
    this.prizeBanner = this.add
      .text(CX, 648, '', displayStyle(44, HEX.paper))
      .setOrigin(0.5);
    this.hintText = this.add.text(CX, 696, '', bodyStyle(18, HEX.grey500)).setOrigin(0.5);
    this.hintText.setLetterSpacing(2);

    this.counterText = this.add
      .text(18, 700, '', monoStyle(15, HEX.grey500))
      .setOrigin(0, 0.5);
    this.heatText = this.add
      .text(1262, 700, '', monoStyle(17, HEX.yellow))
      .setOrigin(1, 0.5)
      .setVisible(false);
    this.tweens.add({
      targets: this.heatText,
      alpha: 0.35,
      duration: 460,
      yoyo: true,
      repeat: -1,
    });
  }

  private buildParticles(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('dot', 16, 16);
    g.destroy();

    this.confetti = this.add
      .particles(0, 0, 'dot', {
        speed: { min: 260, max: 520 },
        angle: { min: 240, max: 300 },
        gravityY: 750,
        lifespan: { min: 900, max: 1500 },
        scale: { start: 0.9, end: 0.15 },
        tint: [YELLOW, RED, PAPER, RED_BRIGHT],
        emitting: false,
      })
      .setDepth(15);

    this.puff = this.add
      .particles(0, 0, 'dot', {
        speed: { min: 50, max: 150 },
        lifespan: 320,
        scale: { start: 0.55, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: PAPER,
        emitting: false,
      })
      .setDepth(8);
  }

  private reelX(i: number): number {
    return CX + (i - 1) * REELS.spacing;
  }

  private handleAction(): void {
    sfx.unlock();
    this.lastActivity = this.time.now;
    if (this.stateName === 'ready') {
      this.startSpin();
    } else if (this.stateName === 'spinning' && this.smashOpen) {
      this.resolveSmash(true);
    } else if (this.stateName === 'result') {
      this.toReady();
    }
  }

  private toReady(): void {
    this.stateName = 'ready';
    this.headline.setText('');
    this.prizeBanner.setText('');
    this.hintText.setText('PULSA EL BOTÓN PARA TIRAR').setColor(HEX.grey500);
    this.lastActivity = this.time.now;
  }

  private startSpin(): void {
    this.stateName = 'spinning';
    this.smashHit = false;
    this.smashOpen = false;
    sfx.press();

    const kind = this.director.rollSpin();
    const outcome = computeSpin(kind);
    this.outcome = outcome;

    this.counterText.setText(`TIRADA #${this.director.spins}`);
    this.updateHeat();
    this.headline.setText('');
    this.prizeBanner.setText('');
    this.hintText.setText('');

    const begin = () => {
      sfx.spinStart();
      this.reels.forEach((r) => r.start());

      if (outcome.smash) {
        this.time.delayedCall(outcome.smash.at, () => this.openSmash(outcome.smash!.windowMs));
      }
      for (let i = 0; i < REELS.count; i++) {
        const extra =
          i === REELS.count - 1 && outcome.anticipation ? REELS.anticipationExtra : 0;
        this.time.delayedCall(REELS.stopBase + i * REELS.stopStagger + extra, () =>
          this.stopReel(i),
        );
      }
    };

    if (kind === 'normal') begin();
    else this.scatterIntro(kind, begin);
  }

  private scatterIntro(kind: SpinKind, then: () => void): void {
    const isSuper = kind === 'super';
    sfx.scatterSting(isSuper);
    this.cameras.main.flash(240, 245, isSuper ? 46 : 197, isSuper ? 34 : 24);

    const txt = this.add
      .text(CX, REELS_Y, isSuper ? '✶ ¡SÚPER SCATTER! ✶' : '★ ¡SCATTER! ★', {
        ...displayStyle(58, isSuper ? HEX.redBright : HEX.yellow),
        stroke: HEX.ink,
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(22)
      .setScale(0.2);
    this.tweens.add({ targets: txt, scale: 1, duration: 280, ease: 'Back.easeOut' });

    this.glowRect.setFillStyle(isSuper ? RED_BRIGHT : YELLOW, 1);
    this.glowPulse?.stop();
    this.glowPulse = this.tweens.add({
      targets: this.glowRect,
      alpha: { from: 0.1, to: 0.28 },
      duration: 420,
      yoyo: true,
      repeat: -1,
    });

    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: txt,
        alpha: 0,
        scale: 1.3,
        duration: 220,
        onComplete: () => txt.destroy(),
      });
      then();
    });
  }

  private columnFor(i: number): ReelColumn {
    const middle = (this.smashHit ? this.outcome!.middleUpgraded : this.outcome!.middleBase)[i];
    return [pick(FILLER_KEYS), middle.id, pick(FILLER_KEYS)];
  }

  private stopReel(i: number): void {
    this.reels[i].requestStop(this.columnFor(i), () => this.onReelStopped(i));
  }

  private onReelStopped(i: number): void {
    sfx.reelStop(i);
    this.cameras.main.shake(70, 0.003);
    this.puff.explode(10, this.reelX(i), REELS_Y + 60);

    if (i === 1 && this.outcome!.anticipation) this.startAnticipation();
    if (i === REELS.count - 1) {
      this.stopAnticipation();
      this.time.delayedCall(380, () => this.showResult());
    }
  }

  private startAnticipation(): void {
    this.antGlow.setVisible(true);
    this.antPulse?.stop();
    this.antPulse = this.tweens.add({
      targets: this.antGlow,
      alpha: { from: 0.08, to: 0.36 },
      duration: 230,
      yoyo: true,
      repeat: -1,
    });
  }

  private stopAnticipation(): void {
    this.antPulse?.stop();
    this.antPulse = null;
    this.antGlow.setAlpha(0).setVisible(false);
  }

  private openSmash(windowMs: number): void {
    if (this.stateName !== 'spinning') return;
    this.smashOpen = true;
    sfx.smashCue();

    const dim = this.add.rectangle(CX, 360, GAME_WIDTH, 720, INK, 0.62).setDepth(20);
    const txt = this.add
      .text(CX, REELS_Y, '¡SMASH!', {
        ...displayStyle(116, HEX.yellow),
        stroke: HEX.red,
        strokeThickness: 14,
      })
      .setOrigin(0.5)
      .setDepth(21)
      .setScale(0.25)
      .setAngle(-3);
    this.tweens.add({ targets: txt, scale: 1.06, duration: 130, ease: 'Back.easeOut' });

    const ring = this.add.graphics().setDepth(21);
    const ringState = { r: 170 };
    const ringTween = this.tweens.add({
      targets: ringState,
      r: 40,
      duration: windowMs,
      onUpdate: () => {
        ring.clear();
        ring.lineStyle(10, YELLOW, 1);
        ring.strokeCircle(CX, REELS_Y, ringState.r);
      },
      onComplete: () => this.resolveSmash(false),
    });

    this.smashBits = { dim, txt, ring, ringTween };
  }

  private resolveSmash(hit: boolean): void {
    if (!this.smashOpen || !this.smashBits) return;
    this.smashOpen = false;
    const bits = this.smashBits;
    this.smashBits = null;
    bits.ringTween.stop();
    bits.ring.clear();

    if (hit) {
      this.smashHit = true;
      sfx.smashHit();
      this.cameras.main.flash(170, 245, 197, 24);
      this.cameras.main.shake(130, 0.005);
      this.confetti.explode(30, CX, REELS_Y);
      bits.txt.setText('¡SMASH! ★');
    } else {
      sfx.smashMiss();
      bits.txt.setColor(HEX.grey500).setText('SMASH…');
    }

    this.tweens.add({ targets: bits.dim, alpha: 0, duration: 220 });
    this.tweens.add({
      targets: bits.txt,
      alpha: 0,
      scale: hit ? 1.45 : 0.85,
      duration: 330,
    });
    this.time.delayedCall(420, () => {
      bits.dim.destroy();
      bits.txt.destroy();
      bits.ring.destroy();
    });
  }

  private showResult(): void {
    this.stateName = 'result';
    const o = this.outcome!;
    const tier = this.smashHit ? o.upgradedTier : o.baseTier;

    this.glowPulse?.stop();
    this.glowPulse = null;
    this.glowRect.setAlpha(0);

    const nearMiss = tier === 'nada' && o.middleBase[0].id === o.middleBase[1].id;
    const headline =
      o.kind === 'super'
        ? '✶ SÚPER SCATTER ✶'
        : o.kind === 'scatter'
          ? '★ SCATTER ★'
          : this.smashHit
            ? '¡SMASH CONSEGUIDO!'
            : tier === 'nada'
              ? nearMiss
                ? '¡CASI!'
                : ''
              : '¡PREMIO!';

    this.headline
      .setText(headline)
      .setColor(o.kind === 'super' ? HEX.redBright : o.kind === 'scatter' ? HEX.yellow : HEX.paper);
    this.prizeBanner.setText(prizeLabel(tier)).setColor(TIER_COLORS[tier]).setScale(0.2);
    this.tweens.add({ targets: this.prizeBanner, scale: 1, duration: 240, ease: 'Back.easeOut' });

    sfx.win(tier);
    if (tier === 'pequeno') {
      this.confetti.explode(25, CX, 230);
    } else if (tier === 'medio') {
      this.confetti.explode(60, CX, 220);
      this.cameras.main.shake(150, 0.004);
      this.cameras.main.flash(130, 245, 197, 24);
    } else if (tier === 'gordo') {
      this.confetti.explode(140, CX, 200);
      this.time.delayedCall(320, () => this.confetti.explode(90, CX, 180));
      this.cameras.main.shake(260, 0.006);
      this.cameras.main.flash(220, 245, 197, 24);
      this.tweens.add({
        targets: this.prizeBanner,
        scale: 1.07,
        duration: 280,
        yoyo: true,
        repeat: 3,
      });
    }

    this.time.delayedCall(700, () => {
      if (this.stateName === 'result') {
        this.hintText.setText('PULSA PARA SEGUIR').setColor(HEX.grey500);
      }
    });
    this.time.delayedCall(RESULT_HOLD_MS[tier], () => {
      if (this.stateName === 'result') this.toReady();
    });
  }

  private updateHeat(): void {
    const r = this.director.remaining;
    if (r <= HEAT_THRESHOLD) {
      this.heatText
        .setVisible(true)
        .setText(r <= 4 ? '★ ¡BONUS MUY CERCA! ★' : '★ BONUS CERCA');
    } else {
      this.heatText.setVisible(false);
    }
  }

  update(_time: number, dtMs: number): void {
    let anySpinning = false;
    for (const r of this.reels) {
      r.update(dtMs);
      if (r.isSpinning) anySpinning = true;
    }
    if (anySpinning) {
      this.tickAccum += dtMs;
      if (this.tickAccum > 85) {
        this.tickAccum = 0;
        sfx.tick();
      }
    }
    if (this.stateName === 'ready' && this.time.now - this.lastActivity > IDLE_TO_ATTRACT_MS) {
      this.scene.start('attract');
    }
  }
}
