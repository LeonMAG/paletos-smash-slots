# Paletos Smash Slots 🍔🕹️

Primer juego de la **máquina arcade propia de Paletos** (smash burgers): una tragaperras interactiva donde, además de la suerte, cuenta la habilidad — cuando salta la señal **"¡SMASH!"**, pulsar el botón a tiempo mejora el premio.

> **Estado:** v0.2 — versión jugable con la identidad de **Paletos Club** aplicada (Design System de Claude Design): paleta negro/rojo/papel/mostaza, tipografía Chunk Five, símbolos SVG propios y estética de bordes duros con sombras "stamp".

**Demo:** https://leonmag.github.io/paletos-smash-slots/ (se despliega automáticamente en cada push a `main`)

## Mecánica (v0.2)

- **Núcleo tragaperras:** 3 rodillos con símbolos SVG propios de la marca (burger, cerveza, patatas, refresco, queso, bacon, chili). El resultado se decide primero en la tabla de premios (pesos configurables) y los rodillos lo escenifican — control total de las probabilidades desde negocio.
- **El "smash":** en ~15 % de las tiradas salta la señal **¡SMASH!** con un anillo que se cierra; pulsar dentro de la ventana (350 ms, configurable) sube el premio un nivel. Fallar no penaliza.
- **★ Scatter / ✶ Súper scatter:** pity timer que dispara un evento cada **38–62 tiradas (media ~50)**; el 20 % de los eventos es súper scatter. El scatter garantiza premio medio o gordo; el súper, el gordo. El contador persiste en `localStorage` (sobrevive a reinicios de la máquina).

### Tabla de probabilidades v1 (efectivas, validadas por simulación)

| Nivel | Peso base | Efectiva | Frecuencia |
|---|---|---|---|
| Nada | 92,0 % | ~83 % | — |
| Pequeño | 5,0 % | ~11 % | 1 de cada ~9 |
| Medio | 2,2 % | ~4 % | 1 de cada ~25 |
| Gordo | 0,8 % | ~1,6 % | 1 de cada ~60 |
| **Premio (cualquiera)** | — | **~17 %** | **1 de cada ~6** |

La "efectiva" incluye el efecto del ¡SMASH! (~50 % de acierto asumido) y de los scatters. Todo se ajusta en `src/config.ts` y `src/core/economy.test.ts` valida que la economía no se desvíe.
- **Anticipación:** si los dos primeros rodillos coinciden, el tercero aguanta un segundo extra con glow — tensión clásica de tragaperras.
- **Game feel:** rebote en la parada de rodillos, partículas, confeti, shakes de cámara y sonido sintetizado con WebAudio (cero assets).
- **Un solo input:** todo se controla con un único botón arcade.

## Stack

- TypeScript + [Vite](https://vitejs.dev/) + [Phaser 3](https://phaser.io/)
- [Vitest](https://vitest.dev/) para los tests de balanceo del motor
- Target: Chromium en modo kiosko sobre mini-PC / Raspberry Pi
- Botón arcade físico vía encoder USB (se lee como teclado)

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # tests del motor (simulan 10k tiradas y validan el pity timer)
npm run build    # typecheck + build de producción
```

**Controles en desarrollo:** `ESPACIO`, `ENTER` o click equivalen al botón arcade.

**Modo demo:** añadir `?demo` a la URL hace que el juego se pulse solo cada 1,4 s — útil como attract de gameplay y para smoke tests.

## Estructura

```
src/
  config.ts                  # TODO lo calibrable: tiempos, pesos, premios, scatter, smash
  input.ts                   # abstracción del botón único (+ pulsación virtual para demo)
  main.ts                    # arranque de Phaser y modo demo
  core/
    rng.ts                   # azar: picks ponderados, enteros, monedas
    slotEngine.ts            # resultado de la tirada: premio → símbolos, plan de smash
    scatterDirector.ts       # pity timer del scatter (~50 tiradas), persistido
    audio.ts                 # sfx sintetizados con WebAudio (sin assets)
  ui/
    Reel.ts                  # rodillo: scroll, parada con rebote
  scenes/
    AttractScene.ts          # pantalla de espera de la máquina
    GameScene.ts             # bucle de partida: ready → spin → smash → resultado
```

## Seguimiento del proyecto

Alcance, roadmap, diario de desarrollo y tareas viven en Notion:
[PALETOS ARCADE → JUEGO 1: SMASH SLOTS](https://app.notion.com/p/37be4f0fad19816086acd319705ad4d0)
