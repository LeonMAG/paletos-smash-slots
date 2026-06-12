import { describe, expect, it } from 'vitest';
import { SCATTER } from '../config';
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

describe('ScatterDirector', () => {
  it('dispara scatter o súper scatter cada ~50 tiradas, dentro de la horquilla', () => {
    const d = new ScatterDirector(memStore());
    const N = 10000;
    const gaps: number[] = [];
    let since = 0;
    let events = 0;
    let supers = 0;

    for (let i = 0; i < N; i++) {
      const kind = d.rollSpin();
      since++;
      if (kind !== 'normal') {
        gaps.push(since);
        since = 0;
        events++;
        if (kind === 'super') supers++;
      }
    }

    // cada intervalo individual respeta la horquilla configurada
    for (const g of gaps) {
      expect(g).toBeGreaterThanOrEqual(SCATTER.minInterval);
      expect(g).toBeLessThanOrEqual(SCATTER.maxInterval);
    }

    // la media queda alrededor de 50 tiradas
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    expect(mean).toBeGreaterThan(44);
    expect(mean).toBeLessThan(56);

    // y la proporción de súper scatters ronda superChance
    const ratio = supers / events;
    expect(ratio).toBeGreaterThan(0.07);
    expect(ratio).toBeLessThan(0.36);
  });

  it('persiste contador y pity timer entre sesiones', () => {
    const store = memStore();
    const d1 = new ScatterDirector(store);
    for (let i = 0; i < 7; i++) d1.rollSpin();

    const d2 = new ScatterDirector(store);
    expect(d2.spins).toBe(7);
  });
});
