import { describe, expect, it } from 'vitest';
import { scribbleRectPoints } from './scribble';

describe('scribbleRectPoints', () => {
  it('es determinista para la misma semilla', () => {
    const a = scribbleRectPoints(700, 510, 11, 3);
    const b = scribbleRectPoints(700, 510, 11, 3);
    expect(a).toEqual(b);
    const c = scribbleRectPoints(700, 510, 12, 3);
    expect(a).not.toEqual(c);
  });

  it('los puntos se quedan cerca del rectángulo nominal', () => {
    const amp = 3;
    const pts = scribbleRectPoints(700, 510, 7, amp);
    expect(pts.length).toBeGreaterThan(100);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(-amp * 1.01);
      expect(p.x).toBeLessThanOrEqual(700 + amp * 1.01);
      expect(p.y).toBeGreaterThanOrEqual(-amp * 1.01);
      expect(p.y).toBeLessThanOrEqual(510 + amp * 1.01);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    }
  });
});
