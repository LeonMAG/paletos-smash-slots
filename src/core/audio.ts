import type { PrizeTier } from '../config';

// Sonido placeholder sintetizado con WebAudio: cero assets, suficiente para
// que el playtest tenga feedback. El audio definitivo llegará con el arte.
type Wave = OscillatorType;

class Sfx {
  private ctx: AudioContext | null = null;

  // Debe llamarse desde un gesto del usuario para desbloquear el AudioContext
  unlock(): void {
    this.ensure();
  }

  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(
    freq: number,
    durMs: number,
    { type = 'square' as Wave, gain = 0.06, delayMs = 0, slideTo = 0 } = {},
  ): void {
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + delayMs / 1000;
      const dur = durMs / 1000;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // sin audio no se rompe el juego
    }
  }

  press(): void {
    this.tone(660, 50, { type: 'triangle', gain: 0.05 });
  }

  spinStart(): void {
    this.tone(180, 220, { type: 'sawtooth', gain: 0.05, slideTo: 420 });
  }

  tick(): void {
    this.tone(950, 24, { type: 'square', gain: 0.018 });
  }

  reelStop(index: number): void {
    this.tone(170 + index * 40, 80, { type: 'square', gain: 0.08 });
  }

  smashCue(): void {
    this.tone(320, 300, { type: 'sawtooth', gain: 0.09, slideTo: 1200 });
  }

  smashHit(): void {
    this.tone(523, 180, { gain: 0.09 });
    this.tone(659, 180, { gain: 0.08, delayMs: 30 });
    this.tone(784, 260, { gain: 0.08, delayMs: 60 });
  }

  smashMiss(): void {
    this.tone(130, 200, { type: 'sawtooth', gain: 0.06, slideTo: 70 });
  }

  scatterSting(isSuper: boolean): void {
    const base = isSuper ? 392 : 330;
    [0, 90, 180, 270].forEach((delayMs, i) => {
      this.tone(base * Math.pow(1.26, i), 160, { type: 'triangle', gain: 0.08, delayMs });
    });
  }

  win(tier: PrizeTier): void {
    if (tier === 'nada') {
      this.tone(200, 160, { type: 'triangle', gain: 0.04, slideTo: 150 });
      return;
    }
    const notes: Record<Exclude<PrizeTier, 'nada'>, number[]> = {
      pequeno: [523, 659, 784],
      medio: [523, 659, 784, 1047, 1319],
      gordo: [523, 659, 784, 1047, 784, 1047, 1319, 1568],
    };
    notes[tier].forEach((freq, i) => {
      this.tone(freq, 150, { type: 'triangle', gain: 0.09, delayMs: i * 95 });
    });
  }
}

export const sfx = new Sfx();
