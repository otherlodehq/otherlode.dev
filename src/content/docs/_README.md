# Docs content

Each folder here is one section of `/docs`. `start/` is written in this
repo. `agent/`, `collector/` and `server/` are copied from each source
repo's `docs/site/` by `scripts/sync-docs.sh`. Edit `server/` in its
source repo. `agent/` and `collector/` hold one folder per release, such
as `agent/v0.2.0/`. Fix a release's folder here when it is wrong about
that release. A file whose name starts with `_`,
like this one, is not a page. The site's README has the page format.
