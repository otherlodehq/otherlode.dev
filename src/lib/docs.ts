import { getCollection, type CollectionEntry } from 'astro:content';
import {
  buildDocs,
  changesHref,
  latestHref,
  versionedHref,
  type Doc,
  type DocsSection,
  type SectionDocs,
} from './docs-model';

export * from './docs-model';

/** One docs page as the content collection loads it. */
export type DocsPage = CollectionEntry<'docs'>;

/** A page of the docs with its section and version. */
export type DocsDoc = Doc<DocsPage>;

/** A section of the docs with its versions. */
export type DocsSectionDocs = SectionDocs<DocsPage>;

/** The sections in the order the sidebar lists them. */
export const docsSections: DocsSection[] = [
  {
    id: 'start',
    title: 'Start',
    source: { repo: 'otherlode.dev', path: 'src/content/docs/start' },
    versioned: false,
  },
  { id: 'agent', title: 'Agent', source: { repo: 'otherlode-agent', path: 'docs/site' }, versioned: true },
  { id: 'collector', title: 'Collector', source: { repo: 'otherlode-collector', path: 'docs/site' }, versioned: true },
  {
    id: 'server',
    title: 'Findings and accounts',
    source: { repo: 'otherlode-server', path: 'docs/site' },
    versioned: false,
  },
];

/** Loads every docs page and groups it by section and version. */
export async function loadDocs(): Promise<DocsSectionDocs[]> {
  return buildDocs(await getCollection('docs'), docsSections);
}

/** A link in the docs sidebar. */
export interface SidebarItem {
  label: string;
  href: string;
  /** The page the link opens, absent for the changes page. */
  doc?: DocsDoc;
}

/** A heading in the docs sidebar with its links. */
export interface SidebarGroup {
  title: string;
  /** The release the links belong to, shown beside the heading. */
  version?: string;
  items: SidebarItem[];
}

/**
 * Returns the sidebar for a page. A page at its own version's URL, such as
 * `/docs/agent/v0.1.0/attach`, lists only that release of its section.
 * Every other page lists the latest version of every section, with a
 * section's changes page when it has more than one release.
 */
export function sidebarFor(all: DocsSectionDocs[], pinned?: { sectionDocs: DocsSectionDocs; version: string }): SidebarGroup[] {
  if (pinned) {
    const release = pinned.sectionDocs.versions.find((v) => v.version === pinned.version)!;
    return [
      {
        title: pinned.sectionDocs.section.title,
        version: pinned.version,
        items: release.docs.map((doc) => ({ label: doc.entry.data.title, href: versionedHref(doc), doc })),
      },
    ];
  }

  return all.map(({ section, versions }) => {
    const items: SidebarItem[] = versions[0].docs.map((doc) => ({
      label: doc.entry.data.title,
      href: latestHref(doc),
      doc,
    }));
    if (versions.length > 1) items.push({ label: 'Changes', href: changesHref(section) });
    return { title: section.title, version: versions[0].version, items };
  });
}

/** Returns the pages a sidebar lists, in reading order, for previous and next links. */
export function readingOrder(groups: SidebarGroup[]): SidebarItem[] {
  return groups.flatMap((group) => group.items.filter((item) => item.doc));
}
