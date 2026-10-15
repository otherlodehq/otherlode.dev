"""Generates the Otherlode badge.

The badge is a cartoon miner in pixel art: a helmet with a lit lamp, a red
beard and moustache, and crossed sticks of dynamite with lit fuses. Each
pixel is drawn by hand in GRID below.

Writes public/otherlode-badge.svg, which the site's header, footer and
favicon use, and the PNG renders the site needs: favicon-32.png,
apple-touch-icon.png and og-image.png. With --svg it writes the SVG to a
second path too, and with --pngs it writes transparent square renders at
fixed sizes for use outside the site. See README.md in this folder for how
to run it.
"""
import argparse
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# One character per pixel. '.' is transparent.
GRID = [
    '....K....................................K....',
    '...KYK..................................KYK...',
    '..KYyYK................................KYyYK..',
    '.k.KYK..................................KYK.k.',
    '.k..K............KKKKKKKKKKKK............K..k.',
    '.k............KKHHHHKjjjjKHHHHKK............k.',
    '.k..........KHHHWWHHKjjjjKHHHHHHHK..........k.',
    '.k........KHHhWWHHHHKjjjjKHHHHHHHHHK........k.',
    '.k..K....KHHHWHHHHHHKjjjjKHHHHHHHHHHK....K..k.',
    '.kKKKK..KHHHWHHHHHHHKKKKKKHHHHHHHHHHHK..KKKKk.',
    '..eeKRKKHHHWHHHHHHHKHHHHHHKHHHHHHHHHHHKKRKee..',
    '.KeKRrrKHHWHHHHHHHKHLLLLLLHKHHHHHHHHHHHrrRKeK.',
    '.KKRRRKHHWHHHHHHHHKHLLFFLLHKHHHHHHHHHHHKRRRKK.',
    '.KKdRRKHHWHHHHHHHHKHLFYYFLHKHHHHHHHHHHHKRRdKK.',
    '..KKRKHHWHHHHHHHHHKHLLFFLLHKHHHHHHHHHHHHKRKK..',
    '....KKHHWHHHHHHHHHHKHHHHHHKHHHHHHHHHHHHHKK....',
    '.....KHHHHHHHHHHHHHHKKKKKKHHHHHHHHHHHHHHK.....',
    '.....KHHHHHHHHHHHHHHKhhhhKHHHHHHHHHHHHHHK.....',
    '.....KHHHHHHHHHHKKKKKKKKKKKKKKHHHHHHHHHHK.....',
    '.....KHKKKKKKKwwwJJJJJJJJJJJJwwwKKKKKKKHK.....',
    '..KKKwwJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJwwKKK..',
    '..KJJJJJJJJJJMMMMMMMKKKKKKMMMMMMMJJJJJJJJJJK..',
    '..KJJJKKKKKKKMMMMMMMMSSSSMMMMMMMMKKKKKKKJJJK..',
    '...KKKBBBKSgMMMMMMgSSSSSSSSgMMMMMMgSKBBBKKK...',
    '....KBBBBBKSSggggSSSSKKKKSSSSggggSSKBBBBBK....',
    '....KBBBBBKSSSKKSSSSKNNNNKSSSSKKSSSKBBBBBK....',
    '....KBBBBBKSSKKEKSSKNNNNNnKSSKKEKSSKBBBBBK....',
    '....KBBBBBKSSKKKKSKNNNNNNnNKSKKKKSSKBBBBBK....',
    '.....KBBBBKSSSKKSSKNNNNNNNNKSSKKSSSKBBBBK.....',
    '.....KBBBBKCCCCSSSKNNNNNNNNKSSSCCCCKBBBBK.....',
    '.....KBBBBKSKKSKKSKKNNNNNNKKSKKSKKSKBBBBK.....',
    '.....KBBBBKKMMKMMKMMKKKKKKMMKMMKMMKKBBBBK.....',
    '......BBBKMMMMMMMMMMMMMMMMMMMMMMMMMMKBBB......',
    '......BBKMMMMMMMMMMMMMMMMMMMMMMMMMMMMKBB......',
    '......BKMMMMMMMMMKKKKKKKKKKKKMMMMMMMMMKB......',
    '......BKMMMMMMMMKTTTTTTTTTTTTKMMMMMMMMKB......',
    '......BBKMMMMMMKBKmmmmmmmmmmKBKMMMMMMKBB......',
    '.......KRKKMMKBBBBKmmttttmmKBBBBKMMKBKK.......',
    '.....KKKrKBKKBBBBBBKKKKKKKKBBBBBBKKBKrKKK.....',
    '....KccKRRKBBBBBBBBBBBBBBBBBBBBBBBBKRRKccK....',
    '...KKKccKRRKBBBBBBBBBBBBBBBBBBBBBBBKRKccKKK...',
    '..KRrKcccKKKBBBBBBBBBBBBBBBBBBBBBBKKKcccKrRK..',
    '.KRrRRKccK..KBBBBBBBBBBBBBBBBBBBK...KccKRRrRK.',
    '..KRRRdKK....KKBBBBBBBBBBBBBBBBK.....KKdRRRK..',
    '...KRdRK.......KBBBBBBBBBBBBBBK.......KRdRK...',
    '...KRRK.........KKKBBBBBBBBK...........KRRK...',
    '....KK.............KKBBKKKK.............KK....',
]

COLOURS = {
    'K': '#1f1a17',  # outline
    'k': '#3a302a',  # fuse
    'Y': '#ffcf4a',  # spark
    'y': '#fff4c2',  # spark centre
    'R': '#c8402f',  # dynamite
    'r': '#e46a58',  # dynamite highlight
    'd': '#9c2c20',  # dynamite shadow
    'e': '#e08a74',  # dynamite end
    'c': '#e9d9b4',  # dynamite band
    'H': '#a9b2b7',  # helmet
    'h': '#7c868c',  # lamp bracket
    'j': '#8f999f',  # helmet strap
    'W': '#e6ebed',  # helmet shine
    'J': '#949ea4',  # brim
    'w': '#d3d9dc',  # brim shine
    'L': '#efe0b4',  # lamp glass
    'F': '#f29a3a',  # flame
    'S': '#f2b68c',  # skin
    'C': '#e3876c',  # cheeks
    'N': '#eb9d82',  # nose
    'n': '#fbd0bf',  # nose shine
    'E': '#ffffff',  # eye shine
    'M': '#dc9660',  # brows and moustache
    'g': '#b9642f',  # under the brows
    'B': '#c46a34',  # beard
    'T': '#f3ecdc',  # teeth
    'm': '#5e211c',  # mouth
    't': '#c9605a',  # tongue
}

WIDTH = len(GRID[0])
HEIGHT = len(GRID)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)

# Brand PNG sizes, square. Each is the largest whole multiple of the grid
# that fits, centred, except the smallest, which is resampled.
BRAND_SIZES = (1024, 512, 256, 128, 64, 32)


def svg():
    """The badge as SVG, one path per colour, one screen pixel per pixel."""
    paths = []
    for key, colour in COLOURS.items():
        d = ''
        for y, row in enumerate(GRID):
            x = 0
            while x < WIDTH:
                if row[x] != key:
                    x += 1
                    continue
                n = 1
                while x + n < WIDTH and row[x + n] == key:
                    n += 1
                d += f'M{x} {y}h{n}v1h-{n}z'
                x += n
        if d:
            paths.append(f'<path fill="{colour}" d="{d}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" '
            f'width="{WIDTH}" height="{HEIGHT}">{"".join(paths)}</svg>\n')


def rgba(key):
    if key == '.':
        return CLEAR
    h = COLOURS[key]
    return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255)


def canvas(size, background, scale):
    """A square image with the badge centred at a whole number of screen pixels per pixel."""
    image = [[background] * size for _ in range(size)]
    left, top = (size - WIDTH * scale) // 2, (size - HEIGHT * scale) // 2
    for y, row in enumerate(GRID):
        for x, key in enumerate(row):
            if key == '.':
                continue
            colour = rgba(key)
            for dy in range(scale):
                line = image[top + y * scale + dy]
                for dx in range(scale):
                    line[left + x * scale + dx] = colour
    return image


def resampled(size):
    """The badge shrunk into a transparent square by averaging the pixels each output pixel covers."""
    side = max(WIDTH, HEIGHT)
    left, top = (side - WIDTH) / 2, (side - HEIGHT) / 2
    ratio = side / size
    image = []
    for oy in range(size):
        line = []
        for ox in range(size):
            x0, x1 = ox * ratio - left, (ox + 1) * ratio - left
            y0, y1 = oy * ratio - top, (oy + 1) * ratio - top
            r = g = b = a = 0.0
            for sy in range(max(0, int(y0)), min(HEIGHT, int(y1) + 1)):
                wy = min(y1, sy + 1) - max(y0, sy)
                if wy <= 0:
                    continue
                for sx in range(max(0, int(x0)), min(WIDTH, int(x1) + 1)):
                    wx = min(x1, sx + 1) - max(x0, sx)
                    if wx <= 0:
                        continue
                    cr, cg, cb, ca = rgba(GRID[sy][sx])
                    w = wx * wy * ca / 255
                    r, g, b, a = r + cr * w, g + cg * w, b + cb * w, a + w
            area = ratio * ratio
            line.append((round(r / a), round(g / a), round(b / a), round(255 * a / area)) if a else CLEAR)
        image.append(line)
    return image


def png(image):
    """PNG bytes for rows of RGBA tuples."""
    height, width = len(image), len(image[0])
    raw = b''.join(b'\x00' + bytes(v for px in row for v in px) for row in image)

    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))

    header = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) +
            chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, str):
        path.write_text(data)
    else:
        path.write_bytes(data)
    try:
        shown = path.resolve().relative_to(ROOT)
    except ValueError:
        shown = path
    print(f'wrote {shown}')


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--svg', type=Path, help='also write the SVG to this path')
    parser.add_argument('--pngs', type=Path, help='also write transparent square PNGs to this folder')
    args = parser.parse_args()

    assert all(len(row) == WIDTH for row in GRID), 'every row needs the same width'
    assert all(key in COLOURS or key == '.' for row in GRID for key in row), 'unknown colour key'

    badge = svg()
    public = ROOT / 'public'
    write(public / 'otherlode-badge.svg', badge)
    write(public / 'favicon-32.png', png(resampled(32)))
    # iOS fills a transparent touch icon with black, so it and the share
    # image sit on white.
    write(public / 'apple-touch-icon.png', png(canvas(180, WHITE, 3)))
    write(public / 'og-image.png', png(canvas(1024, WHITE, 18)))
    if args.svg:
        write(args.svg, badge)
    if args.pngs:
        for size in BRAND_SIZES:
            scale = size // max(WIDTH, HEIGHT)
            image = canvas(size, CLEAR, scale) if scale else resampled(size)
            write(args.pngs / f'otherlode-badge-{size}.png', png(image))


if __name__ == '__main__':
    main()
