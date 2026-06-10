import { defineConfig } from 'vite';

// Base relativa: el build funciona en GitHub Pages (subruta /paletos-smash-slots/)
// y también abierto en local o en el kiosko sin depender de la raíz del dominio.
export default defineConfig({
  base: './',
});
