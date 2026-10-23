// Serves each site-hosted paper PDF from its paper's own folder, e.g.
// /publications/2022-fan-review-recent/fan-2022-polymers-review.pdf. Google Scholar requires
// citation_pdf_url to sit in the same subdirectory as the abstract page, and PDFs under 5 MB.
// Uploads stay in public/files (Pages CMS); /files/ copies are marked noindex in vercel.json.
import type { APIRoute, GetStaticPaths } from 'astro';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPublications, pubHasPage } from '../../../lib/data';

export const getStaticPaths = (async () => {
  const pubs = await getPublications();
  return pubs
    .filter((p) => pubHasPage(p) && p.data.pdf?.startsWith('/files/'))
    .map((p) => ({
      params: { id: p.id, file: path.basename(p.data.pdf!, '.pdf') },
      props: { src: path.join(process.cwd(), 'public', p.data.pdf!) },
    }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const buf = await readFile(props.src as string);
  if (buf.byteLength > 5_000_000) {
    console.warn(`\x1b[33m[content warning]\x1b[0m ${props.src} is over 5 MB; Google Scholar ignores PDFs that large.`);
  }
  return new Response(buf, { headers: { 'Content-Type': 'application/pdf' } });
};
