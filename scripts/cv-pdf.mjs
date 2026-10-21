#!/usr/bin/env node
// Print the /cv/ page to public/files/saeed-rafieyan-cv.pdf with headless Chrome:   npm run cv:pdf
// Builds the site first (skip with --no-build). Runs locally (needs Chrome or Chromium)
// and in GitHub Actions (.github/workflows/cv-pdf.yml), where Chrome is preinstalled.
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build, preview } from 'astro';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/files/saeed-rafieyan-cv.pdf');

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const r = spawnSync('which', [name], { encoding: 'utf8' });
    if (r.status === 0) return r.stdout.trim();
  }
  throw new Error('Chrome/Chromium not found. Install it or set CHROME_PATH.');
}

if (!process.argv.includes('--no-build')) {
  const r = spawnSync('node', ['scripts/optimize-uploads.mjs'], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
  await build({ root: ROOT, logLevel: 'warn' });
}

// In-process preview server on whatever port it gets; stopped in `finally`.
const server = await preview({ root: ROOT, server: { port: 4329 }, logLevel: 'warn' });
try {
  const url = `http://localhost:${server.port}/cv/`;
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--virtual-time-budget=10000',
    '--run-all-compositor-stages-before-draw',
    `--print-to-pdf=${OUT}`,
    url,
  ];
  if (process.platform === 'linux') args.unshift('--no-sandbox');
  // Async spawn: Chrome fetches from the server running in this same process.
  const chrome = spawn(findChrome(), args, { stdio: ['ignore', 'ignore', 'inherit'] });
  const [code] = await once(chrome, 'exit');
  if (code !== 0) throw new Error(`Chrome exited with code ${code}`);

  // Chrome stamps the print time into the PDF. Pin it (same length, so the xref offsets stay
  // valid) so an unchanged CV gives a byte-identical file and no needless commit.
  const pdf = readFileSync(OUT, 'latin1').replace(/(\/(?:CreationDate|ModDate) \(D:)\d{14}/g, '$120000101000000');
  writeFileSync(OUT, pdf, 'latin1');
  console.log(`✓ ${path.relative(ROOT, OUT)} (${Math.round(statSync(OUT).size / 1024)} KB)`);
} finally {
  await server.stop();
}
