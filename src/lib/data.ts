import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { execSync } from 'node:child_process';
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
      b.data.years.start - a.data.years.start,
  );
}

export const projectHasPage = (p: Project) => Boolean(p.body?.trim());

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
