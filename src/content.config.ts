import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Every field here is edited through Pages CMS (.pages.yml) or by hand.
// A value that fails these checks stops the Vercel build with a readable
// message, and the live site keeps serving the previous version.

const blankToUndefined = (v: unknown) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v);

/** The CMS may save empty fields as null; drop them so defaults and optional() apply. */
const stripNulls = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.filter((x) => x !== null).map(stripNulls);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    return Object.fromEntries(
      Object.entries(v)
        .filter(([, x]) => x !== null)
        .map(([k, x]) => [k, stripNulls(x)]),
    );
  }
  return v;
};
const clean = <T extends z.ZodType>(schema: T) => z.preprocess(stripNulls, schema);
const optionalText = z.preprocess(blankToUndefined, z.string().trim().optional());
const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
const optionalUrl = z.preprocess((v) => blankToUndefined(trim(v)), z.url({ protocol: /^https?$/ }).optional());
// Site-relative path (/files/x.pdf) or full URL.
const optionalLink = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .refine((s) => s.startsWith('/') || /^https?:\/\//.test(s), 'must start with / or http(s)://')
    .optional(),
);

/** Accepts 2026, "2026-10", "2026-10-07" or a YAML date; stores "YYYY", "YYYY-MM" or "YYYY-MM-DD". */
const partialDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'number' ? String(v) : v),
  z
    .string()
    .trim()
    .regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'use YYYY, YYYY-MM or YYYY-MM-DD')
    .refine((s) => {
      const [y, m = 1, d = 1] = s.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
    }, 'not a real date (month 01–12, and the day must exist in that month)'),
);
const optionalPartialDate = z.preprocess(blankToUndefined, partialDate.optional());

/** Accepts a bare DOI, "doi:…" or a doi.org URL; stores the bare DOI. */
const doi = z.preprocess(
  (v) =>
    typeof v === 'string'
      ? v.trim().replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, '') || undefined
      : v,
  z
    .string()
    .regex(/^10\.\d{4,9}\/\S+$/, 'DOI should look like 10.1088/1758-5090/ad6374')
    .optional(),
);

const image = z.object({
  image: z.string().trim().min(1),
  alt: z.string().trim().min(1, 'every image needs alt text (describe it in a few words)'),
  caption: optionalText,
});
const optionalImage = z.preprocess(
  (v) => (v && typeof v === 'object' && !(v as { image?: string }).image ? undefined : v),
  image.optional(),
);

const profile = defineCollection({
  loader: glob({ pattern: 'profile.md', base: './src/content/profile' }),
  schema: clean(z.object({
    name: z.string(),
    alternate_names: z.array(z.string()).default([]),
    role: z.string(),
    city: z.string(),
    institute: z.object({ name: z.string(), short: z.string(), url: optionalUrl }),
    group: z.object({ name: z.string(), url: optionalUrl }).optional(),
    standfirst: z.string().max(240, 'keep the standfirst under 240 characters'),
    description: optionalText,
    now: z
      .object({ text: optionalText, date: optionalPartialDate })
      .optional()
      .transform((n) => (n?.text ? n : undefined)),
    email: z.preprocess(trim, z.email()),
    profiles: z
      .object({
        scholar: optionalUrl,
        orcid: optionalUrl,
        github: optionalUrl,
        linkedin: optionalUrl,
        scopus: optionalUrl,
        huggingface: optionalUrl,
        x: optionalUrl,
        telegram: optionalUrl,
      })
      .default({}),
    portrait: optionalImage,
    cv_pdf: optionalLink,
    focus: z
      .array(z.object({ term: z.string(), description: z.string(), topic: optionalText }))
      .default([]),
    also_exploring: z.array(z.string()).default([]),
    contact_note: optionalText,
  })),
});

const publications = defineCollection({
  loader: glob({ pattern: '*.{yaml,yml}', base: './src/content/publications' }),
  schema: clean(
    z.object({
      title: z.string().trim().min(1),
      // "Given Family" or "Family, Given". Add * for corresponding author, † for equal contribution.
      authors: z.array(z.string().trim().min(1)).min(1),
      year: z.coerce.number().int().min(1990).max(2100),
      date: optionalPartialDate,
      type: z.enum(['article', 'review', 'conference', 'preprint', 'thesis', 'chapter']).default('article'),
      status: z.enum(['published', 'in-press', 'under-review', 'preprint']).default('published'),
      venue: optionalText,
      volume: z.preprocess((v) => (v == null ? v : String(v)), optionalText),
      issue: z.preprocess((v) => (v == null ? v : String(v)), optionalText),
      pages: z.preprocess((v) => (v == null ? v : String(v)), optionalText),
      doi,
      url: optionalUrl,
      pdf: optionalLink,
      code: optionalUrl,
      data: optionalUrl,
      app: optionalUrl,
      abstract: optionalText,
      bibtex: optionalText,
      selected: z.boolean().default(false),
      topics: z.array(z.string()).default([]),
      projects: z.array(z.string()).default([]),
    }),
  ),
});

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: clean(z.object({
    title: z.string(),
    status: z.enum(['active', 'maintained', 'archived']).default('active'),
    tier: z.enum(['featured', 'standard', 'minor']).default('standard'),
    order: z.number().default(50),
    years: z.object({ start: z.coerce.number().int(), end: z.preprocess(blankToUndefined, z.coerce.number().int().optional()) }),
    summary: z.string().max(480, 'keep the summary under ~60 words'),
    facts: optionalText,
    role: optionalText,
    methods: optionalText,
    data: optionalText,
    licence: optionalText,
    links: z
      .object({ code: optionalUrl, app: optionalUrl, dataset: optionalUrl, model: optionalUrl, doi })
      .default({}),
    figure: optionalImage,
    versions: z
      .array(z.object({ version: z.string(), year: z.coerce.number().int(), scope: z.string(), publication: optionalText }))
      .default([]),
  })),
});

const news = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/news' }),
  schema: clean(z.object({
    date: z.coerce.date(),
    text: z.string().trim().min(1).max(280, 'keep news items under 280 characters; write a post for more'),
    link: optionalLink,
    link_label: optionalText,
    kind: z.enum(['paper', 'release', 'talk', 'award', 'position', 'note']).default('note'),
    title: optionalText,
    description: optionalText,
    draft: z.boolean().default(false),
  })),
});

const entry = z.object({
  role: z.string(),
  org: z.string(),
  org_url: optionalUrl,
  place: optionalText,
  start: partialDate,
  end: optionalPartialDate,
  thesis: optionalText,
  bullets: z.array(z.string()).default([]),
});

const cv = defineCollection({
  loader: glob({ pattern: 'cv.yaml', base: './src/content/cv' }),
  schema: clean(z.object({
    updated: z.coerce.date(),
    research: z.array(entry).default([]),
    education: z.array(entry).default([]),
    industry: z.array(entry).default([]),
    talks: z
      .array(z.object({ date: partialDate, title: z.string(), event: z.string(), place: optionalText, url: optionalUrl }))
      .default([]),
    awards: z.array(z.object({ year: z.coerce.number().int().optional(), text: z.string() })).default([]),
    service: z.array(z.string()).default([]),
    teaching: z.array(z.string()).default([]),
    skills: z.array(z.object({ group: z.string(), items: z.string() })).default([]),
    languages: z.array(z.object({ language: z.string(), level: z.string() })).default([]),
    memberships: z.array(z.string()).default([]),
    training: z
      .array(z.object({ name: z.string(), issuer: optionalText, year: z.coerce.number().int().optional(), url: optionalUrl }))
      .default([]),
    references: z
      .string()
      .refine((s) => !/@|\+?\d[\d\s().-]{7,}\d/.test(s), 'References are public: do not put emails or phone numbers here.')
      .default('Available on request.'),
  })),
});

export const collections = { profile, publications, projects, news, cv };
