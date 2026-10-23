#!/usr/bin/env node
// Tell IndexNow engines (Bing → Copilot, Yandex, Seznam, Naver, …) which pages changed.
// Runs after each production deploy (.github/workflows/indexnow.yml). It fetches the live sitemap,
// hashes each page's <main> (so the footer's "Updated" date alone doesn't count as a change),
// compares with the previous run's hashes in .indexnow/hashes.json and submits only what changed.
// Google doesn't use IndexNow; it reads the sitemap.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const HOST = 'rafieyan.xyz';
const ORIGIN = `https://${HOST}`;
const CACHE = path.join(ROOT, '.indexnow/hashes.json');

const keyFile = (await readdir(path.join(ROOT, 'public'))).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('No IndexNow key file (public/<32 hex>.txt) found.');
const key = (await readFile(path.join(ROOT, 'public', keyFile), 'utf8')).trim();

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'rafieyan.xyz IndexNow notifier' } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
};
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const sitemaps = locs(await get(`${ORIGIN}/sitemap-index.xml`));
const urls = (await Promise.all(sitemaps.map(async (s) => locs(await get(s))))).flat();

const hashes = {};
for (const url of urls) {
  const html = await get(url);
  const main = html.match(/<main[\s\S]*<\/main>/)?.[0] ?? html;
  hashes[url] = createHash('sha256').update(main).digest('hex');
}

const previous = JSON.parse(await readFile(CACHE, 'utf8').catch(() => '{}'));
const changed = urls.filter((u) => previous[u] !== hashes[u]);
const removed = Object.keys(previous).filter((u) => !(u in hashes));
const urlList = [...changed, ...removed];

if (urlList.length) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key, keyLocation: `${ORIGIN}/${keyFile}`, urlList }),
  });
  console.log(`Submitted ${urlList.length} URL(s) → HTTP ${res.status}`);
  for (const u of urlList) console.log(`  ${u}`);
  // 200/202 = received. 422/403 usually mean the key file isn't live yet; keep the old cache so we retry.
  if (res.status !== 200 && res.status !== 202) process.exit(1);
} else {
  console.log('No content changes since the last run; nothing submitted.');
}

await mkdir(path.dirname(CACHE), { recursive: true });
await writeFile(CACHE, JSON.stringify(hashes, null, 2));
