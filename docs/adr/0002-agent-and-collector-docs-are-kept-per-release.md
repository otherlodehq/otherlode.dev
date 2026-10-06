---
status: accepted
---

# Agent and collector docs are kept per release

Decided on 2026-10-06 with Luke.

The agent and the collector are released apart, each with its own `vX.Y.Z` tag, and people run older releases. So their docs keep one folder per release, such as `src/content/docs/agent/v0.2.0/`, written by the release's sync. The latest release reads at `/docs/agent/<page>`, and every release also reads at `/docs/agent/<version>/<page>`. Each page has a menu of releases and names the release that last changed it. Each section's changes page shows, for each release, the pages added, changed and removed against the release before it, with a line diff of the Markdown. The start and server sections have no versions: the server is hosted, so everyone runs the latest.

## Considered options

- **One version number for the whole site.** Rejected: the agent and collector release apart, and the server has no releases, so no one number fits all three.
- **Store only what changed in each release.** Rejected: whole copies keep the sync and the build simple, and git stores identical files once.
- **Rebuild older releases from this repo's git history.** Rejected: it ties the build to a full clone, and Cloudflare's build may not have one.
- **Diff any two releases.** Deferred: a diff between each release and the one before covers what changed in a release. A diff of any pair needs either a page per pair or a script in the browser. Add it if people ask.

## Consequences

- A fix to a released version's docs is a hand run of `scripts/sync-docs.sh` for that version, since a tag never moves.
- Older releases' pages carry `noindex` and stay out of the sitemap and the search index, so search finds one copy of each page.
