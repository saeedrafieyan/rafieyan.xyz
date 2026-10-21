import type { APIRoute } from 'astro';
import { getPublications } from '../lib/data';

export const GET: APIRoute = async () => {
  const pubs = await getPublications();
  const body = pubs.map((p) => p.bibtex).join('\n\n') + '\n';
  return new Response(body, { headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' } });
};
