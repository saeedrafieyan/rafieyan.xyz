// Content-based "last modified" dates for the sitemap (and the home page's dateModified).
// Plain JS reading the content files directly, so astro.config.mjs can use it too. Dates come
// from the content itself (paper, news and CV dates), never from the build time.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

/** "2024" | "2024-07" | "2024-07-25" | Date → "2024-07-25T00:00:00Z" */
function iso(value) {
  if (!value) return undefined;
  if (value instanceof Date) return `${value.toISOString().slice(0, 10)}T00:00:00Z`;
  const s = String(value).trim();
  if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(s)) return undefined;
  const [y, m = '01', d = '01'] = s.split('-');
  return `${y}-${m}-${d}T00:00:00Z`;
}

const max = (...values) => values.filter(Boolean).sort().at(-1);

function frontMatter(file) {
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? (YAML.parse(match[1]) ?? {}) : {};
}

const list = (dir, ext) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => ({ id: f.replace(/\.[^.]+$/, ''), file: path.join(dir, f) }));

/** Map of URL pathname → ISO date. */
export function contentLastmod(root = process.cwd()) {
  const content = path.join(root, 'src/content');
  const map = {};

  const pubs = list(path.join(content, 'publications'), '.yaml').map(({ id, file }) => {
    const data = YAML.parse(readFileSync(file, 'utf8')) ?? {};
    return { id, data, date: iso(data.date ?? data.year) };
  });
  const published = pubs.filter((p) => p.data.status !== 'under-review');
  for (const p of published) map[`/publications/${p.id}/`] = p.date;
  const newestPaper = max(...published.map((p) => p.date));
  map['/publications/'] = newestPaper;

  const news = list(path.join(content, 'news'), '.md')
    .map(({ id, file }) => ({ id, data: frontMatter(file) }))
    .filter((n) => !n.data.draft);
  for (const n of news) map[`/news/${n.id}/`] = iso(n.data.date);
  const newestNews = max(...news.map((n) => iso(n.data.date)));
  map['/news/'] = newestNews;

  const projects = list(path.join(content, 'projects'), '.md').map(({ id, file }) => ({ id, data: frontMatter(file) }));
  for (const project of projects) {
    const versionIds = (project.data.versions ?? []).map((v) => v.publication);
    const related = published.filter((p) => (p.data.projects ?? []).includes(project.id) || versionIds.includes(p.id));
    const date = max(...related.map((p) => p.date));
    if (date) map[`/projects/${project.id}/`] = date;
  }
  map['/projects/'] = max(...projects.map((p) => map[`/projects/${p.id}/`]));

  const cv = YAML.parse(readFileSync(path.join(content, 'cv/cv.yaml'), 'utf8')) ?? {};
  map['/cv/'] = max(iso(cv.updated), newestPaper);

  const profile = frontMatter(path.join(content, 'profile/profile.md'));
  map['/'] = max(iso(profile.now?.date), newestNews, newestPaper, iso(cv.updated));

  return Object.fromEntries(Object.entries(map).filter(([, v]) => v));
}
