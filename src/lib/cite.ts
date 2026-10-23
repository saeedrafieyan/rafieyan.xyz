import { shortName } from './authors';
import type { Publication } from './data';

/** One-line Vancouver-style reference, e.g. "Rafieyan S, Ansari E. Title. Journal. 2024;16(4):045014. doi:…" */
export function vancouver(pub: Publication): string {
  const d = pub.data;
  const names = pub.authors.map(shortName);
  const authors = names.length > 6 ? `${names.slice(0, 6).join(', ')}, et al` : names.join(', ');
  const title = d.title.replace(/[.\s]+$/, '');
  const issue = [d.volume, d.issue ? `(${d.issue})` : ''].join('');
  const where =
    d.type === 'thesis'
      ? `${d.venue ?? 'Thesis'}; ${d.year}`
      : `${d.venue ?? ''}. ${d.year}${issue ? `;${issue}` : ''}${d.pages ? `:${d.pages}` : ''}`;
  const status = d.status === 'in-press' ? ' In press.' : '';
  return `${authors}. ${title}. ${where}.${status}${d.doi ? ` doi:${d.doi}` : ''}`;
}
