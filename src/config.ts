// Parámetros de juego v0.1. Todo lo calibrable vive aquí para poder ajustar
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
  chance: 0.38,
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
  scatterGordoChance: 0.3,
};

// ── Símbolos ────────────────────────────────────────────────────────────────
export type SymbolTier = 'low' | 'mid' | 'top' | 'scatter' | 'super';

export interface SymbolDef {
  id: string;
  char: string;
  tier: SymbolTier;
}

export const SYMBOLS: SymbolDef[] = [
  { id: 'burger', char: '🍔', tier: 'top' },
  { id: 'beer', char: '🍺', tier: 'mid' },
  { id: 'fries', char: '🍟', tier: 'mid' },
  { id: 'soda', char: '🥤', tier: 'low' },
  { id: 'cheese', char: '🧀', tier: 'low' },
  { id: 'bacon', char: '🥓', tier: 'low' },
  { id: 'chili', char: '🌶️', tier: 'low' },
  { id: 'scatter', char: '⭐', tier: 'scatter' },
  { id: 'super', char: '🔥', tier: 'super' },
];

export const TOP_SYMBOL = SYMBOLS.find((s) => s.tier === 'top')!;
export const MID_SYMBOLS = SYMBOLS.filter((s) => s.tier === 'mid');
export const LOW_SYMBOLS = SYMBOLS.filter((s) => s.tier === 'low');
export const SCATTER_SYMBOL = SYMBOLS.find((s) => s.tier === 'scatter')!;
export const SUPER_SYMBOL = SYMBOLS.find((s) => s.tier === 'super')!;

// Relleno visual de los rodillos (filas no premiadas): solo comida, los
// símbolos especiales únicamente aparecen cuando toca evento.
export const FILLER_CHARS = SYMBOLS.filter(
  (s) => s.tier === 'low' || s.tier === 'mid' || s.tier === 'top',
).map((s) => s.char);

// ── Premios ─────────────────────────────────────────────────────────────────
// Etiquetas placeholder: los premios reales y sus probabilidades definitivas
// se cierran con negocio en el GDD.
export type PrizeTier = 'nada' | 'pequeno' | 'medio' | 'gordo';

export const TIER_LADDER: PrizeTier[] = ['nada', 'pequeno', 'medio', 'gordo'];

export interface PrizeDef {
  tier: PrizeTier;
  label: string;
  weight: number;
}

export const PRIZE_TABLE: PrizeDef[] = [
  { tier: 'nada', label: 'SIGUE INTENTÁNDOLO', weight: 55 },
  { tier: 'pequeno', label: 'TOPPING GRATIS', weight: 28 },
  { tier: 'medio', label: 'BEBIDA O PATATAS GRATIS', weight: 13 },
  { tier: 'gordo', label: '¡BURGER GRATIS!', weight: 4 },
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
