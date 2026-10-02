# otherlode.dev

The marketing site for Otherlode, at https://otherlode.dev. It is a static
Astro site styled with Tailwind CSS. It ships no client JavaScript.

## Run it

Use Node 22 (see `.nvmrc`).

```sh
npm install
npm run dev       # local server with reload, at http://localhost:4321
npm run build     # static build into dist/, then the CSP check
npm run preview   # serve dist/ locally
npm run verify    # astro check, then the build
```

`npm run build` runs `astro build` and then `scripts/check-csp.mjs`, so a
build that breaks the CSP fails, on Cloudflare's build too. The check parses
every page in `dist/` and fails on:

- an inline `<script>` without a `src`, a `<style>` element, a `style=`
  attribute or an inline event handler such as `onclick=`;
- a `javascript:` URL or a `data:` URL in any attribute;
- a `src`, `srcset` or `href` on `script`, `link`, `img`, `iframe` or
  `source` that points at another site. Plain `<a href>` links are allowed.

It also fails on a `data:` URL, an off-site `url()` or an off-site
`@import` in the built CSS. `npm run check:csp` runs the check alone on an
existing `dist/`.

## Layout

- `src/layouts/Base.astro`: the page shell, with the head, meta and Open Graph tags and the canonical URL.
- `src/layouts/Prose.astro`: the layout for long text pages written in Markdown, such as `src/pages/privacy.md`.
- `src/components/`: the shared header, footer and the mountain ridge.
- `src/styles/global.css`: Tailwind and the colour tokens, which follow the product UI's tokens.
- `public/_headers`: the security headers Cloudflare sends, including the Content-Security-Policy.
- `wrangler.jsonc`: the Cloudflare Worker that serves `dist/`. It runs no code.

## Deploy

Cloudflare Workers Builds builds the site from GitHub on every push to
`master` and deploys it as an assets-only Worker, `otherlode-dev`, set
up in `wrangler.jsonc`. Cloudflare Pages is deprecated in favour of
Workers static assets.

| Setting | Value |
|---|---|
| Production branch | `master` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | 22.12 or later (`NODE_VERSION` in the build settings) |

`html_handling` serves `privacy.html` at `/privacy`, and
`not_found_handling` serves `404.html` with status 404. The
`workers.dev` addresses send `X-Robots-Tag: noindex`, so only
`otherlode.dev` is indexed.

### Cloudflare settings that would break the privacy policy

Some Cloudflare features change pages on the way out. Keep these off for
the `otherlode.dev` zone and the Worker:

- **Email Address Obfuscation** (Scrape Shield). It injects a script from
  `/cdn-cgi/` and rewrites `mailto:` links. The script is same-origin, so
  the CSP allows it, and the site would no longer ship without scripts.
- **Bot Fight Mode** (Security, Bots). It sets a `__cf_bm` cookie.
- **Web Analytics** on the Worker, and **Rocket Loader**. Both
  inject scripts, and Web Analytics loads one from
  `static.cloudflareinsights.com`.

The privacy policy says the site sets no cookies, runs no analytics and
loads nothing from other sites, so any of these would make it false.

### Check after each deploy

Fetch the live pages as a browser would and look for a cookie or any
script. The site ships no `<script>` tag at all, so any match was added on
the way out. This should print nothing:

```sh
ua='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
for path in / /privacy /no-such-page; do
  curl -sS -A "$ua" -H 'Accept: text/html' -D /tmp/otl-headers -o /tmp/otl-page "https://otherlode.dev$path"
  grep -i '^set-cookie:' /tmp/otl-headers && echo "cookie on $path"
  grep -Eio '<script[^>]*>|cloudflareinsights|/cdn-cgi/' /tmp/otl-page && echo "script on $path"
done
```

Then check that the security headers arrived:

```sh
curl -sSI https://otherlode.dev/ | grep -iE '^(content-security-policy|strict-transport-security):'
```

## No third parties, no cookies

The site loads nothing from a third party and sets no cookies. The privacy
policy says so, so it has to stay true. Fonts are self-hosted through
Fontsource. There is no analytics, no embed and no CDN. The CSP in
`public/_headers` allows only the site's own origin.

A change that adds a third-party request, a cookie or analytics must
update the privacy policy in the same commit.

## Docs

Product docs will live in this repo at `/docs`, built with Starlight. It
gets installed when the first docs page is written, not before. Starlight
needs CSP work first: its theme switcher runs an inline script and its
search (Pagefind) loads scripts and WebAssembly. Both need changes to the
CSP in `public/_headers` and to `scripts/check-csp.mjs`, made on purpose
in the same commit.
