import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface Entry {
  width: number;
  height: number;
  variants: { w: number; url: string }[];
}

let manifest: Record<string, Entry> | undefined;

/** Resized WebP copies made by scripts/optimize-uploads.mjs, if they exist for this upload. */
export function responsive(src: string): { src: string; srcset: string; width: number; height: number } | undefined {
  if (!manifest) {
    const file = path.join(process.cwd(), 'public/_img/manifest.json');
    manifest = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  }
  const entry = manifest?.[src];
  if (!entry?.variants.length) return undefined;
  if (!entry.variants.every((v) => existsSync(path.join(process.cwd(), 'public', v.url)))) return undefined;
  return {
    src: entry.variants.at(-1)!.url,
    srcset: entry.variants.map((v) => `${v.url} ${v.w}w`).join(', '),
    width: entry.width,
    height: entry.height,
  };
}
