// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeTableScroll from './src/lib/rehype-table-scroll.mjs';

// The CSP in public/_headers allows only files from the site's own origin.
// It has no 'unsafe-inline' and allows no data: URLs. So Astro writes every
// stylesheet to a file, and Vite never inlines a small asset, such as a
// font subset, as a data: URL. `npm run build` runs scripts/check-csp.mjs
// after astro build, and the build fails if a page breaks these rules.
export default defineConfig({
  site: 'https://otherlode.dev',
  output: 'static',
  trailingSlash: 'never',
  build: {
    inlineStylesheets: 'never',
    format: 'file',
  },
  integrations: [
    sitemap({
      // The pages the contact form redirects to, the docs search and the
      // docs at a release's own URL carry noindex, so they stay out.
      filter: (page) => {
        const path = new URL(page).pathname;
        return !/\/(thanks|contact-problem)$/.test(path) && !/^\/docs\/(search$|[^/]+\/v\d+\.\d+\.\d+\/)/.test(path);
      },
    }),
  ],
  markdown: {
    // Shiki writes each token's colour into a style= attribute, which the
    // CSP blocks. Prism marks tokens with classes, and global.css colours
    // them.
    syntaxHighlight: 'prism',
    rehypePlugins: [rehypeTableScroll],
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      assetsInlineLimit: 0,
    },
  },
  devToolbar: { enabled: false },
});
