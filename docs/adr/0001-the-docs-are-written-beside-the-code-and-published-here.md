---
status: accepted
---

# The docs are written beside the code and published here

Decided on 2026-10-06 with Luke.

Each part's customer docs live in the repo that ships that part, in `docs/site/`, so a pull request that changes behaviour changes its page too. The site serves them at `/docs`. The overview and quickstart cover every part, so they live here in `src/content/docs/start/`. Operator material, such as the GCP deploy, database roles and the admin CLI, stays in each repo's README.

A source repo's release or deploy workflow runs `scripts/sync-docs.sh`. The script copies `docs/site/` into `src/content/docs/<section>/` and opens a pull request here. A page reaches the site only after its code has shipped and someone has merged that pull request. This keeps the site's rule that every claim is true of the shipped product.

The docs use this site's own layout and Pagefind for search. The site keeps its CSP with no inline script, style or `data:` URL. `script-src` gains `'wasm-unsafe-eval'` for Pagefind's WebAssembly, and nothing else changes.

## Considered options

- **Docs written only in this repo.** Rejected: the pages would drift from the code. The READMEs already hold most of the facts, and they sit beside the code for that reason.
- **Fetch each repo's docs while Cloudflare builds the site.** Rejected: `otherlode-server` is private, so the build would need a GitHub token in Cloudflare. Text nobody reviewed here would go live, and the build would fail whenever GitHub is down.
- **Starlight.** Rejected for now. Its theme, sidebar, search and tabs components each put an inline script in the page, which the CSP and `scripts/check-csp.mjs` refuse. Replacing those components leaves little of Starlight, and every upgrade would need the replacements checked again. It is worth another look if the docs need versions or translations.
- **Allow inline scripts on this site, since the app is the sensitive one.** Rejected: the app at `app.otherlode.dev` already allows no inline script, so this site already matches it. Nothing the docs need calls for an inline script, and synced Markdown can carry raw HTML. The CSP and the build check stop a stray `<script>` in a synced page.
- **Algolia DocSearch.** Rejected: it loads from a third party, and the privacy policy says the site loads nothing from other sites.

## Consequences

- Shiki is off, since it writes a `style=` attribute on every token. Prism colours code blocks with classes.
- `/docs`, `/docs/search` and the header's Docs link are built only once a page exists.
- Each source repo needs the secret `OTHERLODE_DEV_DOCS_TOKEN`, scoped to write this repo's contents and pull requests. Without it the sync job does nothing.
