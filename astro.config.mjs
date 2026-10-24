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
      name: 'Inter',
      cssVariable: '--font-inter',
      options: { variants: /** @type {any} */ (variants('inter', 'inter', '100 900', ['normal', 'italic'])) },
      fallbacks: ['Arial', 'sans-serif'],
    },
    {
      // Display serif for the name and page/section headings only.
      provider: fontProviders.local(),
      name: 'Crimson Pro',
      cssVariable: '--font-crimson',
      options: { variants: /** @type {any} */ (variants('crimson-pro', 'crimson-pro', '200 900', ['normal'])) },
      fallbacks: ['Georgia', 'serif'],
    },
    {
      // DOIs, BibTeX and code.
      provider: fontProviders.local(),
      name: 'Atkinson Hyperlegible Mono',
      cssVariable: '--font-atkmono',
      options: {
        variants: /** @type {any} */ (variants('atkinson-hyperlegible-mono', 'atkinson-hyperlegible-mono', '200 800', ['normal'])),
      },
      fallbacks: ['Courier New', 'monospace'],
    },
  ],
});
