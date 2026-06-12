import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SYMBOLS } from '../config';
import { HEX, monoStyle } from '../theme';

import baconUrl from '../assets/symbols/bacon.svg';
import beerUrl from '../assets/symbols/beer.svg';
import burgerUrl from '../assets/symbols/burger.svg';
import cheeseUrl from '../assets/symbols/cheese.svg';
import chiliUrl from '../assets/symbols/chili.svg';
import friesUrl from '../assets/symbols/fries.svg';
import sodaUrl from '../assets/symbols/soda.svg';
import starUrl from '../assets/symbols/star.svg';
import superstarUrl from '../assets/symbols/superstar.svg';

const SYMBOL_URLS: Record<string, string> = {
  burger: burgerUrl,
  beer: beerUrl,
  fries: friesUrl,
  soda: sodaUrl,
  cheese: cheeseUrl,
  bacon: baconUrl,
  chili: chiliUrl,
  scatter: starUrl,
  super: superstarUrl,
};

// Carga los SVG (rasterizados a 256px para nitidez) y espera a las fuentes de
// marca antes de arrancar, para que ningún texto se pinte con la fallback.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'CARGANDO…', monoStyle(20, HEX.grey500))
      .setOrigin(0.5);
    for (const s of SYMBOLS) {
      this.load.svg(s.id, SYMBOL_URLS[s.id], { width: 256, height: 256 });
    }
  }

  create(): void {
    const fonts = [
      '400 84px "Chunk Five Print"',
      '400 44px "Chunk Five"',
      '700 24px Archivo',
      '400 20px "Space Mono"',
    ];
    Promise.all(fonts.map((f) => document.fonts.load(f)))
      .catch(() => undefined)
      .finally(() => this.scene.start('attract'));
  }
}
