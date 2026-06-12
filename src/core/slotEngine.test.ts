import { describe, expect, it } from 'vitest';
import { REELS, SMASH } from '../config';
import { computeSpin, symbolsForTier, tierUp } from './slotEngine';

describe('tierUp', () => {
  it('sube un nivel y se queda en gordo', () => {
    expect(tierUp('nada')).toBe('pequeno');
    expect(tierUp('pequeno')).toBe('medio');
    expect(tierUp('medio')).toBe('gordo');
    expect(tierUp('gordo')).toBe('gordo');
  });
});

describe('symbolsForTier', () => {
  it('nada nunca enseña tres iguales', () => {
    for (let i = 0; i < 800; i++) {
      const rows = symbolsForTier('nada', 'normal');
      const threeEqual = rows[0].id === rows[1].id && rows[1].id === rows[2].id;
      expect(threeEqual).toBe(false);
    }
  });

  it('pequeno son tres símbolos low iguales', () => {
    for (let i = 0; i < 300; i++) {
      const rows = symbolsForTier('pequeno', 'normal');
      expect(rows[0].id).toBe(rows[1].id);
      expect(rows[1].id).toBe(rows[2].id);
      expect(rows[0].tier).toBe('low');
    }
  });

  it('medio son tres símbolos mid iguales', () => {
    for (let i = 0; i < 300; i++) {
      const rows = symbolsForTier('medio', 'normal');
      expect(rows[0].id).toBe(rows[1].id);
      expect(rows[1].id).toBe(rows[2].id);
      expect(rows[0].tier).toBe('mid');
    }
  });

  it('gordo son tres burgers', () => {
    const rows = symbolsForTier('gordo', 'normal');
    expect(rows.every((s) => s.id === 'burger')).toBe(true);
  });

  it('scatter y súper scatter usan su símbolo especial', () => {
    expect(symbolsForTier('medio', 'scatter').every((s) => s.id === 'scatter')).toBe(true);
    expect(symbolsForTier('gordo', 'super').every((s) => s.id === 'super')).toBe(true);
  });
});

describe('computeSpin', () => {
  it('súper scatter siempre es premio gordo y sin smash', () => {
    for (let i = 0; i < 200; i++) {
      const o = computeSpin('super');
      expect(o.baseTier).toBe('gordo');
      expect(o.smash).toBeNull();
    }
  });

  it('scatter garantiza al menos premio medio', () => {
    for (let i = 0; i < 300; i++) {
      const o = computeSpin('scatter');
      expect(['medio', 'gordo']).toContain(o.baseTier);
    }
  });

  it('el smash solo se programa cuando hay mejora posible', () => {
    for (let i = 0; i < 800; i++) {
      const o = computeSpin('normal');
      if (o.smash) {
        expect(o.baseTier).not.toBe('gordo');
        expect(o.upgradedTier).not.toBe(o.baseTier);
      }
    }
  });

  it('la ventana de smash se resuelve antes de la primera parada de rodillo', () => {
    expect(SMASH.maxDelay + SMASH.windowMs).toBeLessThan(REELS.stopBase);
    for (let i = 0; i < 800; i++) {
      const o = computeSpin('normal');
      if (o.smash) {
        expect(o.smash.at + o.smash.windowMs).toBeLessThan(REELS.stopBase);
      }
    }
  });
});
