import type { Author } from './authors';

export interface BibSource {
  key: string;
  title: string;
  authors: Author[];
  year: number;
  date?: string;
  type: string;
  status: string;
  venue?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
}

const STOP = new Set(['a', 'an', 'the', 'of', 'on', 'for', 'and', 'in', 'to', 'with', 'by', 'from', 'using']);
const asciiWord = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** {family}{year}{firstTitleWord}, e.g. rafieyan2024practical. */
export function baseKey(family: string, year: number, title: string) {
  const word = title.split(/[\s:–—-]+/).map(asciiWord).find((w) => w && !STOP.has(w)) ?? 'untitled';
  return `${asciiWord(family.split(/\s+/).at(-1) ?? family)}${year}${word}`;
}

const esc = (s: string) => s.replace(/([&%$#_])/g, '\\$1');

export function toBibtex(p: BibSource): string {
  const isThesis = p.type === 'thesis';
  const entryType =
    p.type === 'conference'
      ? 'inproceedings'
      : p.type === 'chapter'
        ? 'incollection'
        : isThesis
          ? /\bphd|doctoral/i.test(p.venue ?? '') ? 'phdthesis' : 'mastersthesis'
          : p.type === 'preprint' || p.status === 'under-review'
            ? 'misc'
            : 'article';

  const fields: [string, string | undefined][] = [
    ['title', `{${esc(p.title)}}`],
    ['author', p.authors.map((a) => (a.given ? `${a.family}, ${a.given}` : a.family)).join(' and ')],
    [entryType === 'article' ? 'journal' : entryType === 'inproceedings' || entryType === 'incollection' ? 'booktitle' : isThesis ? 'school' : 'howpublished', p.venue && esc(isThesis ? p.venue.replace(/^(msc|phd|master'?s|doctoral)\s+thesis,\s*/i, '') : p.venue)],
    ['year', String(p.year)],
    ['month', p.date && p.date.length >= 7 ? String(Number(p.date.slice(5, 7))) : undefined],
    ['volume', p.volume],
    ['number', p.issue],
    ['pages', p.pages?.replace(/[–—]/g, '--')],
    ['doi', p.doi],
    ['url', p.doi ? undefined : p.url],
    ['note', p.status === 'in-press' ? 'In press' : p.status === 'under-review' ? 'Manuscript under review' : undefined],
  ];
  const body = fields
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k.padEnd(9)} = {${v}}`)
    .join(',\n');
  return `@${entryType}{${p.key},\n${body}\n}`;
}
