import {
  LOW_SYMBOLS,
  MID_SYMBOLS,
  PRIZE_TABLE,
  PrizeTier,
  SCATTER,
  SCATTER_SYMBOL,
  SMASH,
  SUPER_SYMBOL,
  SymbolDef,
  TIER_LADDER,
  TOP_SYMBOL,
} from '../config';
import { chance, pick, randInt, weightedPick } from './rng';

export type SpinKind = 'normal' | 'scatter' | 'super';

export interface SmashPlan {
  // ms desde el inicio del giro hasta que salta la señal
  at: number;
  windowMs: number;
}

export interface SpinOutcome {
  kind: SpinKind;
  baseTier: PrizeTier;
  upgradedTier: PrizeTier;
  smash: SmashPlan | null;
  // fila central (línea de premio) para el resultado base y el mejorado
  middleBase: SymbolDef[];
  middleUpgraded: SymbolDef[];
  // tensión en el tercer rodillo (los dos primeros coinciden)
  anticipation: boolean;
}

export function tierUp(tier: PrizeTier): PrizeTier {
  const i = TIER_LADDER.indexOf(tier);
  return TIER_LADDER[Math.min(i + 1, TIER_LADDER.length - 1)];
}

// Fila central coherente con el premio. El resultado se decide primero en la
// tabla (control de negocio) y los símbolos se eligen después para contarlo.
export function symbolsForTier(tier: PrizeTier, kind: SpinKind): SymbolDef[] {
  if (kind === 'super') return [SUPER_SYMBOL, SUPER_SYMBOL, SUPER_SYMBOL];
  if (kind === 'scatter') return [SCATTER_SYMBOL, SCATTER_SYMBOL, SCATTER_SYMBOL];

  if (tier === 'gordo') return [TOP_SYMBOL, TOP_SYMBOL, TOP_SYMBOL];
  if (tier === 'medio') {
    const s = pick(MID_SYMBOLS);
    return [s, s, s];
  }
  if (tier === 'pequeno') {
    const s = pick(LOW_SYMBOLS);
    return [s, s, s];
  }

  // nada: nunca tres iguales. Un 45 % de las veces deja un "casi" con dos
  // símbolos iguales para generar tensión.
  const all = [...LOW_SYMBOLS, ...MID_SYMBOLS, TOP_SYMBOL];
  if (chance(0.45)) {
    const a = pick(all);
    let b = pick(all);
    while (b.id === a.id) b = pick(all);
    return [a, a, b];
  }
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export function computeSpin(kind: SpinKind): SpinOutcome {
  let baseTier: PrizeTier;
  if (kind === 'super') {
    baseTier = 'gordo';
  } else if (kind === 'scatter') {
    baseTier = chance(SCATTER.scatterGordoChance) ? 'gordo' : 'medio';
  } else {
    baseTier = weightedPick(PRIZE_TABLE.map((p) => [p.tier, p.weight] as const));
  }

  const upgradedTier = tierUp(baseTier);
  const canUpgrade = upgradedTier !== baseTier;
  const smash: SmashPlan | null =
    canUpgrade && chance(SMASH.chance)
      ? { at: randInt(SMASH.minDelay, SMASH.maxDelay), windowMs: SMASH.windowMs }
      : null;

  const middleBase = symbolsForTier(baseTier, kind);
  const middleUpgraded = smash ? symbolsForTier(upgradedTier, kind) : middleBase;

  const anticipation =
    kind !== 'normal' ||
    (middleBase[0].id === middleBase[1].id &&
      (baseTier === 'gordo' || middleBase[0].tier !== 'low'));

  return { kind, baseTier, upgradedTier, smash, middleBase, middleUpgraded, anticipation };
}
