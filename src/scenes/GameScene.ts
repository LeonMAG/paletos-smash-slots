import Phaser from 'phaser';
import {
  BOARD,
  FREE_SPINS,
  GAME_WIDTH,
  HEAT_THRESHOLD,
  IDLE_TO_ATTRACT_MS,
  maxTier,
  PrizeTier,
  prizeLabel,
  RESULT_HOLD_MS,
  SCATTER,
  SMASH_FINAL,
} from '../config';
import { sfx } from '../core/audio';
import {
  CascadeResult,
  Grid,
  injectStars,
  MashPlan,
  planMash,
  randomGrid,
  resolveCascades,
  SpinKind,
  tierForCleared,
  triggersFreeSpins,
} from '../core/board';
import { chance } from '../core/rng';
import { ScatterDirector } from '../core/scatterDirector';
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
import { BoardView } from '../ui/BoardView';
import { scribbleRectPoints } from '../ui/scribble';

type GameState = 'ready' | 'spinning' | 'resolving' | 'mashing' | 'result';

const CX = GAME_WIDTH / 2;
const BOARD_CENTER_Y = 510;
const BOARD_LEFT = CX - (BOARD.cols * BOARD.cell) / 2;
const BOARD_TOP = BOARD_CENTER_Y - (BOARD.rows * BOARD.cell) / 2;
const ORIGIN_X = BOARD_LEFT + BOARD.cell / 2;
const ORIGIN_Y = BOARD_TOP + BOARD.cell / 2;
const HINT_Y = 1066;

const TIER_COLORS: Record<PrizeTier, string> = {
  nada: HEX.grey500,
  pequeno: HEX.paper,
  medio: HEX.yellow,
  gordo: HEX.redBright,
};

interface MashBits {
  dim: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  note: Phaser.GameObjects.Text;
  burger: Phaser.GameObjects.Image;
  meterBox: Phaser.GameObjects.Rectangle;
  meterFill: Phaser.GameObjects.Rectangle;
  timerBar: Phaser.GameObjects.Rectangle;
  timerTween: Phaser.Tweens.Tween;
}

export class GameScene extends Phaser.Scene {
  private stateName: GameState = 'ready';
  private director!: ScatterDirector;
  private board!: BoardView;
  private finalGrid: Grid = [];
  private eventKind: SpinKind = 'normal';
  private eventTier: PrizeTier | null = null;
  private cascade: CascadeResult | null = null;
  private spinStartAt = 0;

  // tiradas gratis
  private inFree = false;
  private freeLeft = 0;
  private freeBest: PrizeTier = 'nada';

  // smash final
  private mashPlan: MashPlan | null = null;
  private mashPresses = 0;
  private mashBits: MashBits | null = null;

  private glowRect!: Phaser.GameObjects.Rectangle;
  private glowPulse: Phaser.Tweens.Tween | null = null;

  private headline!: Phaser.GameObjects.Text;
  private prizeBanner!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private heatText!: Phaser.GameObjects.Text;
  private nextMarker!: Phaser.GameObjects.Text;

  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  private puff!: Phaser.GameObjects.Particles.ParticleEmitter;

  private tickAccum = 0;
  private lastActivity = 0;
  // ?bonus: fuerza picotas en 3 columnas en cada tirada manual (para playtest)
  private readonly forceBonus = new URLSearchParams(location.search).has('bonus');

  constructor() {
    super('game');
  }

  create(): void {
    this.stateName = 'ready';
    this.eventKind = 'normal';
    this.eventTier = null;
    this.cascade = null;
    this.inFree = false;
    this.freeLeft = 0;
    this.freeBest = 'nada';
    this.mashPlan = null;
    this.mashBits = null;
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
      .text(CX, 40, '★ PALETOS ARCADE · SMASH SLOTS ★', monoStyle(22, HEX.grey500))
      .setOrigin(0.5);
    this.counterText = this.add.text(28, 40, '', monoStyle(19, HEX.grey500)).setOrigin(0, 0.5);
    this.heatText = this.add
      .text(GAME_WIDTH - 28, 40, '', monoStyle(21, HEX.yellow))
      .setOrigin(1, 0.5)
      .setVisible(false);
    this.tweens.add({
      targets: this.heatText,
      alpha: 0.35,
      duration: 460,
      yoyo: true,
      repeat: -1,
    });

    // panel de papel con borde scribble y sombra stamp roja
    const PANEL_W = 1020;
    const PANEL_H = 860;
    const panelPts = scribbleRectPoints(PANEL_W, PANEL_H, 11, 4);
    const panelShadow = this.add.graphics({ x: CX - PANEL_W / 2 + 14, y: 80 + 14 });
    panelShadow.fillStyle(RED, 1);
    panelShadow.fillPoints(panelPts, true);
    const panel = this.add.graphics({ x: CX - PANEL_W / 2, y: 80 });
    panel.fillStyle(PAPER, 1);
    panel.fillPoints(panelPts, true);
    panel.lineStyle(5, INK, 1);
    panel.strokePoints(panelPts, true, true);

    // rejilla sutil de celdas
    const gridLines = this.add.graphics();
    gridLines.lineStyle(2, INK, 0.08);
    for (let c = 1; c < BOARD.cols; c++) {
      gridLines.lineBetween(
        BOARD_LEFT + c * BOARD.cell,
        BOARD_TOP,
        BOARD_LEFT + c * BOARD.cell,
        BOARD_TOP + BOARD.rows * BOARD.cell,
      );
    }
    for (let r = 1; r < BOARD.rows; r++) {
      gridLines.lineBetween(
        BOARD_LEFT,
        BOARD_TOP + r * BOARD.cell,
        BOARD_LEFT + BOARD.cols * BOARD.cell,
        BOARD_TOP + r * BOARD.cell,
      );
    }

    this.glowRect = this.add
      .rectangle(CX, BOARD_CENTER_Y, 1040, 880, YELLOW, 1)
      .setAlpha(0);

    this.board = new BoardView(this, ORIGIN_X, ORIGIN_Y, {
      pop: (x, y) => this.puff.explode(8, x, y),
      columnStop: (col, x, y) => {
        sfx.reelStop(col % 3);
        this.cameras.main.shake(55, 0.0022);
        this.puff.explode(8, x, y);
      },
    });
    // margen extra para que los símbolos que sobresalen (picota) no se recorten
    const maskShape = this.add.graphics().setVisible(false);
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(
      BOARD_LEFT - 16,
      BOARD_TOP - 16,
      BOARD.cols * BOARD.cell + 32,
      BOARD.rows * BOARD.cell + 32,
    );
    this.board.applyMask(maskShape.createGeometryMask());

    this.nextMarker = this.add
      .text(0, BOARD_TOP - 24, '▼', bodyStyle(30, HEX.yellow))
      .setOrigin(0.5)
      .setVisible(false);
    this.tweens.add({
      targets: this.nextMarker,
      alpha: 0.35,
      y: BOARD_TOP - 16,
      duration: 420,
      yoyo: true,
      repeat: -1,
    });

    this.comboText = this.add.text(CX, 962, '', monoStyle(21, HEX.grey500)).setOrigin(0.5);
    this.headline = this.add
      .text(CX, 994, '', displayCleanStyle(30, HEX.paper))
      .setOrigin(0.5);
    this.prizeBanner = this.add.text(CX, 1040, '', displayStyle(46, HEX.paper)).setOrigin(0.5);
    this.hintText = this.add.text(CX, HINT_Y, '', bodyStyle(21, HEX.grey500)).setOrigin(0.5);
    this.hintText.setLetterSpacing(2);
  }

  private buildParticles(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('dot', 16, 16);
    g.destroy();

    this.confetti = this.add
      .particles(0, 0, 'dot', {
        speed: { min: 320, max: 640 },
        angle: { min: 240, max: 300 },
        gravityY: 950,
        lifespan: { min: 900, max: 1500 },
        scale: { start: 1.1, end: 0.18 },
        tint: [YELLOW, RED, PAPER, RED_BRIGHT],
        emitting: false,
      })
      .setDepth(35);

    this.puff = this.add
      .particles(0, 0, 'dot', {
        speed: { min: 60, max: 190 },
        lifespan: 330,
        scale: { start: 0.7, end: 0 },
        alpha: { start: 0.85, end: 0 },
        tint: PAPER,
        emitting: false,
      })
      .setDepth(8);
  }

  private handleAction(): void {
    sfx.unlock();
    this.lastActivity = this.time.now;
    if (this.stateName === 'ready') {
      this.startSpin();
    } else if (this.stateName === 'spinning') {
      if (this.time.now - this.spinStartAt < BOARD.minSpinMs) return;
      const c = this.board.firstSpinning();
      if (c >= 0) {
        sfx.press();
        this.stopColumn(c);
      }
    } else if (this.stateName === 'mashing') {
      this.mashPress();
    } else if (this.stateName === 'result') {
      this.toReady();
    }
  }

  private toReady(): void {
    this.stateName = 'ready';
    this.headline.setText('');
    this.prizeBanner.setText('');
    this.comboText.setText('');
    this.hintText.setText('PULSA EL BOTÓN PARA TIRAR').setColor(HEX.grey500);
    this.lastActivity = this.time.now;
  }

  // ── Tirada normal ──────────────────────────────────────────────────────────

  private startSpin(): void {
    this.stateName = 'spinning';
    this.cascade = null;
    sfx.press();

    const kind = this.director.rollSpin();
    this.eventKind = kind;
    let grid = randomGrid();
    if (kind !== 'normal') {
      grid = injectStars(grid, kind);
      this.eventTier =
        kind === 'super' ? 'gordo' : chance(SCATTER.scatterGordoChance) ? 'gordo' : 'medio';
    } else {
      this.eventTier = null;
    }
    if (this.forceBonus) {
      grid[0][0] = 'picota';
      grid[2][1] = 'picota';
      grid[4][2] = 'picota';
    }
    this.finalGrid = grid;

    this.counterText.setText(`TIRADA #${this.director.spins}`);
    this.updateHeat();
    this.headline.setText('');
    this.prizeBanner.setText('');
    this.comboText.setText('');
    this.hintText.setText('PULSA PARA FRENAR CADA COLUMNA').setColor(HEX.grey300);

    const begin = () => {
      sfx.spinStart();
      this.board.startSpin();
      this.spinStartAt = this.time.now;
      this.updateNextMarker();
    };

    if (kind === 'normal') begin();
    else this.scatterIntro(kind, begin);
  }

  private scatterIntro(kind: SpinKind, then: () => void): void {
    const isSuper = kind === 'super';
    sfx.scatterSting(isSuper);
    this.cameras.main.flash(240, 245, isSuper ? 46 : 197, isSuper ? 34 : 24);

    const txt = this.add
      .text(CX, BOARD_CENTER_Y, isSuper ? '✶ ¡SÚPER SCATTER! ✶' : '★ ¡SCATTER! ★', {
        ...displayStyle(78, isSuper ? HEX.redBright : HEX.yellow),
        stroke: HEX.ink,
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setDepth(22)
      .setScale(0.2);
    this.tweens.add({ targets: txt, scale: 1, duration: 280, ease: 'Back.easeOut' });

    this.glowRect.setFillStyle(isSuper ? RED_BRIGHT : YELLOW, 1);
    this.glowPulse?.stop();
    this.glowPulse = this.tweens.add({
      targets: this.glowRect,
      alpha: { from: 0.1, to: 0.26 },
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

  private stopColumn(c: number): void {
    if (this.stateName !== 'spinning') return;
    if (!this.board.isSpinning(c)) return;
    this.board.stopColumn(c, this.finalGrid[c], () => this.onColumnStopped());
    this.updateNextMarker();
  }

  private onColumnStopped(): void {
    if (this.board.anySpinning) return;
    this.nextMarker.setVisible(false);
    this.stateName = 'resolving';
    this.hintText.setText('');
    this.time.delayedCall(330, () => this.runCascades());
  }

  private updateNextMarker(): void {
    const c = this.board.firstSpinning();
    if (c >= 0 && !this.inFree) {
      this.nextMarker.setVisible(true).setX(this.board.x(c));
    } else {
      this.nextMarker.setVisible(false);
    }
  }

  // ── Cascadas ───────────────────────────────────────────────────────────────

  private runCascades(): void {
    this.cascade = resolveCascades(this.finalGrid);
    this.runStep(0);
  }

  private runStep(i: number): void {
    const cascade = this.cascade!;
    if (i >= cascade.steps.length) {
      this.onCascadesDone();
      return;
    }
    const step = cascade.steps[i];
    sfx.pop(i);
    if (i >= 1) {
      this.comboText.setText(`CADENA x${i + 1}`).setColor(HEX.yellow);
      this.cameras.main.shake(90, 0.003);
    }
    if (step.cleared.length >= 8) this.cameras.main.shake(110, 0.004);
    this.board.applyStep(step, () => this.runStep(i + 1));
  }

  private onCascadesDone(): void {
    const total = this.cascade?.totalCleared ?? 0;
    let tier = tierForCleared(total);
    if (this.eventTier) tier = maxTier(tier, this.eventTier);

    if (this.inFree) {
      this.freeSpinResolved(tier);
      return;
    }
    if (triggersFreeSpins(this.finalGrid)) {
      this.startFreeSpins(tier);
      return;
    }
    this.finishPlay(tier);
  }

  // ── Tiradas gratis ─────────────────────────────────────────────────────────

  private startFreeSpins(baseTier: PrizeTier): void {
    this.inFree = true;
    this.freeLeft = FREE_SPINS.count;
    this.freeBest = baseTier;
    this.eventKind = 'normal';
    this.eventTier = null;

    sfx.scatterSting(true);
    this.cameras.main.flash(260, 255, 46, 34);
    const txt = this.add
      .text(CX, BOARD_CENTER_Y, `¡${FREE_SPINS.count} TIRADAS GRATIS!`, {
        ...displayStyle(82, HEX.redBright),
        stroke: HEX.ink,
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setDepth(22)
      .setScale(0.2);
    this.tweens.add({ targets: txt, scale: 1, duration: 300, ease: 'Back.easeOut' });

    this.glowRect.setFillStyle(RED_BRIGHT, 1);
    this.glowPulse?.stop();
    this.glowPulse = this.tweens.add({
      targets: this.glowRect,
      alpha: { from: 0.08, to: 0.22 },
      duration: 420,
      yoyo: true,
      repeat: -1,
    });

    this.headline.setText('★ TIRADAS GRATIS ★').setColor(HEX.redBright);
    this.updateFreeStatus();

    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: txt,
        alpha: 0,
        scale: 1.3,
        duration: 220,
        onComplete: () => txt.destroy(),
      });
      this.nextFreeSpin();
    });
  }

  private updateFreeStatus(): void {
    const best = this.freeBest === 'nada' ? '—' : prizeLabel(this.freeBest);
    this.comboText
      .setText(`QUEDAN ${this.freeLeft} · MEJOR PREMIO: ${best}`)
      .setColor(HEX.grey300);
  }

  private nextFreeSpin(): void {
    if (this.freeLeft <= 0) {
      this.endFreeSpins();
      return;
    }
    this.freeLeft--;
    this.stateName = 'spinning';
    this.cascade = null;
    this.finalGrid = randomGrid();
    this.spinStartAt = this.time.now;
    this.lastActivity = this.time.now;
    this.updateFreeStatus();

    sfx.spinStart();
    this.board.startSpin();
    // automáticas y rápidas: el jugador puede adelantarlas pulsando
    for (let c = 0; c < BOARD.cols; c++) {
      this.time.delayedCall(FREE_SPINS.autoStopBase + c * FREE_SPINS.autoStopStagger, () =>
        this.stopColumn(c),
      );
    }
  }

  private freeSpinResolved(tier: PrizeTier): void {
    if (tier !== 'nada') {
      sfx.pop(3);
      const better = maxTier(this.freeBest, tier) !== this.freeBest;
      this.freeBest = maxTier(this.freeBest, tier);
      if (better) {
        this.prizeBanner
          .setText(prizeLabel(this.freeBest))
          .setColor(TIER_COLORS[this.freeBest])
          .setScale(0.3);
        this.tweens.add({ targets: this.prizeBanner, scale: 1, duration: 200, ease: 'Back.easeOut' });
        this.confetti.explode(30, CX, 300);
      }
    }
    this.updateFreeStatus();
    this.time.delayedCall(FREE_SPINS.betweenSpinsMs, () => this.nextFreeSpin());
  }

  private endFreeSpins(): void {
    this.inFree = false;
    this.glowPulse?.stop();
    this.glowPulse = null;
    this.glowRect.setAlpha(0);
    this.finishPlay(this.freeBest, ' TRAS 15 TIRADAS GRATIS');
  }

  // ── Smash Final ────────────────────────────────────────────────────────────

  private finishPlay(tier: PrizeTier, contextSuffix = ''): void {
    this.mashPlan = planMash(tier);
    if (this.mashPlan) {
      this.enterMash(this.mashPlan);
      return;
    }
    this.showFinal(tier, undefined, contextSuffix);
  }

  private enterMash(plan: MashPlan): void {
    this.stateName = 'mashing';
    this.mashPresses = 0;
    sfx.smashCue();
    this.cameras.main.flash(160, 245, 197, 24);

    const dim = this.add.rectangle(CX, 540, GAME_WIDTH, 1080, INK, 0.78).setDepth(30);
    const title = this.add
      .text(CX, 210, '¡SMÁSHEALA!', {
        ...displayStyle(96, HEX.yellow),
        stroke: HEX.red,
        strokeThickness: 14,
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setScale(0.2)
      .setAngle(-3);
    this.tweens.add({ targets: title, scale: 1, duration: 200, ease: 'Back.easeOut' });

    const note = this.add
      .text(
        CX,
        320,
        `TIENES ${prizeLabel(plan.shownTier)} · MACHACA EL BOTÓN PARA SUBIRLO`,
        bodyStyle(26, HEX.paper),
      )
      .setOrigin(0.5)
      .setDepth(31);
    note.setLetterSpacing(2);

    const burger = this.add.image(CX, 580, 'burger').setScale(1.45).setDepth(31);

    const meterBox = this.add
      .rectangle(CX, 880, 564, 56, PAPER)
      .setStrokeStyle(4, INK)
      .setDepth(31);
    const meterFill = this.add
      .rectangle(CX - 278, 880, 556, 44, RED)
      .setOrigin(0, 0.5)
      .setScale(0, 1)
      .setDepth(31);

    const timerBar = this.add
      .rectangle(CX, 932, 564, 10, YELLOW)
      .setDepth(31);
    const timerTween = this.tweens.add({
      targets: timerBar,
      scaleX: 0,
      duration: SMASH_FINAL.windowMs,
      ease: 'Linear',
      onComplete: () => this.resolveMash(false),
    });

    this.mashBits = { dim, title, note, burger, meterBox, meterFill, timerBar, timerTween };
  }

  private mashPress(): void {
    const bits = this.mashBits;
    if (!bits) return;
    this.mashPresses++;
    sfx.reelStop(1);
    this.cameras.main.shake(60, 0.004);

    const t = Math.min(this.mashPresses / SMASH_FINAL.presses, 1);
    bits.burger.setScale(1.45 * (1 + 0.3 * t), 1.45 * (1 - 0.5 * t));
    bits.meterFill.setScale(t, 1);
    this.puff.explode(8, bits.burger.x, bits.burger.y + 80);

    if (this.mashPresses >= SMASH_FINAL.presses) this.resolveMash(true);
  }

  private resolveMash(success: boolean): void {
    const bits = this.mashBits;
    const plan = this.mashPlan;
    if (!bits || !plan) return;
    this.mashBits = null;
    this.mashPlan = null;
    bits.timerTween.stop();

    if (success) {
      sfx.smashHit();
      this.cameras.main.flash(200, 245, 197, 24);
      this.cameras.main.shake(200, 0.006);
      this.confetti.explode(90, CX, 560);
      this.tweens.add({
        targets: bits.burger,
        scaleX: 1.45 * 1.45,
        scaleY: 1.45 * 0.16,
        duration: 150,
        ease: 'Back.easeIn',
      });
    } else {
      sfx.smashMiss();
      bits.note.setText('SE ESCAPÓ… OTRA VEZ SERÁ').setColor(HEX.grey500);
    }

    this.time.delayedCall(success ? 700 : 900, () => {
      Object.values(bits).forEach((obj) => {
        if (obj instanceof Phaser.GameObjects.GameObject) obj.destroy();
      });
      this.showFinal(
        success ? plan.realTier : plan.shownTier,
        success ? '¡SMASHEADA!' : 'CASI…',
      );
    });
  }

  // ── Resultado final ────────────────────────────────────────────────────────

  private showFinal(tier: PrizeTier, headlineOverride?: string, contextSuffix = ''): void {
    this.stateName = 'result';
    const total = this.cascade?.totalCleared ?? 0;
    const chains = this.cascade?.steps.length ?? 0;

    this.glowPulse?.stop();
    this.glowPulse = null;
    this.glowRect.setAlpha(0);

    const headline =
      headlineOverride ??
      (this.eventKind === 'super'
        ? '✶ SÚPER SCATTER ✶'
        : this.eventKind === 'scatter'
          ? '★ SCATTER ★'
          : tier !== 'nada'
            ? '¡PREMIO!'
            : total > 0
              ? '¡CASI!'
              : '');

    this.headline
      .setText(headline + (tier !== 'nada' ? contextSuffix : ''))
      .setColor(
        this.eventKind === 'super'
          ? HEX.redBright
          : this.eventKind === 'scatter'
            ? HEX.yellow
            : HEX.paper,
      );
    this.comboText.setText(
      contextSuffix
        ? ''
        : total > 0
          ? `${total} PIEZAS${chains > 1 ? ` · CADENA x${chains}` : ''}`
          : '',
    );
    this.prizeBanner.setText(prizeLabel(tier)).setColor(TIER_COLORS[tier]).setScale(0.2);
    this.tweens.add({ targets: this.prizeBanner, scale: 1, duration: 240, ease: 'Back.easeOut' });

    sfx.win(tier);
    if (tier === 'pequeno') {
      this.confetti.explode(30, CX, 300);
    } else if (tier === 'medio') {
      this.confetti.explode(80, CX, 280);
      this.cameras.main.shake(150, 0.004);
      this.cameras.main.flash(130, 245, 197, 24);
    } else if (tier === 'gordo') {
      this.confetti.explode(180, CX, 260);
      this.time.delayedCall(320, () => this.confetti.explode(120, CX, 230));
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
    this.board.update(dtMs);
    if (this.board.anySpinning) {
      this.tickAccum += dtMs;
      if (this.tickAccum > 85) {
        this.tickAccum = 0;
        sfx.tick();
      }
    }
    // sin auto-stop, un giro abandonado a medias también debe volver al
    // attract (las tiradas gratis y el smash se resuelven solos)
    if (
      (this.stateName === 'ready' || (this.stateName === 'spinning' && !this.inFree)) &&
      this.time.now - this.lastActivity > IDLE_TO_ATTRACT_MS
    ) {
      this.scene.start('attract');
    }
  }
}
