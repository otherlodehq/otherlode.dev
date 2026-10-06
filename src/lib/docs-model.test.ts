import { describe, expect, it } from 'vitest';
import { diffMarkdown } from './docs-diff';
import {
  buildDocs,
  compareVersionsDescending,
  docHref,
  lastChange,
  releaseChanges,
  sourceOf,
  versionedHref,
  type DocsEntry,
  type DocsSection,
} from './docs-model';

const sections: DocsSection[] = [
  { id: 'start', title: 'Start', source: { repo: 'otherlode.dev', path: 'src/content/docs/start' }, versioned: false },
  { id: 'agent', title: 'Agent', source: { repo: 'otherlode-agent', path: 'docs/site' }, versioned: true },
];

function entry(id: string, body = 'Same text.', title = id.split('/').at(-1)!, order = 100): DocsEntry {
  return { id, body, data: { title, description: '', order } };
}

describe('compareVersionsDescending', () => {
  it('orders by number, not as text', () => {
    expect(['v0.9.0', 'v0.10.0', 'v0.2.1'].sort(compareVersionsDescending)).toEqual(['v0.10.0', 'v0.9.0', 'v0.2.1']);
  });
});

describe('buildDocs', () => {
  it('groups pages by section and release, newest release first', () => {
    const all = buildDocs(
      [entry('agent/v0.1.0/attach'), entry('agent/v0.2.0/attach'), entry('start/how-it-works')],
      sections,
    );
    expect(all.map((s) => s.section.id)).toEqual(['start', 'agent']);
    expect(all[1].versions.map((v) => v.version)).toEqual(['v0.2.0', 'v0.1.0']);
    expect(all[1].versions[0].docs[0].slug).toBe('attach');
  });

  it('refuses a page in a versioned section outside a release folder', () => {
    expect(() => buildDocs([entry('agent/attach')], sections)).toThrow(/release folder/);
    expect(() => buildDocs([entry('agent/latest/attach')], sections)).toThrow(/release folder/);
  });

  it('refuses the slug the changes page takes', () => {
    expect(() => buildDocs([entry('agent/v0.1.0/changes')], sections)).toThrow(/changes page/);
  });

  it('refuses a page outside every section', () => {
    expect(() => buildDocs([entry('other/page')], sections)).toThrow(/not a section/);
  });
});

describe('sourceOf', () => {
  it('points a release page at its folder here and any other page at its source repo', () => {
    const all = buildDocs([entry('agent/v0.1.0/guides/attach'), entry('start/how-it-works')], sections);
    expect(sourceOf(all[1].versions[0].docs[0])).toBe('otherlode.dev/src/content/docs/agent/v0.1.0/guides/attach.md');
    expect(sourceOf(all[0].versions[0].docs[0])).toBe('otherlode.dev/src/content/docs/start/how-it-works.md');
  });
});

describe('links', () => {
  it('leaves the version out of the latest release and keeps it for older ones', () => {
    const [agent] = buildDocs([entry('agent/v0.1.0/attach'), entry('agent/v0.2.0/attach')], sections);
    const [latest, old] = agent.versions.map((v) => v.docs[0]);
    expect(docHref(agent, latest)).toBe('/docs/agent/attach');
    expect(docHref(agent, old)).toBe('/docs/agent/v0.1.0/attach');
    expect(versionedHref(latest)).toBe('/docs/agent/v0.2.0/attach');
  });
});

describe('releaseChanges and lastChange', () => {
  const [agent] = buildDocs(
    [
      entry('agent/v0.1.0/attach', 'First.'),
      entry('agent/v0.1.0/old'),
      entry('agent/v0.2.0/attach', 'First.'),
      entry('agent/v0.2.0/options'),
      entry('agent/v0.3.0/attach', 'Second.'),
      entry('agent/v0.3.0/options'),
    ],
    sections,
  );

  it('lists what each release added, changed and removed, newest first', () => {
    const changes = releaseChanges(agent);
    expect(changes.map((c) => c.version)).toEqual(['v0.3.0', 'v0.2.0']);
    expect(changes[0].changed.map((c) => c.doc.slug)).toEqual(['attach']);
    expect(changes[0].added).toEqual([]);
    expect(changes[1].added.map((d) => d.slug)).toEqual(['options']);
    expect(changes[1].removed.map((d) => d.slug)).toEqual(['old']);
    expect(changes[1].changed).toEqual([]);
  });

  it('counts a title change as a change', () => {
    const [a] = buildDocs([entry('agent/v0.1.0/attach', 'x', 'Attach'), entry('agent/v0.2.0/attach', 'x', 'Attach it')], sections);
    expect(releaseChanges(a)[0].changed).toHaveLength(1);
  });

  it('names the release that last touched a page, but never the oldest', () => {
    const at = (version: string, slug: string) =>
      agent.versions.find((v) => v.version === version)!.docs.find((d) => d.slug === slug)!;
    expect(lastChange(agent, at('v0.3.0', 'attach'))).toEqual({ version: 'v0.3.0', kind: 'changed' });
    expect(lastChange(agent, at('v0.3.0', 'options'))).toEqual({ version: 'v0.2.0', kind: 'added' });
    expect(lastChange(agent, at('v0.2.0', 'attach'))).toBeUndefined();
  });
});

describe('diffMarkdown', () => {
  it('marks added and removed lines', () => {
    expect(diffMarkdown('a\nb\n', 'a\nc\n')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'del', text: 'b' },
      { kind: 'add', text: 'c' },
    ]);
  });

  it('folds unchanged lines far from a change', () => {
    const before = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n') + '\n';
    const after = before.replace('line 10\n', 'line ten\n');
    const lines = diffMarkdown(before, after, 2);
    expect(lines[0]).toEqual({ kind: 'skip', count: 8 });
    expect(lines.at(-1)).toEqual({ kind: 'skip', count: 7 });
    expect(lines.filter((l) => l.kind === 'same')).toHaveLength(4);
  });
});
