export interface Author {
  given: string;
  family: string;
  /** "Given Family" */
  full: string;
  corresponding: boolean;
  equal: boolean;
  isOwner: boolean;
}

const ascii = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .trim();

/** "Given Family" or "Family, Given"; a trailing * marks the corresponding author, † equal contribution. */
export function parseAuthor(raw: string, ownerNames: string[] = []): Author {
  let s = raw.trim();
  const corresponding = /\*/.test(s);
  const equal = /†/.test(s);
  s = s.replace(/[*†]/g, '').trim();

  let given = '';
  let family = s;
  if (s.includes(',')) {
    [family, given] = s.split(',').map((p) => p.trim());
  } else {
    const parts = s.split(/\s+/);
    family = parts.pop() ?? s;
    given = parts.join(' ');
  }
  const full = [given, family].filter(Boolean).join(' ');
  return { given, family, full, corresponding, equal, isOwner: matchesOwner(given, family, ownerNames) };
}

function matchesOwner(given: string, family: string, ownerNames: string[]) {
  const fam = ascii(family).split(/[\s-]+/);
  const initial = ascii(given).charAt(0);
  return ownerNames.some((name) => {
    const tokens = ascii(name).split(/\s+/);
    const ownerFamily = tokens.at(-1) ?? '';
    return fam.includes(ownerFamily) && (!initial || tokens[0]?.charAt(0) === initial);
  });
}

/** "Rafieyan S" style, for compact lists. */
export function shortName(a: Author) {
  const initials = a.given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
  return initials ? `${a.family} ${initials}` : a.family;
}

export type AuthorSlot = Author | 'ellipsis';

/** Long author lists: first 3, the owner, and the last author, with ellipses between. */
export function truncateAuthors(authors: Author[], max = 8): { shown: AuthorSlot[]; hidden: number } {
  if (authors.length <= max) return { shown: authors, hidden: 0 };
  const keep = new Set([0, 1, 2, authors.length - 1]);
  const owner = authors.findIndex((a) => a.isOwner);
  if (owner >= 0) keep.add(owner);
  const shown: AuthorSlot[] = [];
  let last = -1;
  for (const i of [...keep].sort((a, b) => a - b)) {
    if (i - last > 1) shown.push('ellipsis');
    shown.push(authors[i]);
    last = i;
  }
  return { shown, hidden: authors.length - keep.size };
}

/** Compact lists: first 3, then the owner if later, then "et al." */
export function compactAuthors(authors: Author[], max = 6): { shown: Author[]; etAl: boolean } {
  if (authors.length <= max) return { shown: authors, etAl: false };
  const shown = authors.slice(0, 3);
  const owner = authors.find((a) => a.isOwner);
  if (owner && !shown.includes(owner)) shown.push(owner);
  return { shown, etAl: true };
}
