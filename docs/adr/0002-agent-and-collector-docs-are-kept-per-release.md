---
status: accepted
---

# Agent and collector docs are kept per release

Decided on 2026-10-06 with Luke.

The agent and the collector are released apart, each with its own `vX.Y.Z` tag, and people run older releases. So their docs keep one folder per release, such as `src/content/docs/agent/v0.2.0/`, written by the release's sync. The latest release reads at `/docs/agent/<page>`, and every release also reads at `/docs/agent/<version>/<page>`. Each page has a menu of releases and names the release that last changed it. Each section's changes page shows, for each release, the pages added, changed and removed against the release before it, with a line diff of the Markdown. The start and server sections have no versions: the server is hosted, so everyone runs the latest.

A release's docs are not frozen. Their only job is to describe that release's code, so a release folder is edited in this repo when it is wrong about that release. The sync copies a release's folder once and never replaces it, so a re-run of a release's job cannot undo a fix. The changes page compares the corrected pages.

## Considered options

- **One version number for the whole site.** Rejected: the agent and collector release apart, and the server has no releases, so no one number fits all three.
- **Store only what changed in each release.** Rejected: whole copies keep the sync and the build simple, and git stores identical files once.
- **Rebuild older releases from this repo's git history.** Rejected: it ties the build to a full clone, and Cloudflare's build may not have one.
- **Fix a release in its source repo and sync it again.** Rejected: a tag never moves, so the fix would need a hand run from a branch, and every re-run of a release's job would replace the folder and undo any fix made here.
- **Diff any two releases.** Deferred: a diff between each release and the one before covers what changed in a release. A diff of any pair needs either a page per pair or a script in the browser. Add it if people ask.

## Consequences

- A mistake found in an old release may also be in the source repo's `docs/site/`. The fix goes in both places, or the next release copies the mistake again.
- A page's footer names the file to edit: the release folder here for the agent and collector, the source repo for the server.
- Older releases' pages carry `noindex` and stay out of the sitemap and the search index, so search finds one copy of each page.
