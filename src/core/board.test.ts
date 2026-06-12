import { describe, expect, it } from 'vitest';
import { BOARD, FILLER_KEYS, SCATTER } from '../config';
import { findClusters, Grid, injectStars, randomGrid, resolveCascades } from './board';

// Tablero base sin ningún cluster accidental: ciclo de 7 símbolos en orden
// column-major (vecinos verticales consecutivos, horizontales a +5 mod 7).
function cleanGrid(): Grid {
  return Array.from({ length: BOARD.cols }, (_, c) =>
    Array.from({ length: BOARD.rows }, (_, r) => FILLER_KEYS[(c * BOARD.rows + r) % 7]),
  );
}

describe('findClusters', () => {
  it('el tablero base no tiene clusters', () => {
    expect(findClusters(cleanGrid())).toHaveLength(0);
  });

  it('detecta una L de 4 (sin línea recta)', () => {
    const g = cleanGrid();
    g[0][0] = 'burger';
    g[0][1] = 'burger';
    g[1][1] = 'burger';
    g[1][2] = 'burger';
    const clusters = findClusters(g);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(4);
  });

  it('detecta una T de 5', () => {
    const g = cleanGrid();
    g[1][0] = 'beer';
    g[2][0] = 'beer';
    g[3][0] = 'beer';
    g[2][1] = 'beer';
    g[2][2] = 'beer';
    const clusters = findClusters(g);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(5);
  });

  it('tres en raya NO es cluster (mínimo 4)', () => {
    const g = cleanGrid();
    g[0][0] = 'fries';
    g[1][0] = 'fries';
    g[2][0] = 'fries';
    expect(findClusters(g)).toHaveLength(0);
  });
});

describe('resolveCascades', () => {
  it('limpia el cluster, aplica gravedad y rellena la columna', () => {
    const g = cleanGrid();
    g[0][2] = 'chili';
    g[0][3] = 'chili';
    g[1][2] = 'chili';
    g[1][3] = 'chili';
    const { steps, totalCleared } = resolveCascades(g);
    expect(totalCleared).toBeGreaterThanOrEqual(4);
    const first = steps[0];
    expect(first.cleared.length).toBeGreaterThanOrEqual(4);
    // las columnas afectadas reciben tantos spawns como piezas perdieron
    const spawnsCol0 = first.spawns.filter((s) => s.col === 0).length;
    const clearedCol0 = first.cleared.filter((c) => c.col === 0).length;
    expect(spawnsCol0).toBe(clearedCol0);
    // todas las rejillas intermedias quedan completas
    for (const step of steps) {
      for (const col of step.grid) {
        expect(col).toHaveLength(BOARD.rows);
        col.forEach((id) => expect(typeof id).toBe('string'));
      }
    }
  });

  it('termina siempre dentro del tope de cascadas', () => {
    for (let i = 0; i < 300; i++) {
      const { steps } = resolveCascades(randomGrid());
      expect(steps.length).toBeLessThanOrEqual(BOARD.maxCascades);
    }
  });
});

describe('injectStars', () => {
  it('coloca un grupo conexo de estrellas del tamaño configurado', () => {
    for (let i = 0; i < 100; i++) {
      const g = injectStars(cleanGrid(), 'scatter');
      const stars = g.flat().filter((id) => id === 'scatter').length;
      expect(stars).toBe(SCATTER.starsScatter);
      const cluster = findClusters(g, SCATTER.starsScatter).find(
        (group) => g[group[0].col][group[0].row] === 'scatter',
      );
      expect(cluster).toBeDefined();
    }
  });
});
