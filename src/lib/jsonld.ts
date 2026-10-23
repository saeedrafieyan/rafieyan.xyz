// schema.org JSON-LD, generated from the content collections. Every node describes something
// that is also visible on the page; the person is one @id that papers and projects point to.
import { parseAuthor } from './authors';
import type { Profile, Project, Publication } from './data';
import { displayNameVariants, pubHasPage, pubPdfHref } from './data';

type Node = Record<string, unknown>;

const abs = (path: string, site: URL) => new URL(path, site).href;

export const PERSON_ID = (site: URL) => abs('/#person', site);
export const WEBSITE_ID = (site: URL) => abs('/#website', site);

export const personRef = (site: URL, name: string): Node => ({ '@type': 'Person', '@id': PERSON_ID(site), name, url: site.href });

const LICENCES: Record<string, string> = {
  'cc by 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'cc-by-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  mit: 'https://opensource.org/license/mit',
};
export const licenceUrl = (text?: string) => (text ? LICENCES[text.trim().toLowerCase()] : undefined);

/** Drops undefined values and empty arrays so the output stays clean. */
function clean<T extends Node>(node: T): T {
  return Object.fromEntries(
    Object.entries(node).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)),
  ) as T;
}

interface Education {
  org: string;
  org_url?: string;
  end?: string;
}

export function personLd(profile: Profile, site: URL, education: Education[] = []): Node {
  const p = profile.data;
  const { given, family } = parseAuthor(p.name);
  const orcid = p.profiles.orcid?.split('/').pop();
  return clean({
    '@type': 'Person',
    '@id': PERSON_ID(site),
    name: p.name,
    givenName: given,
    familyName: family,
    alternateName: displayNameVariants(profile),
    description: p.description ?? p.standfirst,
    url: site.href,
    image: p.portrait ? abs(p.portrait.image, site) : undefined,
    email: `mailto:${p.email}`,
    jobTitle: p.role,
    identifier: orcid
      ? { '@type': 'PropertyValue', propertyID: 'ORCID', value: orcid, url: p.profiles.orcid }
      : undefined,
    affiliation: clean({
      '@type': 'ResearchOrganization',
      name: p.institute.name,
      alternateName: p.institute.short,
      url: p.institute.url,
      sameAs: p.institute.ror,
    }),
    memberOf: p.group ? clean({ '@type': 'Organization', name: p.group.name, url: p.group.url }) : undefined,
    alumniOf: education
      .filter((e) => e.end)
      .map((e) => clean({ '@type': 'CollegeOrUniversity', name: e.org, url: e.org_url })),
    knowsAbout: p.focus.map((f) => f.term),
    sameAs: Object.values(p.profiles).filter(Boolean),
  });
}

/** Home page: WebSite + ProfilePage + Person, one graph. */
export function homeGraph(profile: Profile, site: URL, education: Education[], dateModified?: string): Node {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      clean({
        '@type': 'WebSite',
        '@id': WEBSITE_ID(site),
        url: site.href,
        name: profile.data.name,
        inLanguage: 'en',
        publisher: { '@id': PERSON_ID(site) },
      }),
      clean({
        '@type': 'ProfilePage',
        '@id': abs('/#profile', site),
        url: site.href,
        name: `${profile.data.name} — ${profile.data.role}, ${profile.data.institute.short}`,
        isPartOf: { '@id': WEBSITE_ID(site) },
        mainEntity: { '@id': PERSON_ID(site) },
        dateModified,
      }),
      personLd(profile, site, education),
    ],
  };
}

const TYPE: Record<string, string> = { thesis: 'Thesis', chapter: 'Chapter' };

export function articleId(pub: Publication, site: URL) {
  return pubHasPage(pub) ? abs(`/publications/${pub.id}/#article`, site) : pub.data.doi ? `https://doi.org/${pub.data.doi}` : undefined;
}

export function articleLd(pub: Publication, site: URL, ownerName: string, withContext = false): Node {
  const d = pub.data;
  const pdf = pubPdfHref(pub);
  return clean({
    ...(withContext ? { '@context': 'https://schema.org' } : {}),
    '@type': TYPE[d.type] ?? 'ScholarlyArticle',
    '@id': articleId(pub, site),
    url: pubHasPage(pub) ? abs(`/publications/${pub.id}/`, site) : undefined,
    headline: d.title,
    name: d.title,
    datePublished: d.date ?? String(d.year),
    abstract: d.abstract,
    author: pub.authors.map((a) => (a.isOwner ? personRef(site, ownerName) : { '@type': 'Person', name: a.full })),
    isPartOf:
      d.venue && (d.type === 'article' || d.type === 'review')
        ? clean({ '@type': 'PublicationVolume', volumeNumber: d.volume, isPartOf: { '@type': 'Periodical', name: d.venue } })
        : undefined,
    ...(d.type === 'thesis' && d.venue ? { inSupportOf: d.venue } : {}),
    pagination: d.pages,
    identifier: d.doi ? { '@type': 'PropertyValue', propertyID: 'DOI', value: d.doi } : undefined,
    sameAs: d.doi ? `https://doi.org/${d.doi}` : d.url,
    encoding: pdf ? { '@type': 'MediaObject', contentUrl: abs(pdf, site), encodingFormat: 'application/pdf' } : undefined,
    creativeWorkStatus: d.status === 'in-press' ? 'In press' : undefined,
  });
}

export function projectLd(project: Project, related: Publication[], site: URL, ownerName: string): Node {
  const d = project.data;
  const url = abs(`/projects/${project.id}/`, site);
  const isCode = Boolean(d.links.code);
  return clean({
    '@context': 'https://schema.org',
    '@type': isCode ? 'SoftwareSourceCode' : 'CreativeWork',
    '@id': `${url}#project`,
    url,
    name: d.full_name ? `${d.title}: ${d.full_name}` : d.title,
    alternateName: d.full_name ? d.title : undefined,
    description: d.summary,
    author: personRef(site, ownerName),
    codeRepository: d.links.code,
    license: licenceUrl(d.licence),
    identifier: d.links.doi ? { '@type': 'PropertyValue', propertyID: 'DOI', value: d.links.doi } : undefined,
    sameAs: [d.links.model, d.links.app, d.links.doi ? `https://doi.org/${d.links.doi}` : undefined].filter(Boolean),
    dateCreated: String(d.years.start),
    citation: related.map((p) => articleId(p, site)).filter(Boolean).map((id) => ({ '@id': id })),
  });
}

export function breadcrumbs(site: URL, items: { name: string; path: string }[]): Node {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: abs(item.path, site) })),
  };
}
