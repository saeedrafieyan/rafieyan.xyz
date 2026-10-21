#!/usr/bin/env node
// Print the /cv/ page to public/files/saeed-rafieyan-cv.pdf with headless Chrome:   npm run cv:pdf
// Builds the site first (skip with --no-build). Runs locally (needs Chrome or Chromium)
// and in GitHub Actions (.github/workflows/cv-pdf.yml), where Chrome is preinstalled.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/files/saeed-rafieyan-cv.pdf');
const PORT = 4329;

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

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed`);
};

if (!process.argv.includes('--no-build')) run('npx', ['astro', 'build']);

const preview = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { cwd: ROOT, stdio: 'ignore', detached: true });
const stop = () => {
  try {
    process.kill(-preview.pid);
  } catch {}
};

try {
  const url = `http://localhost:${PORT}/cv/`;
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    if (i > 60) throw new Error('Preview server did not start.');
    await new Promise((r) => setTimeout(r, 500));
  }
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
  run(findChrome(), args);
  console.log(`✓ ${path.relative(ROOT, OUT)} (${Math.round(statSync(OUT).size / 1024)} KB)`);
} finally {
  stop();
}
