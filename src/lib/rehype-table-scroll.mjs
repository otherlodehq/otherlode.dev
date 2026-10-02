/**
 * Wraps each table in a focusable region that scrolls sideways. The table
 * keeps display: table, so screen readers still read it as a table, and a
 * keyboard user can tab to the region and scroll it with the arrow keys.
 * Each region takes its name from the heading before it, with a number
 * added when a heading has more than one table, so no two regions on a
 * page share a name.
 */
export default function rehypeTableScroll() {
  return (tree) => {
    let heading = 'Table';
    const seen = new Map();
    const text = (node) =>
      node.type === 'text' ? node.value : (node.children ?? []).map(text).join('');
    const visit = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type === 'element' && /^h[1-6]$/.test(child.tagName)) {
          heading = text(child).trim();
        }
        if (child.type === 'element' && child.tagName === 'table') {
          const count = (seen.get(heading) ?? 0) + 1;
          seen.set(heading, count);
          return {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['table-scroll'],
              tabIndex: 0,
              role: 'region',
              ariaLabel: count === 1 ? heading : `${heading} ${count}`,
            },
            children: [child],
          };
        }
        visit(child);
        return child;
      });
    };
    visit(tree);
  };
}
