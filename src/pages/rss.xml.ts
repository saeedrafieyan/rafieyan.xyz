import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getNews, getProfile, newsIsPost } from '../lib/data';

export const GET: APIRoute = async ({ site }) => {
  const { data: profile } = await getProfile();
  const news = await getNews();
  return rss({
    title: `${profile.name} — news`,
    description: profile.standfirst,
    site: site!,
    items: news.map((n) => ({
      title: n.data.title ?? n.data.text,
      description: n.data.description ?? n.data.text,
      pubDate: n.data.date,
      link: newsIsPost(n) ? `/news/${n.id}/` : (n.data.link ?? '/news/'),
    })),
  });
};
