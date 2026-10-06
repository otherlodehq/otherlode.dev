#!/usr/bin/env bash
# Copies one source repo's docs/site/ folder into src/content/docs/<section>/
# and opens a pull request on this repo with the change, or updates the one
# already open. The source repos' release and deploy workflows run it from a
# checkout of this repo, so a page reaches the site only once its code has
# shipped and someone has merged the pull request.
#
#   scripts/sync-docs.sh <section> <source-dir> <label>
#
#   section     agent, collector or server
#   source-dir  the source repo's docs/site/ folder
#   label       what shipped, such as "otherlode-agent v0.1.0", for the
#               commit and the pull request
#
# It needs GH_TOKEN with contents and pull request write access to this
# repo, and a checkout whose origin can be pushed to.
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: scripts/sync-docs.sh <section> <source-dir> <label>" >&2
  exit 2
fi

section=$1
source_dir=$2
label=$3

case "$section" in
  agent | collector | server) ;;
  *)
    echo "sync-docs: unknown section '$section'; expected agent, collector or server" >&2
    exit 2
    ;;
esac

if [ ! -d "$source_dir" ]; then
  echo "sync-docs: $source_dir is not a directory" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
target="src/content/docs/$section"
branch="docs-sync/$section"

git fetch --quiet origin master
git checkout --quiet -B "$branch" origin/master

# The folder is replaced whole, so a page deleted at the source is deleted
# here. README.md explains the folder to contributors and is not a page.
rm -rf "$target"
mkdir -p "$target"
cp -R "$source_dir/." "$target/"
rm -f "$target/README.md"

git add --all "$target"
if git diff --cached --quiet; then
  echo "sync-docs: $target already matches $label; nothing to do"
  exit 0
fi

git -c user.name="otherlode-docs-sync" -c user.email="docs-sync@otherlode.dev" \
  commit --quiet -m "Sync the $section docs from $label"
git push --quiet --force origin "$branch"

title="Sync the $section docs from $label"
body="Copies \`docs/site/\` from $label into \`$target/\`. Merge it once that release is out."

existing=$(gh pr list --head "$branch" --base master --state open --json number --jq '.[0].number // empty')
if [ -n "$existing" ]; then
  gh pr edit "$existing" --title "$title" --body "$body"
  echo "sync-docs: updated pull request #$existing"
else
  gh pr create --head "$branch" --base master --title "$title" --body "$body"
fi
