import { describe, expect, it } from 'vitest';
import { FREE_SPINS, maxTier, PrizeTier, SCATTER } from '../config';
import {
  injectStars,
  planMash,
  randomGrid,
  resolveCascades,
  tierForCleared,
  triggersFreeSpins,
} from './board';
import { chance } from './rng';
import { KVStore, ScatterDirector } from './scatterDirector';

function memStore(): KVStore {
  const m = new Map<string, string>();
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => {
      m.set(k, v);
    },
  };
}

// tasa de éxito del Smash Final asumida para el diseño (jugador que lo
// intenta en serio; medir en playtest)
const MASH_SUCCESS = 0.85;

// Simula el pipeline COMPLETO de una jugada: pity timer + tablero + cascadas
// + eventos + tiradas gratis (mejor de 15) + Smash Final. Vigila que la
// economía efectiva respete la tabla de premios.
describe('economía de premios (tablero + tiradas gratis + smash final)', () => {
  it('las probabilidades efectivas quedan en las bandas diseñadas', () => {
    const director = new ScatterDirector(memStore());
    const N = 20000;

    const tally: Record<PrizeTier, number> = { nada: 0, pequeno: 0, medio: 0, gordo: 0 };
    let freeSpinTriggers = 0;

    for (let i = 0; i < N; i++) {
      const kind = director.rollSpin();
      let grid = randomGrid();
      let eventTier: PrizeTier | null = null;
      if (kind !== 'normal') {
        grid = injectStars(grid, kind);
        eventTier =
          kind === 'super' ? 'gordo' : chance(SCATTER.scatterGordoChance) ? 'gordo' : 'medio';
      }
      let tier = tierForCleared(resolveCascades(grid).totalCleared);
      if (eventTier) tier = maxTier(tier, eventTier);

      if (triggersFreeSpins(grid)) {
        freeSpinTriggers++;
        for (let f = 0; f < FREE_SPINS.count; f++) {
          const freeTier = tierForCleared(resolveCascades(randomGrid()).totalCleared);
          tier = maxTier(tier, freeTier);
        }
      }

      const mash = planMash(tier);
      if (mash) tier = chance(MASH_SUCCESS) ? mash.realTier : mash.shownTier;

      tally[tier]++;
    }

    const rate = (t: PrizeTier) => tally[t] / N;
    const anyPrize = 1 - rate('nada');

    // las tiradas gratis saltan ~1 de cada 60-65 tiradas
    expect(freeSpinTriggers / N).toBeGreaterThan(0.008);
    expect(freeSpinTriggers / N).toBeLessThan(0.03);

    // premio (cualquiera): ~1 de cada 5-6 tiradas
    expect(anyPrize).toBeGreaterThan(0.12);
    expect(anyPrize).toBeLessThan(0.23);

    // pequeño ~14 %
    expect(rate('pequeno')).toBeGreaterThan(0.08);
    expect(rate('pequeno')).toBeLessThan(0.18);

    // medio ~4 %
    expect(rate('medio')).toBeGreaterThan(0.018);
    expect(rate('medio')).toBeLessThan(0.06);

    // gordo ~1,6 % → 1 de cada ~60-70
    expect(rate('gordo')).toBeGreaterThan(0.008);
    expect(rate('gordo')).toBeLessThan(0.025);
  });
});
