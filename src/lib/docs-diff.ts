import { diffLines } from 'diff';

/** One line of a diff, or a run of unchanged lines left out. */
export type DiffLine =
  | { kind: 'add' | 'del' | 'same'; text: string }
  | { kind: 'skip'; count: number };

/**
 * Returns a line diff of two Markdown sources, as the changes page shows
 * it. Unchanged lines more than `context` lines from a change are folded
 * into one `skip` entry, so a one-line fix in a long page stays short.
 */
export function diffMarkdown(before: string, after: string, context = 3): DiffLine[] {
  const lines: { kind: 'add' | 'del' | 'same'; text: string }[] = [];
  for (const part of diffLines(before, after)) {
    const kind = part.added ? 'add' : part.removed ? 'del' : 'same';
    const text = part.value.endsWith('\n') ? part.value.slice(0, -1) : part.value;
    for (const line of text.split('\n')) lines.push({ kind, text: line });
  }

  const keep = lines.map(() => false);
  lines.forEach((line, i) => {
    if (line.kind === 'same') return;
    for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) {
      keep[j] = true;
    }
  });

  const out: DiffLine[] = [];
  let skipped = 0;
  lines.forEach((line, i) => {
    if (keep[i]) {
      if (skipped > 0) out.push({ kind: 'skip', count: skipped });
      skipped = 0;
      out.push(line);
    } else {
      skipped += 1;
    }
  });
  if (skipped > 0) out.push({ kind: 'skip', count: skipped });
  return out;
}
