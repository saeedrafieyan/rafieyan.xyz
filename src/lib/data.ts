import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { parseAuthor, type Author } from './authors';
import { baseKey, toBibtex } from './bibtex';
import { daysSince, partialKey } from './dates';

export type Profile = CollectionEntry<'profile'>;
export type Project = CollectionEntry<'projects'>;
export type NewsItem = CollectionEntry<'news'>;

export interface Publication {
  id: string;
  /** Stable chronological number, oldest = 1. Filtering never renumbers. */
  n: number;
  key: string;
  bibtex: string;
  authors: Author[];
  firstAuthor: boolean;
  sortKey: string;
  data: CollectionEntry<'publications'>['data'];
}

export const TYPE_LABELS: Record<string, string> = {
  article: 'Journal article',
  review: 'Review',
  conference: 'Conference paper',
  preprint: 'Preprint',
  thesis: 'Thesis',
  chapter: 'Book chapter',
};

export const STATUS_LABELS: Record<string, string> = {
  'ahead-of-print': 'Online ahead of print',
  'in-press': 'In press',
  'under-review': 'Under review',
  preprint: 'Preprint',
};

const warned = new Set<string>();
function warn(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`\x1b[33m[content warning]\x1b[0m ${message}`);
}

export async function getProfile(): Promise<Profile> {
  const profile = await getEntry('profile', 'profile');
  if (!profile) throw new Error('src/content/profile/profile.md is missing.');
  const now = profile.data.now;
  if (now?.date && daysSince(now.date) > 120) {
    warn(`The "Now" line on the home page is dated ${now.date}; update or clear it (Profile → Now).`);
  }
  return profile;
}

export const ownerNames = (p: Profile) => [p.data.name, ...p.data.alternate_names];

/** Full alternative spellings worth showing (drops initials-only forms such as "Rafieyan, S."). */
export const displayNameVariants = (p: Profile) =>
  p.data.alternate_names.filter((n) => parseAuthor(n).given.replace(/[.\s-]/g, '').length > 1);

let pubCache: Publication[] | undefined;

/** All publications, newest first, with numbering, BibTeX keys and owner checks. */
export async function getPublications(): Promise<Publication[]> {
  if (pubCache) return pubCache;
  const profile = await getProfile();
  const names = ownerNames(profile);
  const entries = await getCollection('publications');

  const items = entries.map((e) => {
    const authors = e.data.authors.map((a) => parseAuthor(a, names));
    if (!authors.some((a) => a.isOwner)) {
      throw new Error(
        `Publication "${e.id}": none of the authors matches ${names.join(' / ')}. ` +
          `Check the spelling, or add the variant to alternate_names in the profile.`,
      );
    }
    if (e.data.status !== 'under-review' && !e.data.abstract && !e.data.pdf) {
      warn(`Publication "${e.id}" has neither an abstract nor a PDF, so it gets no page of its own and Google Scholar can't index it.`);
    }
    if (!e.data.venue && e.data.status !== 'under-review') {
      warn(`Publication "${e.id}" has no journal / venue; add one in Publications → ${e.data.title.slice(0, 40)}…`);
    }
    return {
      id: e.id,
      authors,
      firstAuthor: authors[0].isOwner,
      // Year first, so numbering, list order and year groups agree even if the online date is earlier.
      sortKey: e.data.status === 'under-review' ? '9999' : `${e.data.year}|${partialKey(e.data.date, e.data.year)}`,
      data: e.data,
    };
  });

  // Chronological numbering: oldest = 1.
  const chrono = [...items].sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.id.localeCompare(b.id));
  const seen = new Map<string, number>();
  pubCache = chrono
    .map((p, i) => {
      const base = baseKey(p.authors[0].family, p.data.year, p.data.title);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const key = count ? `${base}${String.fromCharCode(97 + count)}` : base;
      const bibtex =
        p.data.bibtex ??
        toBibtex({ key, ...p.data, authors: p.authors });
      return { ...p, n: i + 1, key, bibtex };
    })
    .reverse();
  return pubCache;
}

export async function getProjects(): Promise<Project[]> {
  const tierRank = { featured: 0, standard: 1, minor: 2 };
  const projects = await getCollection('projects');
  const pubs = await getPublications();
  const pubIds = new Set(pubs.map((p) => p.id));
  const projectIds = new Set(projects.map((p) => p.id));
  for (const p of projects) {
    const missing = p.data.versions.filter((v) => v.publication && !pubIds.has(v.publication));
    if (missing.length) {
      throw new Error(
        `Project "${p.id}": version ${missing.map((v) => v.version).join(', ')} points to a publication that does not exist ` +
          `(${missing.map((v) => v.publication).join(', ')}). Use the publication's file name without .yaml.`,
      );
    }
  }
  for (const pub of pubs) {
    const bad = pub.data.projects.filter((id) => !projectIds.has(id));
    if (bad.length) {
      throw new Error(`Publication "${pub.id}": project ${bad.join(', ')} does not exist. Use the project's file name without .md.`);
    }
  }
  return projects.sort(
    (a, b) =>
      tierRank[a.data.tier] - tierRank[b.data.tier] ||
      a.data.order - b.data.order ||
      (b.data.years?.start ?? 0) - (a.data.years?.start ?? 0),
  );
}

/** A project gets its own page only when it has page text; the rest are entries on /projects/. */
export const projectHasPage = (p: Project) => Boolean(p.body?.trim());

/** The project's page, or its entry on the Projects page. */
export const projectHref = (p: Project) => (projectHasPage(p) ? `/projects/${p.id}/` : `/projects/#${p.id}`);

/** Code, app, model, dataset or DOI: something public a visitor can open. */
export const projectHasPublicLink = (p: Project) => Object.values(p.data.links).some(Boolean);

const PROJECT_STATUS_LABELS: Record<string, string> = { active: 'Active', maintained: 'Maintained', archived: 'Archived' };
export const projectStatusLabel = (p: Project) => p.data.status_label ?? PROJECT_STATUS_LABELS[p.data.status];

/** "2022–present", "2019–2021", or undefined when no years are given. */
export const projectYears = (p: Project) =>
  p.data.years ? `${p.data.years.start}–${p.data.years.end ?? 'present'}` : undefined;

/**
 * Counts by type for a set of papers, from the data: "3 articles + MSc thesis", "2 reviews".
 * Papers under review are left out.
 */
export function pubCountLabel(pubs: Publication[]): string {
  const order = ['article', 'review', 'conference', 'chapter', 'preprint', 'thesis'];
  const words: Record<string, [string, string]> = {
    article: ['article', 'articles'],
    review: ['review', 'reviews'],
    conference: ['conference paper', 'conference papers'],
    chapter: ['book chapter', 'book chapters'],
    preprint: ['preprint', 'preprints'],
    thesis: ['thesis', 'theses'],
  };
  const counted = pubs.filter((p) => p.data.status !== 'under-review');
  return order
    .map((type) => {
      const items = counted.filter((p) => p.data.type === type);
      if (!items.length) return '';
      if (type === 'thesis' && items.length === 1) {
        const degree = items[0].data.venue?.match(/^(msc|phd)\b/i)?.[1].toLowerCase();
        return degree === 'msc' ? 'MSc thesis' : degree === 'phd' ? 'PhD thesis' : '1 thesis';
      }
      const [one, many] = words[type];
      return `${items.length} ${items.length === 1 ? one : many}`;
    })
    .filter(Boolean)
    .join(' + ');
}

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
const titleCase = (s: string) =>
  s.replace(/\S+/g, (w, i: number) => (i > 0 && SMALL_WORDS.has(w) ? w : w[0].toUpperCase() + w.slice(1)));

/** Browser-tab title of the home page: "Saeed Rafieyan | AI for Biomaterials and Tissue Engineering". */
export const homeTitle = (p: Profile) =>
  p.data.tagline ? `${p.data.name} | ${titleCase(p.data.tagline.replace(/\.$/, ''))}` : p.data.name;

/**
 * Each paper with an abstract or a PDF gets its own page (/publications/<id>/): one URL per
 * paper with a visible abstract is what Google Scholar indexes and what search engines can cite.
 */
export const pubHasPage = (p: Publication) => p.data.status !== 'under-review' && Boolean(p.data.abstract || p.data.pdf);

/** Where a paper's title links: its own page, else the DOI, article URL or PDF. */
export const pubHref = (p: Publication) =>
  pubHasPage(p) ? `/publications/${p.id}/` : p.data.doi ? `https://doi.org/${p.data.doi}` : (p.data.url ?? p.data.pdf);

/** Site-hosted PDFs are served from the paper's own folder (Scholar wants them next to the abstract page). */
export const pubPdfHref = (p: Publication) =>
  p.data.pdf?.startsWith('/files/') && pubHasPage(p) ? `/publications/${p.id}/${path.basename(p.data.pdf)}` : p.data.pdf;

export async function getNews(): Promise<NewsItem[]> {
  return (await getCollection('news', (n) => !n.data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
}

/** A news item with a title and a body gets its own page (a short post). */
export const newsIsPost = (n: NewsItem) => Boolean(n.data.title && n.body?.trim());

export async function getCv() {
  const cv = await getEntry('cv', 'cv');
  if (!cv) throw new Error('src/content/cv/cv.yaml is missing.');
  const latestDate =
    (await getPublications())
      .filter((p) => p.data.status !== 'under-review')
      .map((p) => p.data.date ?? String(p.data.year))
      .sort()
      .at(-1) ?? '';
  if (latestDate && cv.data.updated.toISOString().slice(0, 10) < latestDate.slice(0, 10)) {
    warn(`The CV "updated" date is older than your newest publication (${latestDate}). Check the CV and bump the date.`);
  }
  return cv;
}

/** Number of publications per topic slug. */
export async function topicCounts() {
  const counts = new Map<string, number>();
  for (const p of await getPublications()) for (const t of p.data.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
  return counts;
}

let lastUpdated: Date | undefined;
/** Date of the last commit (falls back to build time). */
export function siteUpdated(): Date {
  if (lastUpdated) return lastUpdated;
  try {
    lastUpdated = new Date(execSync('git log -1 --format=%cI', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim());
    if (Number.isNaN(lastUpdated.getTime())) throw new Error();
  } catch {
    lastUpdated = new Date();
  }
  return lastUpdated;
}

/** Strips the scheme for display: https://mlate.ir/ → mlate.ir */
export const displayUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
