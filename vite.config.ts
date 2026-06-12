import { defineConfig } from 'vite';

// Base relativa: el build funciona en GitHub Pages (subruta /paletos-smash-slots/)
// y también abierto en local o en el kiosko sin depender de la raíz del dominio.
export default defineConfig({
  base: './',
  build: {
    // los SVG de símbolos deben emitirse como ficheros: el loader de Phaser
    // no entiende los data-URI url-encoded que genera el inlining de Vite
    assetsInlineLimit: 0,
  },
});
