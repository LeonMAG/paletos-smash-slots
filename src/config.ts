// Parámetros de juego v0. Todo lo calibrable vive aquí para poder ajustar
// mecánicas y premios sin tocar la lógica de las escenas.

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const REEL_COUNT = 3;

// Ventana de reacción del "¡SMASH!" en ms — valor inicial a calibrar en playtest
export const REACTION_WINDOW_MS = 350;

// Duración del giro: cada rodillo se detiene un poco después del anterior
export const SPIN_BASE_MS = 1800;
export const SPIN_STAGGER_MS = 600;

// Símbolos placeholder (emoji); el arte real llegará con el Design System (F2)
export const SYMBOLS = ['🍔', '🧀', '🥓', '🔥', '🥤', '⭐'] as const;
export type SymbolId = (typeof SYMBOLS)[number];

// Tabla de premios v0 con pesos relativos. Los premios reales y su
// probabilidad definitiva se definen en el GDD junto a negocio.
export interface Prize {
  id: string;
  label: string;
  weight: number;
}

export const PRIZE_TABLE: Prize[] = [
  { id: 'nada', label: 'Sigue intentándolo', weight: 50 },
  { id: 'pequeno', label: 'Premio pequeño (p. ej. topping gratis)', weight: 30 },
  { id: 'medio', label: 'Premio medio (p. ej. bebida o patatas)', weight: 15 },
  { id: 'gordo', label: 'Premio gordo (p. ej. burger gratis)', weight: 5 },
];
