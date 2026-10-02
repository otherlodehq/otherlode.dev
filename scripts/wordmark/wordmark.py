"""Generates the Otherlode wordmark's outlines.

The letters are drawn on a grid where the capitals are 8 units tall and
every stroke is 2 units wide. O, D and the bowl of R have their corners cut
at 45 degrees. All corners are then rounded slightly. OTHER is drawn as a
rim filled with hatching and LODE as solid letters, and one jagged crack
runs through the whole word.

Writes src/lib/wordmark.ts, which src/components/Wordmark.astro draws. With
--svg it also writes a standalone SVG in one colour, and with --lockup an SVG
of the badge beside the wordmark, for use outside the site. See README.md in
this folder for how to run it.
"""
import argparse
import re
from pathlib import Path

from shapely.geometry import Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]

CHAMFER = 1.5        # cut on the outer corners of O and the bowl of R
LETTER_GAP = 1.1     # space between letters
ROUND_OUTSIDE = 0.4  # radius that rounds the outside corners
ROUND_INSIDE = 0.15  # radius that rounds the inside corners
RIM = 0.45           # width of the rim around each hatched letter
HATCH_PITCH = 0.9    # distance between hatching lines
HATCH_LINE = 0.42    # width of a hatching line
CRACK_WIDTH = 0.7

# The crack, left to right, in grid units. It was drawn once with a seeded
# random walk around y = 5.6 and is kept as points so every build matches.
CRACK = [
    (-1, 5.6), (1.72, 5.11), (4.75, 6.18), (7.68, 5.03), (9.34, 5.98), (12.63, 5.15),
    (15.86, 5.83), (18.3, 5.32), (20.88, 6.02), (22.5, 5.33), (24.61, 6.16), (27.58, 5.35),
    (30.62, 5.84), (33.33, 5.37), (34.93, 6.15), (36.91, 5.33), (40.28, 6.15), (42.4, 5.02),
    (44.97, 6.06), (46.94, 5.02), (49.78, 6.19), (52.99, 5.29), (55.24, 5.85), (57.1, 5.39),
    (59.25, 6.03), (60.85, 5.14), (63.06, 5.91), (66.13, 5.22), (68.3, 5.98), (70.0, 5.4),
]


def rect(x0, y0, x1, y1):
    return Polygon([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])


def cut_corners(x0, y0, x1, y1, tl=0, tr=0, br=0, bl=0):
    """A rectangle with its corners cut at 45 degrees by the given amounts."""
    return Polygon([(x0 + tl, y0), (x1 - tr, y0), (x1, y0 + tr), (x1, y1 - br),
                    (x1 - br, y1), (x0 + bl, y1), (x0, y1 - bl), (x0, y0 + tl)])


# Each letter takes its left edge and returns its shape and width. y runs
# down, from 0 at the top of the capitals to 8 at the baseline.

def letter_o(x):
    c = CHAMFER
    return cut_corners(x, 0, x + 7, 8, c, c, c, c).difference(rect(x + 2, 2, x + 5, 6)), 7


def letter_t(x):
    return unary_union([rect(x, 0, x + 7, 2), rect(x + 2.5, 2, x + 4.5, 8)]), 7


def letter_h(x):
    return unary_union([rect(x, 0, x + 2, 8), rect(x + 5, 0, x + 7, 8), rect(x + 2, 3, x + 5, 5)]), 7


def letter_e(x):
    return unary_union([rect(x, 0, x + 2, 8), rect(x + 2, 0, x + 6, 2), rect(x + 2, 3, x + 5, 5),
                        rect(x + 2, 6, x + 6, 8)]), 6


def letter_r(x):
    bowl = cut_corners(x, 0, x + 7, 5, tr=CHAMFER).difference(rect(x + 2, 2, x + 5, 3))
    leg = Polygon([(x + 3, 5), (x + 5.2, 5), (x + 7.2, 8), (x + 5, 8)])
    return unary_union([bowl, rect(x, 5, x + 2, 8), leg]), 7.2


def letter_l(x):
    return unary_union([rect(x, 0, x + 2, 8), rect(x + 2, 6, x + 6, 8)]), 6


def letter_d(x):
    return cut_corners(x, 0, x + 7, 8, tr=2, br=2).difference(rect(x + 2, 2, x + 5, 6)), 7


WORD = [letter_o, letter_t, letter_h, letter_e, letter_r, letter_l, letter_o, letter_d, letter_e]
HATCHED = range(0, 5)  # OTHER


def soften(shape):
    """Rounds the outside corners, then the inside ones."""
    kw = dict(join_style='round', quad_segs=6)
    shape = shape.buffer(-ROUND_OUTSIDE, **kw).buffer(ROUND_OUTSIDE, **kw)
    return shape.buffer(ROUND_INSIDE, **kw).buffer(-ROUND_INSIDE, **kw)


def letters():
    """Each letter's softened shape, and the word's width."""
    x, shapes = 0, []
    for draw in WORD:
        shape, width = draw(x)
        shapes.append(soften(shape))
        x += width + LETTER_GAP
    return shapes, x - LETTER_GAP


def number(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return '0' if s in ('', '-0') else s


def path(shape):
    """SVG path data, with each hole wound against its outline."""
    shape = shape.simplify(0.004, preserve_topology=True)
    out = ''
    for poly in getattr(shape, 'geoms', [shape]):
        poly = orient(poly, -1.0)
        for ring in [poly.exterior, *poly.interiors]:
            out += 'M' + 'L'.join(f'{number(x)} {number(y)}' for x, y in list(ring.coords)[:-1]) + 'Z'
    return out


def build():
    shapes, width = letters()
    rims = [s.difference(s.buffer(-RIM, join_style='round', quad_segs=6)) for s in shapes]
    solid = ''.join(path(s) for i, s in enumerate(shapes) if i not in HATCHED)
    solid += ''.join(path(r) for i, r in enumerate(rims) if i in HATCHED)
    hatched = ''.join(path(s) for i, s in enumerate(shapes) if i in HATCHED)
    crack = ' '.join(f'{number(x)},{number(y)}' for x, y in CRACK)
    return round(width, 2), solid, hatched, crack


TS = """/**
 * Outlines for the wordmark in src/components/Wordmark.astro.
 *
 * Generated by scripts/wordmark/wordmark.py. Change the drawing there and
 * run it again rather than editing these numbers by hand.
 */

/** How wide the word is, in grid units. */
export const wordmarkWidth = {width};

/** LODE as solid letters, plus the outer rim of each letter in OTHER. */
export const solidPath =
  '{solid}';

/** The letters of OTHER, which are filled with hatching inside their rims. */
export const hatchedPath =
  '{hatched}';

/** The crack that runs through the whole word, as polyline points. */
export const crackPoints =
  '{crack}';
"""


def wordmark_parts(width, solid, hatched, crack, colour):
    """The wordmark's defs and drawing, in one colour, for a standalone SVG."""
    full = number(width + 2.4)
    defs = f"""<mask id="crack" maskUnits="userSpaceOnUse" x="-1" y="-1" width="{full}" height="10">
      <rect x="-1" y="-1" width="{full}" height="10" fill="#fff"/>
      <polyline points="{crack}" fill="none" stroke="#000" stroke-width="{CRACK_WIDTH}" stroke-linejoin="miter" stroke-miterlimit="10"/>
    </mask>
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="{HATCH_PITCH}" height="{HATCH_PITCH}" patternTransform="rotate(45)">
      <rect width="{HATCH_LINE}" height="{HATCH_PITCH}" fill="{colour}"/>
    </pattern>
    <clipPath id="other"><path d="{hatched}"/></clipPath>"""
    drawing = f"""<g mask="url(#crack)">
    <path fill="{colour}" d="{solid}"/>
    <rect clip-path="url(#other)" x="-1" y="-1" width="{full}" height="10" fill="url(#hatch)"/>
  </g>"""
    return defs, drawing


def svg(width, solid, hatched, crack, colour):
    """A standalone wordmark in one colour. The crack is transparent."""
    defs, drawing = wordmark_parts(width, solid, hatched, crack, colour)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.2 -0.2 {number(width + 0.4)} 8.4" role="img" aria-label="Otherlode">
  <title>Otherlode</title>
  <defs>
    {defs}
  </defs>
  {drawing}
</svg>
"""


# The lockup sets the badge beside the wordmark as the site header does: a
# 40 by 38 pixel badge, a 10 pixel gap and a 22 pixel high wordmark. In
# wordmark units, where the wordmark is 8.4 high, one pixel is 8.4 / 22.
PX = 8.4 / 22


def lockup(width, solid, hatched, crack, colour, badge_svg):
    """The badge and the wordmark side by side, in one SVG."""
    view_box = re.search(r'<svg[^>]*viewBox="([^"]+)"', badge_svg).group(1)
    inner = re.sub(r'^.*?<svg[^>]*>|</svg>\s*$', '', badge_svg, flags=re.S)
    badge_w, badge_h, gap = 40 * PX, 38 * PX, 10 * PX
    word_w = width + 0.4
    total_w, total_h = badge_w + gap + word_w, badge_h
    defs, drawing = wordmark_parts(width, solid, hatched, crack, colour)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {number(total_w)} {number(total_h)}" role="img" aria-label="Otherlode">
  <title>Otherlode</title>
  <defs>
    {defs}
  </defs>
  <svg x="0" y="0" width="{number(badge_w)}" height="{number(badge_h)}" viewBox="{view_box}">{inner}</svg>
  <g transform="translate({number(badge_w + gap + 0.2)} {number((badge_h - 8.4) / 2 + 0.2)})">
  {drawing}
  </g>
</svg>
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--svg', type=Path, help='also write a standalone SVG to this path')
    parser.add_argument('--lockup', type=Path, help='also write the badge and wordmark together to this path')
    parser.add_argument('--badge', type=Path, help='the badge SVG for --lockup')
    parser.add_argument('--colour', default='#172026', help='letter colour for --svg and --lockup')
    args = parser.parse_args()

    width, solid, hatched, crack = build()
    ts_path = ROOT / 'src/lib/wordmark.ts'
    ts_path.write_text(TS.format(width=width, solid=solid, hatched=hatched, crack=crack))
    print(f'wrote {ts_path.relative_to(ROOT)}')
    if args.svg:
        args.svg.write_text(svg(width, solid, hatched, crack, args.colour))
        print(f'wrote {args.svg}')
    if args.lockup:
        if not args.badge:
            parser.error('--lockup needs --badge')
        args.lockup.write_text(lockup(width, solid, hatched, crack, args.colour, args.badge.read_text()))
        print(f'wrote {args.lockup}')


if __name__ == '__main__':
    main()
