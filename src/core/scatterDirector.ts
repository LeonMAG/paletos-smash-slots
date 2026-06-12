import { SCATTER } from '../config';
import { chance, randInt } from './rng';
import type { SpinKind } from './board';

// Persistencia mínima para que el pity timer y el contador de tiradas
// sobrevivan a recargas y apagados de la máquina.
export interface KVStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const STORAGE_KEY = 'paletos-smash-slots:director';

function memoryStore(): KVStore {
  const m = new Map<string, string>();
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => {
      m.set(k, v);
    },
  };
}

// localStorage puede no existir (tests en node) o estar bloqueado (kiosko en
// modo privado): en ese caso el estado vive solo en memoria.
function safeLocalStore(): KVStore {
  try {
    const probe = '__paletos_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return {
      get: (k) => localStorage.getItem(k),
      set: (k, v) => {
        localStorage.setItem(k, v);
      },
    };
  } catch {
    return memoryStore();
  }
}

interface DirectorState {
  spins: number;
  sinceEvent: number;
  nextEventIn: number;
  scatters: number;
  supers: number;
}

export class ScatterDirector {
  private state: DirectorState;

  constructor(private store: KVStore = safeLocalStore()) {
    this.state = this.load();
  }

  private load(): DirectorState {
    try {
      const raw = this.store.get(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DirectorState>;
        if (
          typeof parsed.spins === 'number' &&
          typeof parsed.sinceEvent === 'number' &&
          typeof parsed.nextEventIn === 'number'
        ) {
          return {
            spins: parsed.spins,
            sinceEvent: parsed.sinceEvent,
            nextEventIn: parsed.nextEventIn,
            scatters: parsed.scatters ?? 0,
            supers: parsed.supers ?? 0,
          };
        }
      }
    } catch {
      // estado corrupto: se reinicia
    }
    return {
      spins: 0,
      sinceEvent: 0,
      nextEventIn: this.drawInterval(),
      scatters: 0,
      supers: 0,
    };
  }

  private save(): void {
    this.store.set(STORAGE_KEY, JSON.stringify(this.state));
  }

  private drawInterval(): number {
    return randInt(SCATTER.minInterval, SCATTER.maxInterval);
  }

  // Se llama una vez por tirada; decide si esta tirada es normal o evento.
  rollSpin(): SpinKind {
    this.state.spins += 1;
    this.state.sinceEvent += 1;

    let kind: SpinKind = 'normal';
    if (this.state.sinceEvent >= this.state.nextEventIn) {
      kind = chance(SCATTER.superChance) ? 'super' : 'scatter';
      this.state.sinceEvent = 0;
      this.state.nextEventIn = this.drawInterval();
      if (kind === 'super') this.state.supers += 1;
      else this.state.scatters += 1;
    }

    this.save();
    return kind;
  }

  get spins(): number {
    return this.state.spins;
  }

  // Tiradas que faltan (como máximo) para el próximo scatter
  get remaining(): number {
    return Math.max(0, this.state.nextEventIn - this.state.sinceEvent);
  }
}
