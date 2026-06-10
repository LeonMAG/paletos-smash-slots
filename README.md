# Paletos Smash Slots 🍔🕹️

Primer juego de la **máquina arcade propia de Paletos** (smash burgers): una tragaperras interactiva donde, además de la suerte, cuenta la habilidad — cuando salta la señal **"¡SMASH!"**, pulsar el botón a tiempo mejora el premio.

> **Estado:** prototipo de viabilidad (F0). Sin arte definitivo: placeholders para perfilar mecánicas y esqueleto de funcionamiento. El skin final llegará con un Design System diseñado en Claude Design (fase F2).

## Mecánica (v0)

- **Núcleo tragaperras:** 3 rodillos con símbolos de la marca; el botón lanza la tirada y el resultado sale de una tabla de premios con pesos configurables.
- **El "smash":** durante la tirada aparece una señal visual; acertar la ventana de reacción (~350 ms, configurable) mejora el resultado.
- **Un solo input:** todo el juego se controla con un único botón arcade.

## Stack

- TypeScript + [Vite](https://vitejs.dev/) + [Phaser 3](https://phaser.io/)
- Target: Chromium en modo kiosko sobre mini-PC / Raspberry Pi
- Botón arcade físico vía encoder USB (se lee como teclado)

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # typecheck + build de producción
```

**Controles en desarrollo:** `ESPACIO`, `ENTER` o click equivalen al botón arcade.

## Estructura

```
src/
  config.ts            # parámetros calibrables: ventana de reacción, símbolos, tabla de premios
  input.ts             # abstracción del botón único (teclado + pointer)
  main.ts              # arranque de Phaser
  scenes/
    AttractScene.ts    # pantalla de espera de la máquina
    GameScene.ts       # bucle de partida: ready → spin → reacción → resultado
```

## Seguimiento del proyecto

Alcance, roadmap, diario de desarrollo y tareas viven en Notion:
[PALETOS ARCADE → JUEGO 1: SMASH SLOTS](https://app.notion.com/p/37be4f0fad19816086acd319705ad4d0)
