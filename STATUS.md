# Status

Working notes on what is open and what is parked. Finished work lives in
`docs/adr/` and git history, not here.

## TODO

### A shot of the product on the landing page

Every figure on the landing page is a diagram: the call graph
(`CodePathsFigure`), the replicas merging (`ReplicasFigure`), code boxes
and a terminal. Nothing shows the product's own screen. One faithful
still of the real UI in `otherlode-server/web/` would show the product
exists. The code paths view or a list of what never ran, with its counts,
are the likely subjects.

Action: pull the closest example from the `stageshow` skill
(`benjitaylor/skills`, MIT) and use its rules to build the figure.

1. Clone `benjitaylor/skills` and run the `stageshow` playground
   (`npm install`, `npm run dev`). Film the closest gold example as the
   reference still. `static-card` fits a still: a hard crop, one
   satellite and real words only on the selected item. `fade-crop` fits a
   window that fades out at its foot.
2. Build the figure the way `CodePathsFigure` is built: Astro and SVG or
   CSS, the site's own tokens, ink borders and signal hatching. Take the
   example's composition (its crop, its hierarchy and its string budget),
   not its look.
3. Hold it to the skill's references: `craft.md` (3 to 7 real strings,
   filler elsewhere), `framing.md` (crop to the panel the story is in, no
   window floating on a plate) and, for any motion, `motion.md` (every
   move has a cause; the poster frame tells the story alone).
4. Check it with the skill's `film.mjs` at the shown width and at 390,
   beside the gold still.

Not the kit itself. It is React, which the site does not ship, and it
sets 87 inline styles, which the CSP and `check-csp.mjs` reject. Its
default look (quiet grays, rounded windows, soft shadows) would also read
as a template beside the site's.

The figure must match the shipped UI (see `CLAUDE.md`, Claims). When
`web/` changes what the pictured view shows, update the figure with it.
