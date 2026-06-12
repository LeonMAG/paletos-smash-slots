// Borde "hand-drawn" del Design System (ScribbleShape): rectángulo con
// wobble de dos senos armónicos y PRNG sembrado (Mulberry32). Portado de
// scribble-shape.jsx a una lista de puntos para pintar con Phaser.Graphics.

export interface Pt {
  x: number;
  y: number;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Recorre el perímetro del rectángulo w×h aplicando el wobble. El paso es más
// fino que en el DS (9px vs 18px) porque Phaser une los puntos con rectas en
// lugar de spline — así la curva queda igual de orgánica.
export function scribbleRectPoints(
  w: number,
  h: number,
  seed: number,
  amp = 2.5,
  step = 9,
): Pt[] {
  const rng = mulberry32(seed);
  const f1 = 0.032 + rng() * 0.012;
  const ph1 = rng() * Math.PI * 2;
  const f2 = 0.08 + rng() * 0.025;
  const ph2 = rng() * Math.PI * 2;
  const wobble = (t: number) =>
    (Math.sin(t * f1 + ph1) * 0.65 + Math.sin(t * f2 + ph2) * 0.35) * amp;

  const pts: Pt[] = [];
  let t = rng() * 300;
  for (let x = 0; x <= w; x += step) {
    pts.push({ x, y: wobble(t) });
    t += step;
  }
  for (let y = step; y <= h; y += step) {
    pts.push({ x: w + wobble(t), y });
    t += step;
  }
  for (let x = w - step; x >= 0; x -= step) {
    pts.push({ x, y: h + wobble(t) });
    t += step;
  }
  for (let y = h - step; y > 0; y -= step) {
    pts.push({ x: wobble(t), y });
    t += step;
  }
  return pts;
}
