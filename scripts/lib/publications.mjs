// Shared helpers for scripts/add-publication.mjs and scripts/sync-orcid.mjs.
// No dependencies: Node 22+ (global fetch) only.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import YAML from 'yaml';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const PUB_DIR = path.join(ROOT, 'src/content/publications');
const UA = 'rafieyan.xyz publication importer (https://rafieyan.xyz)';

export function normalizeDoi(input) {
  return String(input ?? '')
    .trim()
    .replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, '')
    .toLowerCase();
}

const normTitle = (t) =>
  String(t ?? '')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** DOIs and normalised titles (with file and status) already in src/content/publications. */
export async function existingPublications() {
  const dois = new Set();
  const titles = new Map();
  for (const f of await readdir(PUB_DIR)) {
    if (!/\.ya?ml$/.test(f)) continue;
    const text = await readFile(path.join(PUB_DIR, f), 'utf8');
    const doi = text.match(/^doi:\s*['"]?([^'"\n]+)/m)?.[1];
    if (doi) dois.add(normalizeDoi(doi));
    // Include indented continuation lines: Pages CMS folds long titles at 80 columns.
    const title = text.match(/^title:[ \t]*(.*(?:\n[ \t]+\S.*)*)/m)?.[1];
    const status = text.match(/^status:\s*['"]?([\w-]+)/m)?.[1] ?? 'published';
    if (title) titles.set(normTitle(title.replace(/^[>|][-+]?/, '')), { file: f, status });
  }
  return { dois, hasTitle: (t) => titles.has(normTitle(t)), byTitle: (t) => titles.get(normTitle(t)) };
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

const stripTags = (s) =>
  String(s ?? '')
    .replace(/<jats:title>[^<]*<\/jats:title>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(abstract|summary)\s*[:.]?\s*/i, '')
    .trim();

const ymd = (parts) =>
  parts?.[0]
    ? parts[0].map((n, i) => (i === 0 ? String(n) : String(n).padStart(2, '0'))).join('-')
    : undefined;

const CROSSREF_TYPES = {
  'journal-article': 'article',
  'proceedings-article': 'conference',
  'posted-content': 'preprint',
  'book-chapter': 'chapter',
  dissertation: 'thesis',
};

/** Look a DOI up on Crossref, then DataCite. Returns a publication object or null. */
export async function lookupDoi(rawDoi) {
  const doi = normalizeDoi(rawDoi);
  if (!/^10\.\d{4,9}\/\S+$/.test(doi)) throw new Error(`"${rawDoi}" does not look like a DOI (10.xxxx/…)`);

  const cr = await getJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (cr?.message) {
    const m = cr.message;
    const date = ymd(m['published-online']?.['date-parts']) ?? ymd(m.published?.['date-parts']) ?? ymd(m.issued?.['date-parts']);
    const type = CROSSREF_TYPES[m.type] ?? 'article';
    const title = stripTags(m.title?.[0]);
    const abstract = m.abstract ? stripTags(m.abstract) : undefined;
    const venue = stripTags(m['container-title']?.[0] ?? (type === 'preprint' ? m.institution?.[0]?.name ?? m.publisher : m.publisher));
    return {
      supported: m.type in CROSSREF_TYPES,
      sourceType: m.type,
      title,
      // "Family, Given" keeps multi-word family names (e.g. Partovi Nasr) intact.
      authors: (m.author ?? [])
        .map((a) => (a.given ? (/\s/.test(a.family ?? '') ? `${a.family}, ${a.given}` : `${a.given} ${a.family}`) : a.family ?? a.name))
        .filter(Boolean),
      year: Number((date ?? '').slice(0, 4)),
      date,
      type: type === 'article' && (/\breview\b/i.test(title) || /\bthis review\b/i.test(abstract ?? '')) ? 'review' : type,
      status: type === 'preprint' ? 'preprint' : m.type === 'journal-article' && !m.volume ? 'in-press' : 'published',
      venue,
      volume: m.volume,
      issue: m.issue,
      pages: m['article-number'] ?? m.page,
      doi,
      url: m.resource?.primary?.URL ?? m.URL,
      abstract,
    };
  }

  const dc = await getJson(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`);
  if (dc?.data?.attributes) {
    const a = dc.data.attributes;
    const kind = a.types?.resourceTypeGeneral;
    return {
      supported: ['JournalArticle', 'Preprint', 'ConferencePaper', 'Text', 'Dissertation'].includes(kind),
      sourceType: `datacite:${kind}`,
      title: stripTags(a.titles?.[0]?.title),
      authors: (a.creators ?? [])
        .map((c) =>
          c.givenName ? (/\s/.test(c.familyName ?? '') ? `${c.familyName}, ${c.givenName}` : `${c.givenName} ${c.familyName}`) : c.name,
        )
        .map(stripTags)
        .filter(Boolean),
      year: Number(a.publicationYear),
      date: a.dates?.find((d) => d.dateType === 'Issued')?.date?.slice(0, 10),
      type: kind === 'Preprint' ? 'preprint' : kind === 'Dissertation' ? 'thesis' : 'article',
      status: kind === 'Preprint' ? 'preprint' : 'published',
      venue: stripTags(a.container?.title ?? a.publisher?.name ?? a.publisher),
      doi,
      url: a.url,
      abstract: stripTags(a.descriptions?.find((d) => d.descriptionType === 'Abstract')?.description) || undefined,
    };
  }
  return null;
}

const STOP = new Set(['a', 'an', 'the', 'of', 'on', 'for', 'and', 'in', 'to', 'with', 'by', 'from', 'using', 'via']);
const slug = (s) =>
  String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function fileNameFor(pub) {
  // Same "Given Family" / "Family, Given" rules as src/lib/authors.ts.
  const first = String(pub.authors[0] ?? '').replace(/[*†]/g, '').trim();
  const family = slug(first.includes(',') ? first.split(',')[0] : (first.split(/\s+/).at(-1) ?? '')) || 'unknown';
  const words = slug(pub.title)
    .split('-')
    .filter((w) => w && !STOP.has(w))
    .slice(0, 2)
    .join('-');
  let name = `${pub.year}-${family}-${words}`;
  let n = 2;
  while (existsSync(path.join(PUB_DIR, `${name}.yaml`))) name = `${pub.year}-${family}-${words}-${n++}`;
  return `${name}.yaml`;
}

// YAML is a superset of JSON, so JSON-quoted scalars are always valid YAML.
const q = (v) => JSON.stringify(String(v));

const list = (key, items) => (items?.length ? [`${key}:`, ...items.map((t) => `  - ${q(t)}`)] : [`${key}: []`]);

/** `keep` carries the owner's own fields (topics, links, …) over from an entry being replaced. */
export function toYaml(pub, { selected = false, keep = {} } = {}) {
  const lines = [`title: ${q(pub.title)}`, 'authors:', ...pub.authors.map((a) => `  - ${q(a)}`), `year: ${pub.year}`];
  if (pub.date) lines.push(`date: ${q(pub.date)}`);
  lines.push(`type: ${keep.type === 'review' ? 'review' : pub.type}`, `status: ${pub.status}`);
  for (const key of ['venue', 'volume', 'issue', 'pages', 'doi', 'url']) if (pub[key]) lines.push(`${key}: ${q(pub[key])}`);
  for (const key of ['pdf', 'code', 'data', 'app']) if (keep[key]) lines.push(`${key}: ${q(keep[key])}`);
  if (pub.abstract ?? keep.abstract) lines.push(`abstract: ${q(pub.abstract ?? keep.abstract)}`);
  lines.push(`selected: ${Boolean(selected || keep.selected)}`, ...list('topics', keep.topics), ...list('projects', keep.projects));
  return lines.join('\n') + '\n';
}

/**
 * Writes a new entry, or, with `replace` (the file name of a preprint / under-review entry with
 * the same title), overwrites that file in place so its id, topics, projects and links survive.
 */
export async function writePublication(pub, { selected = false, replace } = {}) {
  let keep = {};
  if (replace) keep = YAML.parse(await readFile(path.join(PUB_DIR, replace), 'utf8')) ?? {};
  const file = replace ?? fileNameFor(pub);
  await writeFile(path.join(PUB_DIR, file), toYaml(pub, { selected, keep }));
  return path.join('src/content/publications', file);
}

/** True when `match` (from byTitle) is an earlier version that this published record should replace. */
export const isUpgrade = (match, pub) => Boolean(match && ['preprint', 'under-review'].includes(match.status) && pub.status !== 'preprint');

/** ORCID iD from src/content/profile/profile.md. */
export async function orcidFromProfile() {
  const text = await readFile(path.join(ROOT, 'src/content/profile/profile.md'), 'utf8');
  return text.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/)?.[1];
}

/** All DOIs on a public ORCID record. */
export async function orcidDois(orcid) {
  const data = await getJson(`https://pub.orcid.org/v3.0/${orcid}/works`, { Accept: 'application/json' });
  const dois = new Set();
  for (const group of data?.group ?? []) {
    for (const id of group['external-ids']?.['external-id'] ?? []) {
      if (id['external-id-type'] === 'doi') dois.add(normalizeDoi(id['external-id-value']));
    }
  }
  return [...dois];
}
