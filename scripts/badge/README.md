# The badge

`badge.py` draws the Otherlode badge and writes it to `public/`. The site
build does not run this script. Run it only when the drawing changes.

## The design

- A cartoon miner in pixel art, 46 pixels wide and 47 tall: a grey helmet
  with a lit lamp, black eyes with a white shine, a round nose, a tan
  moustache, an open smile and a red beard.
- Crossed sticks of red dynamite sit behind him, with lit fuses at the top
  corners.
- Each pixel is one character in `GRID` at the top of `badge.py`, and
  `COLOURS` maps each character to its colour.
- Show it at a whole number of screen pixels to each of its pixels, such as
  46 by 47 or 92 by 94, so its pixels stay sharp. The header and footer show
  it at 46 by 47.

`otherlode-badge-original.svg` is the drawing the pixels were made from. It
is kept for reference only, and nothing uses it.

## Rebuild it

You need Python 3.10 or later and nothing else.

```sh
python3 scripts/badge/badge.py
```

That rewrites these files in `public/`:

- `otherlode-badge.svg`: the badge, which the header, the footer and the
  favicon use.
- `favicon-32.png`: the badge shrunk to 32 pixels, for browsers that cannot
  take an SVG favicon.
- `apple-touch-icon.png` and `og-image.png`: the badge on white, 180 and
  1024 pixels square. iOS fills a transparent touch icon with black.

The server's web UI and the PNGs in `brand/` in the `otherlode-server` repo
use the same badge. Write those copies with `--svg` and `--pngs`, with that
repo checked out beside this one:

```sh
python3 scripts/badge/badge.py --svg ../otherlode-server/web/src/assets/otherlode-badge.svg --pngs ../otherlode-server/brand
```

The PNGs are transparent squares at 1024, 512, 256, 128, 64 and 32 pixels.
Each shows the badge at the largest whole number of screen pixels to each
pixel that fits. The 32 pixel one is shrunk by averaging, so it is soft.
Then write the lockups again, as `brand/README.md` in that repo describes.
