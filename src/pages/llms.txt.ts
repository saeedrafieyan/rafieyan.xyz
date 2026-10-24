// /llms.txt (https://llmstxt.org): a plain-text summary of the site for language-model tools.
// No search engine documents using it, but it is generated from the same content, so it costs nothing.
import type { APIRoute } from 'astro';
import {
  displayNameVariants,
  getProfile,
  getProjects,
  getPublications,
  projectHref,
  projectStatusLabel,
  pubHref,
  STATUS_LABELS,
  TYPE_LABELS,
  type Project,
} from '../lib/data';

export const GET: APIRoute = async ({ site }) => {
  const profile = await getProfile();
  const p = profile.data;
  const abs = (href: string) => new URL(href, site).href;
  const projects = (await getProjects()).filter((x) => x.data.tier !== 'minor');
  const pubs = (await getPublications()).filter((x) => x.data.status !== 'under-review');
  const variants = displayNameVariants(profile);
  const section = (heading: string, list: Project[]) =>
    list.length
      ? [
          `## ${heading}`,
          '',
          ...list.map((x) => {
            const name = x.data.full_name ? `${x.data.title} (${x.data.full_name})` : x.data.title;
            const status = projectStatusLabel(x);
            const summary = x.data.summary ? `: ${x.data.summary.replace(/\s+/g, ' ').trim()}` : '';
            return `- [${name}](${abs(projectHref(x))})${status ? ` (${status})` : ''}${summary}`;
          }),
          '',
        ]
      : [];

  const lines = [
    `# ${p.name}`,
    '',
    `> ${p.description ?? p.standfirst}`,
    '',
    `${p.name}${variants.length ? ` (also published as ${variants.join(', ')})` : ''} is a ${p.role}${p.group?.name ? ` in the ${p.group.name}` : ''} at the ${p.institute.name} (${p.institute.short}), ${p.city}.`,
    `Research themes: ${p.focus.map((f) => f.term).join('; ')}.`,
    p.profiles.orcid ? `ORCID: ${p.profiles.orcid}` : '',
    `Contact: ${p.email}`,
    '',
    '## Pages',
    '',
    `- [Home](${abs('/')}): research summary and themes, featured projects, selected publications`,
    `- [Publications](${abs('/publications/')}): all papers with abstracts and BibTeX ([BibTeX file](${abs('/publications.bib')}))`,
    `- [Projects](${abs('/projects/')}): current research, tools and resources`,
    `- [CV](${abs('/cv/')}): education, positions and skills`,
    `- [News](${abs('/news/')}): papers and releases ([RSS](${abs('/rss.xml')}))`,
    '',
    ...section('Current research', projects.filter((x) => x.data.category === 'research')),
    ...section('Tools and resources', projects.filter((x) => x.data.category === 'resource')),
    '## Publications',
    '',
    ...pubs.map((x) => {
      const d = x.data;
      const authors = x.authors.map((a) => a.full).join(', ');
      const status = STATUS_LABELS[d.status] ? ` ${STATUS_LABELS[d.status]}.` : '';
      return `- [${d.title}](${abs(pubHref(x) ?? '/publications/')}): ${authors}. ${d.venue ?? TYPE_LABELS[d.type]}, ${d.year}.${d.type !== 'article' && d.type !== 'thesis' ? ` ${TYPE_LABELS[d.type]}.` : ''}${status}${d.doi ? ` doi:${d.doi}` : ''}`;
    }),
    '',
  ];
  return new Response(lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
