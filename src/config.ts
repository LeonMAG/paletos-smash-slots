// Parámetros de juego v0.2. Todo lo calibrable vive aquí para poder ajustar
// mecánicas, premios y tiempos sin tocar la lógica de las escenas.

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// ── Rodillos ────────────────────────────────────────────────────────────────
export const REELS = {
  count: 3,
  symbolH: 150,
  width: 200,
  spacing: 215,
  // velocidad de scroll en px/s durante el giro
  speed: 2400,
  // el rodillo i se detiene en stopBase + i * stopStagger (ms desde el inicio)
  stopBase: 1500,
  stopStagger: 480,
  // retardo extra del tercer rodillo cuando hay tensión (dos símbolos iguales)
  anticipationExtra: 1000,
};

// ── Mecánica de reacción "¡SMASH!" ──────────────────────────────────────────
// La señal salta antes de que pare el primer rodillo (maxDelay + windowMs
// debe ser menor que REELS.stopBase para que el resultado se decida a tiempo).
export const SMASH = {
  chance: 0.15,
  windowMs: 350,
  minDelay: 450,
  maxDelay: 1050,
};

// ── Scatter / súper scatter ─────────────────────────────────────────────────
// Pity timer: se sortea el próximo evento en [minInterval, maxInterval]
// tiradas (media ≈ 50). Al disparar, superChance decide si es súper scatter.
export const SCATTER = {
  minInterval: 38,
  maxInterval: 62,
  superChance: 0.2,
  // probabilidad de que un scatter normal dé el premio gordo (si no, medio)
  scatterGordoChance: 0.15,
};

// ── Símbolos ────────────────────────────────────────────────────────────────
// El id es también la clave de textura (SVG cargado en BootScene).
export type SymbolTier = 'low' | 'mid' | 'top' | 'scatter' | 'super';

export interface SymbolDef {
  id: string;
  tier: SymbolTier;
}

export const SYMBOLS: SymbolDef[] = [
  { id: 'burger', tier: 'top' },
  { id: 'beer', tier: 'mid' },
  { id: 'fries', tier: 'mid' },
  { id: 'soda', tier: 'low' },
  { id: 'cheese', tier: 'low' },
  { id: 'bacon', tier: 'low' },
  { id: 'chili', tier: 'low' },
  { id: 'scatter', tier: 'scatter' },
  { id: 'super', tier: 'super' },
];

export const TOP_SYMBOL = SYMBOLS.find((s) => s.tier === 'top')!;
export const MID_SYMBOLS = SYMBOLS.filter((s) => s.tier === 'mid');
export const LOW_SYMBOLS = SYMBOLS.filter((s) => s.tier === 'low');
export const SCATTER_SYMBOL = SYMBOLS.find((s) => s.tier === 'scatter')!;
export const SUPER_SYMBOL = SYMBOLS.find((s) => s.tier === 'super')!;

// Relleno visual de los rodillos (filas no premiadas): solo comida, los
// símbolos especiales únicamente aparecen cuando toca evento.
export const FILLER_KEYS = SYMBOLS.filter(
  (s) => s.tier === 'low' || s.tier === 'mid' || s.tier === 'top',
).map((s) => s.id);

// ── Premios: TABLA DE PROBABILIDADES v1 ─────────────────────────────────────
// Diseño previo de la economía (etiquetas placeholder; premios reales y ajuste
// final con negocio). La probabilidad EFECTIVA incluye el efecto del ¡SMASH!
// (15 % de tiradas, ~50 % de acierto esperado → ~7,5 % de mejoras de nivel)
// y de los eventos scatter (1 de cada ~50 tiradas). Validada por simulación
// en src/core/economy.test.ts.
//
//   nivel    peso base   efectiva aprox.   frecuencia
//   nada       92,0 %       ~83 %          —
//   pequeño     5,0 %       ~11 %          1 de cada ~9
//   medio       2,2 %        ~4 %          1 de cada ~25
//   gordo       0,8 %       ~1,6 %         1 de cada ~60 (mayoría vía scatter/súper)
//   PREMIO (cualquiera)     ~17 %          1 de cada ~6
export type PrizeTier = 'nada' | 'pequeno' | 'medio' | 'gordo';

export const TIER_LADDER: PrizeTier[] = ['nada', 'pequeno', 'medio', 'gordo'];

export interface PrizeDef {
  tier: PrizeTier;
  label: string;
  weight: number;
}

export const PRIZE_TABLE: PrizeDef[] = [
  { tier: 'nada', label: 'SIGUE INTENTÁNDOLO', weight: 920 },
  { tier: 'pequeno', label: 'TOPPING GRATIS', weight: 50 },
  { tier: 'medio', label: 'BEBIDA O PATATAS GRATIS', weight: 22 },
  { tier: 'gordo', label: '¡BURGER GRATIS!', weight: 8 },
];

export function prizeLabel(tier: PrizeTier): string {
  return PRIZE_TABLE.find((p) => p.tier === tier)!.label;
}

// ── Ritmo de pantallas ──────────────────────────────────────────────────────
// Tiempo en RESULT antes de volver solo a READY, por nivel de premio
export const RESULT_HOLD_MS: Record<PrizeTier, number> = {
  nada: 2600,
  pequeno: 4200,
  medio: 4800,
  gordo: 6500,
};

export const IDLE_TO_ATTRACT_MS = 45000;

// El aviso de "bonus cerca" se enciende cuando faltan estas tiradas o menos
export const HEAT_THRESHOLD = 12;
