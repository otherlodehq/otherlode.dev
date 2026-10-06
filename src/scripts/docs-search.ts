/**
 * Searches the docs with Pagefind and lists what it finds. The query comes
 * from `?q=`, so the sidebar's search box and this page's own form both
 * work as plain GET forms. Results are built with DOM calls, never
 * innerHTML.
 */

interface PagefindResultData {
  url: string;
  excerpt: string;
  meta: { title?: string };
}

interface Pagefind {
  search(query: string): Promise<{ results: { data(): Promise<PagefindResultData> }[] }>;
}

/** How many results the page shows. */
const MAX_RESULTS = 20;

/** The index is written after astro build, so its path must stay out of Vite's hands. */
const PAGEFIND_PATH = '/pagefind/pagefind.js';

const form = document.querySelector<HTMLFormElement>('.docs-article form[role="search"]');
const queryInput = document.querySelector<HTMLInputElement>('#docs-search');
const statusLine = document.querySelector<HTMLElement>('#docs-search-status');
const resultList = document.querySelector<HTMLOListElement>('#docs-search-results');

/**
 * Turns a Pagefind excerpt into nodes. The excerpt is escaped text with
 * <mark> around each match. Only text and <mark> are kept, so markup in
 * an excerpt can never add an element or attribute of its own.
 */
function excerptNodes(excerpt: string): Node[] {
  const parsed = new DOMParser().parseFromString(`<p>${excerpt}</p>`, 'text/html');
  return [...(parsed.body.firstElementChild?.childNodes ?? [])].map((node) => {
    if (node.nodeName === 'MARK') {
      const mark = document.createElement('mark');
      mark.textContent = node.textContent;
      return mark;
    }
    return document.createTextNode(node.textContent ?? '');
  });
}

/** Builds one result's list item. */
function resultItem(data: PagefindResultData): HTMLLIElement {
  const item = document.createElement('li');
  const link = document.createElement('a');
  // Pagefind indexes the built files, so its URLs end in .html. The site's
  // own links leave that off.
  link.href = data.url.replace(/\.html$/, '');
  link.textContent = data.meta.title ?? data.url;
  const excerpt = document.createElement('p');
  excerpt.append(...excerptNodes(data.excerpt));
  item.append(link, excerpt);
  return item;
}

async function run(): Promise<void> {
  if (!queryInput || !statusLine || !resultList) return;
  const query = new URLSearchParams(location.search).get('q')?.trim() ?? '';
  queryInput.value = query;
  if (!query) {
    statusLine.textContent = 'Type a word or phrase and press Enter.';
    return;
  }

  let pagefind: Pagefind;
  try {
    pagefind = await import(/* @vite-ignore */ PAGEFIND_PATH);
  } catch {
    statusLine.textContent =
      'Search is not available. The index exists only in a built site, so run npm run build and then npm run preview.';
    return;
  }

  statusLine.textContent = 'Searching...';
  const search = await pagefind.search(query);
  const results = await Promise.all(search.results.slice(0, MAX_RESULTS).map((r) => r.data()));
  resultList.replaceChildren(...results.map(resultItem));
  statusLine.textContent =
    results.length === 0
      ? `No pages match "${query}".`
      : `${search.results.length} ${search.results.length === 1 ? 'page matches' : 'pages match'} "${query}".`;
}

form?.addEventListener('submit', () => {
  if (queryInput) queryInput.value = queryInput.value.trim();
});

run();
