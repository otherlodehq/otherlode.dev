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
written here. `agent/`, `collector/` and `server/` are copied from each
source repo's `docs/site/` by `scripts/sync-docs.sh`. Edit `server/` in
its source repo, since the next sync replaces it. `agent/` and
`collector/` hold one folder per release. Fix a release's folder here
when it is wrong about that release, since its job is to describe that
release's code; the sync never replaces a release already on master. Put
the same fix in the source repo's `docs/site/` when it still applies, or
the next release copies the mistake again.

## Decisions

Each decision's reasoning, rejected options and consequences live in its
ADR under `docs/adr/`; a new decision gets a new ADR plus a line here.

- [0001](docs/adr/0001-the-docs-are-written-beside-the-code-and-published-here.md): Each repo writes its customer docs in `docs/site/`; a release or deploy opens a pull request that copies them to `/docs` here; the site's own layout and Pagefind, not Starlight; no inline scripts, with `'wasm-unsafe-eval'` added for Pagefind.
- [0002](docs/adr/0002-agent-and-collector-docs-are-kept-per-release.md): Agent and collector docs keep a folder per release, fixed here when wrong about that release and never replaced by a later sync; the latest reads without a version and every release with one; a release menu, a "changed in" line and a changes page with line diffs against the previous release; start and server docs have no versions.
