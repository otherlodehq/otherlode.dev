/**
 * The shape of the docs, worked out from the content collection's entries.
 * It holds no Astro imports, so the tests can build it from plain objects.
 */

/** The fields of a docs entry that the model reads. */
export interface DocsEntry {
  id: string;
  filePath?: string;
  body?: string;
  data: { title: string; description: string; order: number };
}

/** A section of the docs, which is one folder under src/content/docs. */
export interface DocsSection {
  /** The folder name, which is also the first part of each page's path. */
  id: string;
  /** The heading the sidebar shows. */
  title: string;
  /** The repo and folder the pages come from, shown at the foot of each page. */
  source: { repo: string; path: string };
  /**
   * True when the section keeps one folder per release, such as
   * `agent/v0.2.0/`. The highest version is the latest.
   */
  versioned: boolean;
}

/** One page of the docs at one version. */
export interface Doc<E extends DocsEntry = DocsEntry> {
  entry: E;
  section: DocsSection;
  /** The release the page belongs to. Absent in a section without versions. */
  version?: string;
  /** The page's path within its section and version, such as `attach`. */
  slug: string;
}

/** The pages of one section at one version, in sidebar order. */
export interface DocsVersion<E extends DocsEntry = DocsEntry> {
  version?: string;
  docs: Doc<E>[];
}

/** A section with its versions, newest first. A section without versions has one. */
export interface SectionDocs<E extends DocsEntry = DocsEntry> {
  section: DocsSection;
  versions: DocsVersion<E>[];
}

/** The path of the docs home page. */
export const docsHref = '/docs';

/** The path of the docs search page. */
export const docsSearchHref = '/docs/search';

/** The slug a section's changes page takes, which no page may use. */
const CHANGES_SLUG = 'changes';

const VERSION = /^v(\d+)\.(\d+)\.(\d+)$/;

/** Orders release folder names such as `v0.10.0` by number, newest first. */
export function compareVersionsDescending(a: string, b: string): number {
  const pa = a.match(VERSION)!.slice(1).map(Number);
  const pb = b.match(VERSION)!.slice(1).map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pb[i] - pa[i];
  }
  return 0;
}

/** Sorts pages by `order`, then by title. */
function bySidebarOrder<E extends DocsEntry>(a: Doc<E>, b: Doc<E>): number {
  return a.entry.data.order - b.entry.data.order || a.entry.data.title.localeCompare(b.entry.data.title);
}

/**
 * Groups entries into sections and versions. A section with no pages is
 * left out, so the sidebar never shows an empty heading. It throws on a
 * page outside every section, a release folder whose name is not
 * `vX.Y.Z`, or a page whose slug is `changes` in a section with versions.
 */
export function buildDocs<E extends DocsEntry>(entries: E[], sections: DocsSection[]): SectionDocs<E>[] {
  const docs = entries.map((entry): Doc<E> => {
    const [folder, ...rest] = entry.id.split('/');
    const section = sections.find((s) => s.id === folder);
    if (!section) {
      throw new Error(`docs page ${entry.id} is in ${folder}/, which is not a section in src/lib/docs.ts`);
    }
    if (!section.versioned) return { entry, section, slug: rest.join('/') };

    const [version, ...path] = rest;
    if (!VERSION.test(version) || path.length === 0) {
      throw new Error(`docs page ${entry.id} must sit in a release folder such as ${folder}/v1.2.3/`);
    }
    const slug = path.join('/');
    if (slug === CHANGES_SLUG) {
      throw new Error(`docs page ${entry.id} uses the slug "${CHANGES_SLUG}", which the changes page takes`);
    }
    return { entry, section, version, slug };
  });

  return sections
    .map((section) => {
      const own = docs.filter((doc) => doc.section === section);
      const versions = [...new Set(own.map((doc) => doc.version))]
        .sort((a, b) => (a && b ? compareVersionsDescending(a, b) : 0))
        .map((version) => ({ version, docs: own.filter((doc) => doc.version === version).sort(bySidebarOrder) }));
      return { section, versions };
    })
    .filter((s) => s.versions.length > 0);
}

/** Returns the section a page belongs to. */
export function sectionDocsOf<E extends DocsEntry>(all: SectionDocs<E>[], doc: Doc<E>): SectionDocs<E> {
  return all.find((s) => s.section === doc.section)!;
}

/** Reports whether a page is at its section's latest version, or its section has none. */
export function isLatest(sectionDocs: SectionDocs, doc: Doc): boolean {
  return doc.version === sectionDocs.versions[0].version;
}

/** Returns a page's URL path at its own version, such as `/docs/agent/v0.1.0/attach`. */
export function versionedHref(doc: Doc): string {
  return doc.version ? `${docsHref}/${doc.section.id}/${doc.version}/${doc.slug}` : latestHref(doc);
}

/** Returns a page's URL path without a version, such as `/docs/agent/attach`. */
export function latestHref(doc: Doc): string {
  return `${docsHref}/${doc.section.id}/${doc.slug}`;
}

/** Returns the URL path readers should follow to a page: without a version when it is the latest. */
export function docHref(sectionDocs: SectionDocs, doc: Doc): string {
  return isLatest(sectionDocs, doc) ? latestHref(doc) : versionedHref(doc);
}

/** Returns the URL path of a section's changes page. */
export function changesHref(section: DocsSection): string {
  return `${docsHref}/${section.id}/${CHANGES_SLUG}`;
}

/** Returns the id of the changes page's entry for one page in one release. */
export function changeAnchor(version: string, slug: string): string {
  return `${version}-${slug.replaceAll('/', '-')}`;
}

/** Returns where a page's Markdown lives, such as `otherlode-agent/docs/site/attach.md`. */
export function sourceOf(doc: Doc): string {
  const { repo, path } = doc.section.source;
  const file = doc.entry.filePath?.split('/').slice(-1)[0] ?? `${doc.slug.split('/').slice(-1)[0]}.md`;
  const dir = doc.slug.split('/').slice(0, -1).join('/');
  return `${repo}/${path}/${dir ? `${dir}/` : ''}${file}`;
}

/** Returns the text the changes page compares: the title and the Markdown body. */
export function comparableText(doc: Doc): string {
  return `# ${doc.entry.data.title}\n\n${(doc.entry.body ?? '').trim()}\n`;
}

/** What changed in one release of a section, against the release before it. */
export interface ReleaseChanges<E extends DocsEntry = DocsEntry> {
  version: string;
  previous: string;
  added: Doc<E>[];
  changed: { doc: Doc<E>; before: Doc<E> }[];
  removed: Doc<E>[];
}

/**
 * Returns what each release changed, newest first. The oldest release has
 * nothing to compare with, so it is left out. A release that changed no
 * page is still listed, with empty lists.
 */
export function releaseChanges<E extends DocsEntry>(sectionDocs: SectionDocs<E>): ReleaseChanges<E>[] {
  const { versions } = sectionDocs;
  return versions.slice(0, -1).map((current, i) => {
    const previous = versions[i + 1];
    const find = (v: DocsVersion<E>, slug: string) => v.docs.find((d) => d.slug === slug);
    return {
      version: current.version!,
      previous: previous.version!,
      added: current.docs.filter((d) => !find(previous, d.slug)),
      changed: current.docs.flatMap((doc) => {
        const before = find(previous, doc.slug);
        return before && comparableText(before) !== comparableText(doc) ? [{ doc, before }] : [];
      }),
      removed: previous.docs.filter((d) => !find(current, d.slug)),
    };
  });
}

/**
 * Returns the release that last added or changed a page, up to the page's
 * own version. It returns nothing when that is the oldest release, since
 * every page there is new and saying so tells the reader nothing.
 */
export function lastChange(
  sectionDocs: SectionDocs,
  doc: Doc,
): { version: string; kind: 'added' | 'changed' } | undefined {
  if (!doc.version) return undefined;
  const oldestFirst = [...sectionDocs.versions].reverse();
  const upTo = oldestFirst.findIndex((v) => v.version === doc.version);
  let last: { version: string; kind: 'added' | 'changed' } | undefined;
  for (let i = 1; i <= upTo; i++) {
    const now = oldestFirst[i].docs.find((d) => d.slug === doc.slug);
    const before = oldestFirst[i - 1].docs.find((d) => d.slug === doc.slug);
    if (!now) {
      last = undefined;
    } else if (!before) {
      last = { version: oldestFirst[i].version!, kind: 'added' };
    } else if (comparableText(before) !== comparableText(now)) {
      last = { version: oldestFirst[i].version!, kind: 'changed' };
    }
  }
  return last;
}
