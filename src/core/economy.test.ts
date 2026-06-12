import { describe, expect, it } from 'vitest';
import { PrizeTier, SCATTER, maxTier } from '../config';
import { injectStars, randomGrid, resolveCascades, tierForCleared } from './board';
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

// Simula el pipeline completo (pity timer + tablero + cascadas + eventos) y
// comprueba que la economía EFECTIVA respeta la tabla de premios. Si se
// tocan SYMBOL_WEIGHTS, el tablero o los umbrales, este test vigila.
describe('economía de premios (tablero de cascadas)', () => {
  it('las probabilidades efectivas quedan en las bandas diseñadas', () => {
    const director = new ScatterDirector(memStore());
    const N = 20000;

    const tally: Record<PrizeTier, number> = { nada: 0, pequeno: 0, medio: 0, gordo: 0 };
    for (let i = 0; i < N; i++) {
      const kind = director.rollSpin();
      let grid = randomGrid();
      let eventTier: PrizeTier | null = null;
      if (kind !== 'normal') {
        grid = injectStars(grid, kind);
        eventTier =
          kind === 'super' ? 'gordo' : chance(SCATTER.scatterGordoChance) ? 'gordo' : 'medio';
      }
      const { totalCleared } = resolveCascades(grid);
      let tier = tierForCleared(totalCleared);
      if (eventTier) tier = maxTier(tier, eventTier);
      tally[tier]++;
    }

    const rate = (t: PrizeTier) => tally[t] / N;
    const anyPrize = 1 - rate('nada');

    // premio (cualquiera): ~1 de cada 6 tiradas
    expect(anyPrize).toBeGreaterThan(0.12);
    expect(anyPrize).toBeLessThan(0.22);

    // pequeño ~14 %
    expect(rate('pequeno')).toBeGreaterThan(0.08);
    expect(rate('pequeno')).toBeLessThan(0.17);

    // medio ~3 %
    expect(rate('medio')).toBeGreaterThan(0.018);
    expect(rate('medio')).toBeLessThan(0.055);

    // gordo ~1,4 % → 1 de cada ~70 (la mayoría vía scatter/súper scatter)
    expect(rate('gordo')).toBeGreaterThan(0.008);
    expect(rate('gordo')).toBeLessThan(0.024);
  });
});
