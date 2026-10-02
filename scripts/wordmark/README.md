# The wordmark

`wordmark.py` draws the Otherlode wordmark and writes its outlines to
`src/lib/wordmark.ts`. `src/components/Wordmark.astro` draws them as an
inline SVG in the header and footer. The site build does not run this script.
Run it only when the drawing changes.

## The design

- Square capitals drawn on a grid: the capitals are 8 units tall and every
  stroke is 2 units wide. O, D and the bowl of R have their corners cut at
  45 degrees, and every corner is then rounded slightly.
- OTHER is a rim filled with diagonal hatching, like unworked ground on a
  geological section. LODE is solid.
- One jagged crack runs low through the whole word. Its points are fixed in
  the script, so every build draws the same crack.
- The letters take the text colour, so the wordmark follows light and dark
  mode. The crack and the gaps in the hatching show the page behind them.

The measurements are constants at the top of `wordmark.py`.

## Rebuild it

You need Python 3.10 or later.

```sh
python3 -m venv .venv-wordmark
.venv-wordmark/bin/pip install -r scripts/wordmark/requirements.txt
.venv-wordmark/bin/python scripts/wordmark/wordmark.py
```

That rewrites `src/lib/wordmark.ts`. Check the result with `npm run dev`.

For a standalone SVG to use outside the site, such as in a slide or on
another service, add `--svg` and, if needed, a colour:

```sh
.venv-wordmark/bin/python scripts/wordmark/wordmark.py --svg otherlode-wordmark.svg --colour '#172026'
```

The standalone file has one fixed colour, since it cannot follow the page's
theme. `--lockup` with `--badge` also writes the badge beside the wordmark,
spaced as in the site header.

Copies of both, in dark and light ink, with PNG renders, live in `brand/` in
the `otherlode-server` repo. Its `brand/README.md` has the commands that
make them.
