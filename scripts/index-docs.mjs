// Builds the Pagefind search index for the docs into dist/pagefind/, after
// astro build. Only pages under /docs are indexed, and only the part of
// each page marked data-pagefind-body, so the sidebar and the marketing
// pages stay out of the results. With no docs pages there is nothing to
// index and no search page, so this does nothing.
import { access, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pagefind from 'pagefind';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

try {
  await access(join(distDir, 'docs.html'));
} catch {
  console.log('index-docs: dist/docs.html does not exist, so there is nothing to index.');
  process.exit(0);
}

const { index, errors } = await pagefind.createIndex();
if (!index) fail(errors);

const added = await index.addDirectory({ path: distDir, glob: 'docs/**/*.html' });
if (added.errors.length > 0) fail(added.errors);

const written = await index.writeFiles({ outputPath: join(distDir, 'pagefind') });
if (written.errors.length > 0) fail(written.errors);

await pagefind.close();

// Pagefind also writes its own search UIs. The site uses
// src/scripts/docs-search.ts instead, and their CSS has data: URLs the
// CSP blocks, so they are removed.
const outputDir = join(distDir, 'pagefind');
for (const file of await readdir(outputDir)) {
  if (/^pagefind-(.+-)?ui\.(js|css)$|^pagefind-highlight\.js$/.test(file)) {
    await rm(join(outputDir, file));
  }
}

console.log(`index-docs: indexed ${added.page_count} docs page(s).`);

function fail(problems) {
  console.error('index-docs: Pagefind failed:');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
