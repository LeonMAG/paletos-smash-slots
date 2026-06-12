import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { pressVirtualButton } from './input';
import { AttractScene } from './scenes/AttractScene';
import { GameScene } from './scenes/GameScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#111111',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [AttractScene, GameScene],
});

// Modo demo (?demo): pulsa el botón solo cada poco — sirve como attract de
// gameplay en la máquina y para smoke tests headless. Va enganchado al bucle
// de Phaser (no a setInterval) para que las pulsaciones se intercalen con los
// frames también bajo tiempo virtual acelerado.
if (new URLSearchParams(location.search).has('demo')) {
  let acc = 0;
  game.events.on(Phaser.Core.Events.POST_STEP, (_time: number, delta: number) => {
    acc += delta;
    if (acc >= 1400) {
      acc = 0;
      pressVirtualButton();
    }
  });
}
