// Tokens del Design System de Paletos Club aplicados al juego.
// Fuente: Paletos Club Design System (colors_and_type.css) — "rebelde pero
// limpia": negro/rojo/papel + mostaza, bordes duros, sombras stamp sin blur,
// nada de gradientes, nada de azules, nada de emojis. La ★ es el motivo.

export const INK = 0x0e0e0e;
export const INK_SOFT = 0x1a1a1a;
export const PAPER = 0xf6f1e7;
export const PAPER_PURE = 0xffffff;
export const RED = 0xd7261e;
export const RED_DEEP = 0xa81812;
export const RED_BRIGHT = 0xff2e22;
export const YELLOW = 0xf5c518;
export const YELLOW_DEEP = 0xd9a800;
export const GREY_700 = 0x423f3b;
export const GREY_500 = 0x7a7770;
export const GREY_300 = 0xc9c3b5;
export const GREEN = 0x2f7d3a;

export const HEX = {
  ink: '#0E0E0E',
  paper: '#F6F1E7',
  red: '#D7261E',
  redDeep: '#A81812',
  redBright: '#FF2E22',
  yellow: '#F5C518',
  yellowDeep: '#D9A800',
  grey700: '#423F3B',
  grey500: '#7A7770',
  grey300: '#C9C3B5',
  green: '#2F7D3A',
} as const;

// Alfa Slab One primaria — el DS descartó Chunk Five como display activa por
// glifos acentuados rotos (á, é, ó, ú, ñ); queda solo de fallback.
export const FONT_DISPLAY = '"Alfa Slab One", "Chunk Five", Georgia, serif';
export const FONT_DISPLAY_CLEAN = '"Alfa Slab One", "Chunk Five", Georgia, serif';
export const FONT_BODY = 'Archivo, system-ui, sans-serif';
export const FONT_MONO = '"Space Mono", Menlo, monospace';

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

// resolution 2 en todos los textos: el canvas lógico es 720p pero el kiosko
// escala a 1080p — así la tipografía se mantiene nítida.
export function displayStyle(size: number, color: string, extra: TextStyle = {}): TextStyle {
  return { fontFamily: FONT_DISPLAY, fontSize: `${size}px`, color, resolution: 2, ...extra };
}

export function displayCleanStyle(size: number, color: string, extra: TextStyle = {}): TextStyle {
  return { fontFamily: FONT_DISPLAY_CLEAN, fontSize: `${size}px`, color, resolution: 2, ...extra };
}

export function bodyStyle(size: number, color: string, extra: TextStyle = {}): TextStyle {
  return {
    fontFamily: FONT_BODY,
    fontSize: `${size}px`,
    color,
    fontStyle: 'bold',
    resolution: 2,
    ...extra,
  };
}

export function monoStyle(size: number, color: string, extra: TextStyle = {}): TextStyle {
  return { fontFamily: FONT_MONO, fontSize: `${size}px`, color, resolution: 2, ...extra };
}
