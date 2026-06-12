import { describe, expect, it } from 'vitest';
import { PrizeTier } from '../config';
import { chance } from './rng';
import { KVStore, ScatterDirector } from './scatterDirector';
import { computeSpin } from './slotEngine';

function memStore(): KVStore {
  const m = new Map<string, string>();
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => {
      m.set(k, v);
    },
  };
}

// Simula el pipeline completo (pity timer + tirada + smash) y comprueba que
// la economía EFECTIVA queda en las bandas diseñadas en la tabla v1.
describe('economía de premios (tabla v1)', () => {
  it('las probabilidades efectivas quedan en las bandas diseñadas', () => {
    const director = new ScatterDirector(memStore());
    const N = 60000;
    // tasa de acierto del ¡SMASH! asumida para el diseño (a medir en playtest)
    const SMASH_HIT_RATE = 0.5;

    const tally: Record<PrizeTier, number> = { nada: 0, pequeno: 0, medio: 0, gordo: 0 };
    for (let i = 0; i < N; i++) {
      const kind = director.rollSpin();
      const o = computeSpin(kind);
      const tier = o.smash && chance(SMASH_HIT_RATE) ? o.upgradedTier : o.baseTier;
      tally[tier]++;
    }

    const rate = (t: PrizeTier) => tally[t] / N;
    const anyPrize = 1 - rate('nada');

    // premio (cualquiera): ~17 % → 1 de cada ~6 tiradas
    expect(anyPrize).toBeGreaterThan(0.12);
    expect(anyPrize).toBeLessThan(0.21);

    // pequeño ~11 %
    expect(rate('pequeno')).toBeGreaterThan(0.08);
    expect(rate('pequeno')).toBeLessThan(0.16);

    // medio ~4 %
    expect(rate('medio')).toBeGreaterThan(0.018);
    expect(rate('medio')).toBeLessThan(0.055);

    // gordo ~1,6 % → 1 de cada ~60 (la mayoría vía scatter/súper scatter)
    expect(rate('gordo')).toBeGreaterThan(0.008);
    expect(rate('gordo')).toBeLessThan(0.024);
  });
});
