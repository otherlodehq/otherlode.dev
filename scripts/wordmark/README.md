# The wordmark

`wordmark.py` draws the Otherlode wordmark and writes it to
`src/lib/wordmark.ts`. `src/components/Wordmark.astro` draws that as an
inline SVG in the header and footer. The site build does not run this script.
Run it only when the drawing changes.

## The design

- "otherlode" in lowercase 8-bit letters, drawn pixel by pixel for this
  name. Each letter is 7 pixels tall: 2 rows for ascenders and 5 for the
  height of an x. Letters are 1 pixel apart.
- "other" has strokes 2 pixels wide and "lode" strokes 1 pixel wide, so the
  name splits into its two words.
- The letters sit on a grey band 1 pixel wider than them on every side, like
  a line a coverage report marks as never run.
- The letters take the text colour and the band takes `--wordmark-band` from
  `src/styles/global.css`, so both follow light and dark mode.
- The whole wordmark is 9 pixels tall. Set its height to a multiple of 9
  screen pixels (18 or 27, say) so its pixels stay sharp.

The letters are drawn as rows of `#` and `.` at the top of `wordmark.py`.

## Rebuild it

You need Python 3.10 or later and nothing else.

```sh
python3 scripts/wordmark/wordmark.py
```

That rewrites `src/lib/wordmark.ts`. Check the result with `npm run dev`.

For a standalone SVG to use outside the site, such as in a slide or on
another service, add `--svg` and, if needed, the letter and band colours:

```sh
python3 scripts/wordmark/wordmark.py --svg otherlode-wordmark.svg --colour '#24201D' --band '#DDD7CE'
```

The standalone file has fixed colours, since it cannot follow the page's
theme. `--lockup` with `--badge` also writes the badge beside the wordmark,
spaced as in the site header.

The server's web UI draws the wordmark in its top bar from its own copy of
the module, `web/src/lib/wordmark.ts` in the `otherlode-server` repo. Write
that copy with `--ts`, with that repo checked out beside this one:

```sh
python3 scripts/wordmark/wordmark.py --ts ../otherlode-server/web/src/lib/wordmark.ts
```

Copies of the standalone SVG and the lockup, for light and dark backgrounds,
with PNG renders, live in `brand/` in the `otherlode-server` repo. Its
`brand/README.md` has the commands that make them.
