import {
  BOARD,
  CLEARED_THRESHOLDS,
  FILLER_KEYS,
  FREE_SPINS,
  PrizeTier,
  SCATTER,
  SMASH_FINAL,
  SYMBOL_WEIGHTS,
  tierDown,
} from '../config';
import { chance, randInt, weightedPick } from './rng';

export type SpinKind = 'normal' | 'scatter' | 'super';

// grid[col][row]; row 0 es la fila de arriba
export type Grid = string[][];

export interface Cell {
  col: number;
  row: number;
}

const FILL_ENTRIES = FILLER_KEYS.map((id) => [id, SYMBOL_WEIGHTS[id] ?? 1] as const);

export function randomSymbol(): string {
  return weightedPick(FILL_ENTRIES);
}

export function randomGrid(): Grid {
  return Array.from({ length: BOARD.cols }, () =>
    Array.from({ length: BOARD.rows }, () => randomSymbol()),
  );
}

// Inyecta un grupo CONEXO de estrellas para los eventos scatter/súper: así el
// evento siempre explota como cluster, aunque las estrellas no salgan nunca
// en el relleno normal.
export function injectStars(grid: Grid, kind: Exclude<SpinKind, 'normal'>): Grid {
  const id = kind === 'super' ? 'super' : 'scatter';
  const size = kind === 'super' ? SCATTER.starsSuper : SCATTER.starsScatter;
  const g = grid.map((col) => [...col]);

  const placed: Cell[] = [];
  const seed: Cell = { col: randInt(1, BOARD.cols - 2), row: randInt(1, BOARD.rows - 2) };
  g[seed.col][seed.row] = id;
  placed.push(seed);

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  for (let attempts = 0; placed.length < size && attempts < 300; attempts++) {
    const base = placed[randInt(0, placed.length - 1)];
    const [dc, dr] = dirs[randInt(0, 3)];
    const col = base.col + dc;
    const row = base.row + dr;
    if (col < 0 || col >= BOARD.cols || row < 0 || row >= BOARD.rows) continue;
    if (g[col][row] === id) continue;
    g[col][row] = id;
    placed.push({ col, row });
  }
  return g;
}

// Grupos de ≥ min símbolos iguales adyacentes en ortogonal — cualquier forma
// (L, T, S…), no hace falta línea recta.
export function findClusters(grid: Grid, min = BOARD.minCluster): Cell[][] {
  const cols = grid.length;
  const rows = grid[0].length;
  const seen = Array.from({ length: cols }, () => new Array<boolean>(rows).fill(false));
  const clusters: Cell[][] = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (seen[c][r]) continue;
      const id = grid[c][r];
      const group: Cell[] = [];
      const queue: Cell[] = [{ col: c, row: r }];
      seen[c][r] = true;
      while (queue.length) {
        const cur = queue.pop()!;
        group.push(cur);
        for (const [dc, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nc = cur.col + dc;
          const nr = cur.row + dr;
          if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
          if (seen[nc][nr] || grid[nc][nr] !== id) continue;
          seen[nc][nr] = true;
          queue.push({ col: nc, row: nr });
        }
      }
      if (group.length >= min) clusters.push(group);
    }
  }
  return clusters;
}

export interface FallMove {
  col: number;
  fromRow: number;
  toRow: number;
  id: string;
}

export interface SpawnCell {
  col: number;
  row: number;
  id: string;
}

export interface CascadeStep {
  cleared: Cell[];
  falls: FallMove[];
  spawns: SpawnCell[];
  // estado del tablero al terminar el paso
  grid: Grid;
}

export interface CascadeResult {
  steps: CascadeStep[];
  totalCleared: number;
}

// Resuelve la tirada completa: explota clusters, aplica gravedad, rellena
// desde arriba y repite mientras se formen grupos nuevos (cascadas).
export function resolveCascades(grid: Grid): CascadeResult {
  let g = grid.map((col) => [...col]);
  const steps: CascadeStep[] = [];
  let totalCleared = 0;

  for (let guard = 0; guard < BOARD.maxCascades; guard++) {
    const clusters = findClusters(g);
    if (clusters.length === 0) break;

    const cleared = clusters.flat();
    totalCleared += cleared.length;
    const clearedSet = new Set(cleared.map((c) => `${c.col},${c.row}`));

    const next: Grid = g.map((col) => [...col]);
    const falls: FallMove[] = [];
    const spawns: SpawnCell[] = [];

    for (let c = 0; c < BOARD.cols; c++) {
      const keep: { id: string; fromRow: number }[] = [];
      for (let r = 0; r < BOARD.rows; r++) {
        if (!clearedSet.has(`${c},${r}`)) keep.push({ id: g[c][r], fromRow: r });
      }
      const missing = BOARD.rows - keep.length;
      for (let k = keep.length - 1; k >= 0; k--) {
        const toRow = missing + k;
        next[c][toRow] = keep[k].id;
        if (keep[k].fromRow !== toRow) {
          falls.push({ col: c, fromRow: keep[k].fromRow, toRow, id: keep[k].id });
        }
      }
      for (let r = 0; r < missing; r++) {
        const id = randomSymbol();
        next[c][r] = id;
        spawns.push({ col: c, row: r, id });
      }
    }

    g = next;
    steps.push({ cleared, falls, spawns, grid: g.map((col) => [...col]) });
  }

  return { steps, totalCleared };
}

export function tierForCleared(n: number): PrizeTier {
  if (n >= CLEARED_THRESHOLDS.gordo) return 'gordo';
  if (n >= CLEARED_THRESHOLDS.medio) return 'medio';
  if (n >= CLEARED_THRESHOLDS.pequeno) return 'pequeno';
  return 'nada';
}

// Picotas en al menos FREE_SPINS.minColumns columnas distintas → tiradas gratis
export function triggersFreeSpins(grid: Grid): boolean {
  let cols = 0;
  for (const col of grid) {
    if (col.includes('picota')) cols++;
  }
  return cols >= FREE_SPINS.minColumns;
}

export interface MashPlan {
  // lo que se enseña al jugador antes de machacar (un nivel por debajo)
  shownTier: PrizeTier;
  // lo realmente sorteado, que se "gana" al completar el smash
  realTier: PrizeTier;
}

// El Smash Final solo se ofrece cuando hay nivel inferior que enseñar: el
// premio real ya está decidido, machacar solo lo revela (fallar lo deja en
// el nivel mostrado — la economía nunca se infla).
export function planMash(tier: PrizeTier): MashPlan | null {
  if (tier !== 'medio' && tier !== 'gordo') return null;
  if (!chance(SMASH_FINAL.chance)) return null;
  return { shownTier: tierDown(tier), realTier: tier };
}
