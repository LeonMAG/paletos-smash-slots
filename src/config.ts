// Parámetros de juego v0.3. Todo lo calibrable vive aquí para poder ajustar
// mecánicas, premios y tiempos sin tocar la lógica de las escenas.

// Resolución de diseño 1080p: nítido en el kiosko y sin el borroso del
// reescalado que tenía la base 720p.
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

// ── Tablero (estilo cluster/cascada) ────────────────────────────────────────
export const BOARD = {
  cols: 6,
  rows: 5,
  cell: 160,
  // tamaño mínimo de grupo adyacente (ortogonal, cualquier forma) que explota
  minCluster: 4,
  // giro visual: barajado de texturas cada shuffleMs
  shuffleMs: 50,
  // no hay parada automática: el jugador frena cada columna con un clic.
  // (Si abandona a mitad, el idle devuelve la máquina al attract.)
  // no se puede frenar una columna antes de este tiempo de giro
  minSpinMs: 350,
  // tope de cascadas por tirada (corta bucles infinitos teóricos)
  maxCascades: 20,
};

// Frecuencia de aparición de cada símbolo al rellenar el tablero. Más
// símbolos distintos / pesos más planos → menos clusters → menos premio.
export const SYMBOL_WEIGHTS: Record<string, number> = {
  soda: 13,
  cheese: 13,
  bacon: 13,
  chili: 13,
  beer: 10,
  fries: 10,
  burger: 7,
  // raro a propósito: picotas en ≥3 columnas → tiradas gratis (~1,6 % de tiradas)
  picota: 1.7,
};

// La picota se dibuja más grande y sobresale un poco de su celda
export const SYMBOL_SCALE: Record<string, number> = {
  picota: 1.24,
};

// ── Tiradas gratis (picotas) ────────────────────────────────────────────────
// Picotas en al menos minColumns columnas distintas → count tiradas gratis
// automáticas y rápidas; el jugador se lleva el MEJOR premio de toda la
// secuencia (un solo canje). Sin re-trigger dentro de las gratis.
export const FREE_SPINS = {
  minColumns: 3,
  count: 15,
  autoStopBase: 650,
  autoStopStagger: 140,
  betweenSpinsMs: 750,
};

// ── Smash Final (machacar el botón) ─────────────────────────────────────────
// Con premio medio o gordo, a veces el premio se presenta UN nivel por debajo
// y machacar el botón a tiempo "lo sube" al nivel realmente sorteado.
// Acertar nunca infla la economía (el premio ya estaba ganado); fallar ahorra.
export const SMASH_FINAL = {
  chance: 0.6,
  presses: 8,
  windowMs: 3500,
};

// Umbrales de premio por piezas explotadas en total (cascadas incluidas).
// Calibrados por simulación (economy.test.ts) para respetar la tabla de
// premios; si se toca SYMBOL_WEIGHTS o el tablero, recalibrar.
// Medido sobre 20k tableros: P(≥8)=16,7 % · P(≥15)=2,6 % · P(≥20)=0,8 %
export const CLEARED_THRESHOLDS = {
  pequeno: 8,
  medio: 15,
  gordo: 20,
};

// ── Scatter / súper scatter ─────────────────────────────────────────────────
// Pity timer: se sortea el próximo evento en [minInterval, maxInterval]
// tiradas (media ≈ 50). Al disparar, superChance decide si es súper scatter.
// En el evento se inyecta un grupo conexo de estrellas en el tablero.
export const SCATTER = {
  minInterval: 38,
  maxInterval: 62,
  superChance: 0.2,
  // probabilidad de que un scatter normal dé el premio gordo (si no, medio)
  scatterGordoChance: 0.15,
  starsScatter: 5,
  starsSuper: 8,
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
  { id: 'picota', tier: 'low' },
  { id: 'scatter', tier: 'scatter' },
  { id: 'super', tier: 'super' },
];

// Relleno del tablero: solo comida, los símbolos especiales únicamente
// aparecen inyectados cuando toca evento.
export const FILLER_KEYS = SYMBOLS.filter(
  (s) => s.tier === 'low' || s.tier === 'mid' || s.tier === 'top',
).map((s) => s.id);

// ── Premios ─────────────────────────────────────────────────────────────────
// La fuente de verdad editable es la base de Notion «🎰 TABLA DE PREMIOS —
// SMASH SLOTS» (proyecto PALETOS ARCADE). Estos valores son su reflejo en
// código: pesos objetivo de frecuencia efectiva + etiquetas de pantalla.
// Al revisar la tabla, sincronizar esto y recalibrar CLEARED_THRESHOLDS.
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

export function maxTier(a: PrizeTier, b: PrizeTier): PrizeTier {
  return TIER_LADDER.indexOf(a) >= TIER_LADDER.indexOf(b) ? a : b;
}

export function tierDown(tier: PrizeTier): PrizeTier {
  const i = TIER_LADDER.indexOf(tier);
  return TIER_LADDER[Math.max(i - 1, 0)];
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
