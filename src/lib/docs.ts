import { getCollection, type CollectionEntry } from 'astro:content';

/** One docs page as the content collection loads it. */
export type DocsPage = CollectionEntry<'docs'>;

/** A section of the docs, which is one folder under src/content/docs. */
export interface DocsSection {
  /** The folder name, which is also the first part of each page's path. */
  id: string;
  /** The heading the sidebar shows. */
  title: string;
  /** The repo and folder the pages come from, shown at the foot of each page. */
  source: { repo: string; path: string };
}

/** The sections in the order the sidebar lists them. */
export const docsSections: DocsSection[] = [
  { id: 'start', title: 'Start', source: { repo: 'otherlode.dev', path: 'src/content/docs/start' } },
  { id: 'agent', title: 'Agent', source: { repo: 'otherlode-agent', path: 'docs/site' } },
  { id: 'collector', title: 'Collector', source: { repo: 'otherlode-collector', path: 'docs/site' } },
  { id: 'server', title: 'Findings and accounts', source: { repo: 'otherlode-server', path: 'docs/site' } },
];

/** The path of the docs home page. */
export const docsHref = '/docs';

/** The path of the docs search page. */
export const docsSearchHref = '/docs/search';

/** Returns the URL path of a docs page. */
export function docsPageHref(page: DocsPage): string {
  return `${docsHref}/${page.id}`;
}

/** Returns the section a page belongs to, from the folder it sits in. */
export function sectionOf(page: DocsPage): DocsSection {
  const folder = page.id.split('/')[0];
  const section = docsSections.find((s) => s.id === folder);
  if (!section) {
    throw new Error(`docs page ${page.id} is in ${folder}/, which is not a section in src/lib/docs.ts`);
  }
  return section;
}

/** Returns where a page's Markdown lives, such as `otherlode-agent/docs/site/attach.md`. */
export function sourceOf(page: DocsPage): string {
  const { repo, path } = sectionOf(page).source;
  const file = page.filePath?.split('/').slice(-1)[0] ?? `${page.id.split('/').slice(1).join('/')}.md`;
  return `${repo}/${path}/${file}`;
}

/** A section with its pages, in sidebar order. */
export interface DocsGroup {
  section: DocsSection;
  pages: DocsPage[];
}

/**
 * Returns every section that has pages, each with its pages sorted by
 * `order` and then title. A section with no pages is left out, so the
 * sidebar never shows an empty heading.
 */
export async function docsGroups(): Promise<DocsGroup[]> {
  const pages = await getCollection('docs');
  return docsSections
    .map((section) => ({
      section,
      pages: pages
        .filter((page) => sectionOf(page) === section)
        .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title)),
    }))
    .filter((group) => group.pages.length > 0);
}

/** Returns every page in reading order: the sidebar's order, top to bottom. */
export function readingOrder(groups: DocsGroup[]): DocsPage[] {
  return groups.flatMap((group) => group.pages);
}
