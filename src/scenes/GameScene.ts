import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { onAction } from '../input';

// Esqueleto del bucle de partida. Cada estado se implementa en su tarea:
//   spin     → rodillos placeholder girando y parándose en secuencia
//   reaction → señal "¡SMASH!" + ventana de reacción que mejora el premio
//   result   → premio según tabla de probabilidades + nº de smashes
type GameState = 'ready' | 'spin' | 'reaction' | 'result';

export class GameScene extends Phaser.Scene {
  private state: GameState = 'ready';
  private stateText!: Phaser.GameObjects.Text;

  constructor() {
    super('game');
  }

  create(): void {
    this.add
      .text(GAME_WIDTH / 2, 60, '[GameScene]', {
        fontSize: '24px',
        color: '#888888',
      })
      .setOrigin(0.5);

    this.stateText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
        fontSize: '40px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.enter('ready');
    onAction(this, () => this.advance());
  }

  // Avance placeholder: el botón recorre los estados en orden para validar
  // el flujo completo con un solo input. La lógica real de cada estado
  // sustituirá este avance manual.
  private advance(): void {
    const next: Record<GameState, GameState | 'attract'> = {
      ready: 'spin',
      spin: 'reaction',
      reaction: 'result',
      result: 'attract',
    };

    const target = next[this.state];
    if (target === 'attract') {
      this.scene.start('attract');
      return;
    }
    this.enter(target);
  }

  private enter(state: GameState): void {
    this.state = state;
    const labels: Record<GameState, string> = {
      ready: 'READY — pulsa para tirar',
      spin: 'SPIN — rodillos girando (TODO)',
      reaction: '¡SMASH! — ventana de reacción (TODO)',
      result: 'RESULT — premio (TODO)',
    };
    this.stateText.setText(labels[state]);
  }
}
