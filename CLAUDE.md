# otherlode.dev

## Copy and comments

Run the `humanizer` skill over any site copy, comment or doc comment
before treating it as finished. That means no em dashes and no stock AI
phrasing, such as "seamless," "robust," "leverage" or "crucial."

## Claims

Every claim on the site must be true of the shipped product today. Don't
describe a feature that is planned, partly built or only in a branch.
Don't invent numbers, customers or testimonials.

## Third parties, cookies and analytics

The privacy policy says the site sets no cookies and loads nothing from
third parties, and names where an early access request goes. Don't add a
third-party request, a cookie, analytics or a new place that form data
goes unless the same commit changes the privacy policy to match. Fonts,
images and scripts are self-hosted. The CSP in `public/_headers` has no
`'unsafe-inline'`, so keep styles and scripts in files; `npm run build`
fails on inline ones.

## Privacy policy

Write the privacy policy in plain English with short sentences. Change it
only to keep it factually accurate. Copy and style passes over the site
leave it alone, since every sentence there is a commitment.

## Docs

The docs at `/docs` come from four places. `src/content/docs/start/` is
written here. `agent/`, `collector/` and `server/` are copies of each
source repo's `docs/site/`, made by `scripts/sync-docs.sh`. Edit those
pages in their source repo, never here, or the next sync undoes it.

## Decisions

Each decision's reasoning, rejected options and consequences live in its
ADR under `docs/adr/`; a new decision gets a new ADR plus a line here.

- [0001](docs/adr/0001-the-docs-are-written-beside-the-code-and-published-here.md): Each repo writes its customer docs in `docs/site/`; a release or deploy opens a pull request that copies them to `/docs` here; the site's own layout and Pagefind, not Starlight; no inline scripts, with `'wasm-unsafe-eval'` added for Pagefind.
