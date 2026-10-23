#!/usr/bin/env node
// Runs before every build (npm run build). For each image in public/uploads it writes resized
// WebP copies to public/_img/ (git-ignored) plus a manifest the pages use for srcset.
// sharp drops all metadata, so camera EXIF (including GPS location) never reaches the site.
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'public/uploads');
const OUT = path.join(ROOT, 'public/_img');
const WIDTHS = [400, 800, 1400, 2400];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(jpe?g|png|webp)$/i.test(e.name)) out.push(p);
  }
  return out;
}

await mkdir(OUT, { recursive: true });
const manifestPath = path.join(OUT, 'manifest.json');
const previous = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{}'));
const manifest = {};

for (const file of await walk(SRC)) {
  const rel = path.relative(SRC, file).split(path.sep).join('/');
  const key = `/uploads/${rel}`;
  const base = rel.replace(/\.[^.]+$/, '');
  const { mtimeMs, size } = await stat(file);
  const widths = WIDTHS.join(',');
  if (previous[key]?.mtimeMs === mtimeMs && previous[key].widths === widths && previous[key].variants.every((v) => v.exists !== false)) {
    manifest[key] = previous[key];
    continue;
  }
  const meta = await sharp(file).metadata();
  // GPS IFD pointer tag 0x8825 (either byte order) inside the EXIF block.
  if (meta.exif && /\x88\x25|\x25\x88/.test(meta.exif.toString('latin1'))) {
    console.warn(`! ${key} contains GPS location data. The site only serves stripped copies, but the original file is in the repository: re-upload it without location.`);
  }
  if (size > 1_500_000) console.warn(`! ${key} is ${(size / 1e6).toFixed(1)} MB; consider uploading a smaller image.`);
  const width = meta.autoOrient?.width ?? meta.width;
  const height = meta.autoOrient?.height ?? meta.height;
  const targets = [...new Set(WIDTHS.map((w) => Math.min(w, width)))];
  const variants = [];
  for (const w of targets) {
    const url = `/_img/${base}-${w}.webp`;
    const out = path.join(ROOT, 'public', url);
    await mkdir(path.dirname(out), { recursive: true });
    await sharp(file).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
    variants.push({ w, url });
  }
  manifest[key] = { mtimeMs, widths, width, height, variants };
  console.log(`✓ ${key} → ${variants.map((v) => v.w).join(', ')}w WebP`);
}

await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
