import Phaser from 'phaser';

// La máquina arcade tiene UN único botón físico: el encoder USB lo emite
// como pulsación de teclado. En desarrollo aceptamos espacio, enter y
// click/touch como equivalentes de ese botón.
export function onAction(scene: Phaser.Scene, handler: () => void): void {
  scene.input.keyboard?.on('keydown-SPACE', handler);
  scene.input.keyboard?.on('keydown-ENTER', handler);
  scene.input.on('pointerdown', handler);
}
