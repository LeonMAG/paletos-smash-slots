import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { AttractScene } from './scenes/AttractScene';
import { GameScene } from './scenes/GameScene';

new Phaser.Game({
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
