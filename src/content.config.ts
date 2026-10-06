import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * The docs pages. Each folder under src/content/docs is one section of the
 * docs. `start` is written in this repo. The other folders are copied from
 * each source repo's docs/site/ folder by scripts/sync-docs.sh, so edit
 * them there, not here. A file whose name starts with `_` is left out.
 */
const docs = defineCollection({
  loader: glob({ base: './src/content/docs', pattern: '**/[^_]*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Where the page sits in its section's list. Lower comes first. */
    order: z.number().int().default(100),
  }),
});

export const collections = { docs };
