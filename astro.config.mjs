// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { contentLastmod } from './src/lib/lastmod.mjs';

// Sitemap <lastmod> from content dates (Bing and Google use it only when it reflects real changes).
const LASTMOD = contentLastmod();

// Variable fonts self-hosted from the @fontsource-variable npm packages (latin + latin-ext).
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

/** @param {string} pkg @param {string} file @param {string} weight @param {Array<'normal' | 'italic'>} styles */
const variants = (pkg, file, weight, styles) =>
  styles.flatMap((style) =>
    [
      ['latin', LATIN],
      ['latin-ext', LATIN_EXT],
    ].map(([subset, range]) => ({
      src: /** @type {[string]} */ ([`./node_modules/@fontsource-variable/${pkg}/files/${file}-${subset}-wght-${style}.woff2`]),
      weight,
      style,
      unicodeRange: /** @type {[string]} */ ([range]),
      display: /** @type {'swap'} */ ('swap'),
    })),
  );

export default defineConfig({
  site: 'https://rafieyan.xyz',
  trailingSlash: 'always',
  // Code blocks follow the site theme (light by default, dark colours via CSS variables).
  markdown: { shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } } },
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('/404/'),
      serialize(item) {
        const date = LASTMOD[new URL(item.url).pathname];
        if (date) item.lastmod = date;
        return item;
      },
    }),
  ],
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      options: { variants: /** @type {any} */ (variants('newsreader', 'newsreader', '200 800', ['normal', 'italic'])) },
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-plex',
      options: { variants: /** @type {any} */ (variants('ibm-plex-sans', 'ibm-plex-sans', '100 700', ['normal'])) },
      fallbacks: ['Arial', 'sans-serif'],
    },
  ],
});
