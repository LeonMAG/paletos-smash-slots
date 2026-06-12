// Smoke test visual: abre el juego en modo demo (?demo) con Chrome headless
// en tiempo real, captura varios momentos del gameplay y falla si hay
// errores de página. Uso:
//   npm run build && npm run preview &   (o servidor equivalente)
//   npm run smoke
// Variables: SMOKE_URL (def. http://localhost:4173/?demo),
//            SMOKE_OUT (def. smoke-shots), CHROME_PATH.
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.SMOKE_URL ?? 'http://localhost:4173/?demo';
const OUT = process.env.SMOKE_OUT ?? 'smoke-shots';

// (espera ms antes de la captura, nombre) — el demo pulsa el botón cada 1,4 s
const SHOTS = [
  [1000, 'attract'],
  [2400, 'ready'],
  [1500, 'spin'],
  [2400, 'result'],
  [5000, 'later-a'],
  [7000, 'later-b'],
];

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--window-size=1280,720', '--mute-audio'],
});

const errors = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  await page.goto(URL, { waitUntil: 'load' });

  let elapsed = 0;
  for (const [wait, name] of SHOTS) {
    await new Promise((r) => setTimeout(r, wait));
    elapsed += wait;
    const path = `${OUT}/${name}.png`;
    await page.screenshot({ path });
    console.log(`📸 ${path} (~${(elapsed / 1000).toFixed(1)}s)`);
  }
} finally {
  await browser.close();
}

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} error(es) de página:`);
  errors.forEach((e) => console.error(` - ${e}`));
  process.exit(1);
}
console.log('\n✅ Smoke test sin errores de página');
