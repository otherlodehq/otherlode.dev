// Fails when a built page holds something the site's CSP would block, or
// something that would load from another site. public/_headers sends a
// Content-Security-Policy that allows only files from the site's own
// origin, with no 'unsafe-inline' and no data: URLs. A page that breaks
// it still works in `astro dev`, which sends no CSP, so this runs after
// every build.
//
// HTML is parsed with parse5, the same algorithm browsers use, so a quoted
// ">" inside an attribute cannot hide a tag. CSS is checked with regular
// expressions. The build writes it minified, and its only comment is
// Tailwind's licence banner, whose link is not in a url() or @import.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const SITE_HOST = 'otherlode.dev';
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

/** Attributes that load a resource, by element. `<a href>` is left out on purpose. */
const LOADING_ATTRIBUTES = {
  script: ['src'],
  link: ['href'],
  img: ['src', 'srcset'],
  iframe: ['src'],
  source: ['src', 'srcset'],
  video: ['src', 'poster'],
  audio: ['src'],
  track: ['src'],
  object: ['data'],
  embed: ['src'],
  input: ['src'],
  image: ['href', 'xlink:href'],
  use: ['href', 'xlink:href'],
};

/** Yields every file under dir whose name ends with one of the extensions. */
async function* filesUnder(dir, extensions) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* filesUnder(path, extensions);
    else if (extensions.some((ext) => entry.name.endsWith(ext))) yield path;
  }
}

/**
 * Reports whether a URL loads from another site. The URL is resolved the
 * way a browser resolves it against a page on the site, so forms such as
 * `//host`, `/\\host` and `http:host` count as well as absolute URLs.
 */
function isOffSite(url) {
  try {
    return new URL(url.trim(), `https://${SITE_HOST}/`).hostname !== SITE_HOST;
  } catch {
    return true;
  }
}

/** Splits a srcset value into its URLs. */
function srcsetUrls(value) {
  return value
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

/**
 * Reports whether a URL uses the javascript: scheme. Browsers drop ASCII
 * whitespace and control characters before they read the scheme, so this
 * does too.
 */
function isJavascriptUrl(value) {
  return /^javascript:/i.test(value.replace(/[\u0000- ]/g, ''));
}

/** Yields every element in the parse5 tree, including template contents. */
function* elements(node) {
  if (node.tagName) yield node;
  for (const child of node.childNodes ?? []) yield* elements(child);
  if (node.content) yield* elements(node.content);
}

/** Returns the problems in one HTML file, each with its line number. */
function checkHtml(html) {
  const problems = [];
  const document = parse(html, { sourceCodeLocationInfo: true });
  for (const element of elements(document)) {
    const line = element.sourceCodeLocation?.startLine ?? 0;
    const report = (message) => problems.push({ line, message });
    const attrs = element.attrs ?? [];
    const attr = (name) => attrs.find((a) => a.name === name)?.value;

    if (element.tagName === 'script' && attr('src') === undefined) {
      report('inline <script> (no src)');
    }
    if (element.tagName === 'style') report('<style> element');

    for (const { name, value } of attrs) {
      if (name === 'style') report('style= attribute');
      if (/^on/i.test(name)) report(`inline event handler ${name}=`);
      if (isJavascriptUrl(value)) report(`javascript: URL in ${name}=`);
      if (/^\s*data:/i.test(value) && name !== 'content') report(`data: URL in ${name}=`);
    }

    for (const name of LOADING_ATTRIBUTES[element.tagName] ?? []) {
      const value = attr(name);
      if (value === undefined) continue;
      const urls = name === 'srcset' ? srcsetUrls(value) : [value];
      for (const url of urls) {
        if (/^data:/i.test(url)) report(`data: URL in <${element.tagName} ${name}>`);
        else if (isOffSite(url)) report(`off-site <${element.tagName} ${name}="${url}">`);
      }
    }
  }
  return problems;
}

/** Returns the problems in one CSS file. Minified CSS is one line, so lines are not reported. */
function checkCss(css) {
  const problems = [];
  for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    const url = match[2];
    if (/^data:/i.test(url)) problems.push({ message: `data: URL ${url.slice(0, 40)}...` });
    else if (isOffSite(url)) problems.push({ message: `off-site url(${url})` });
  }
  for (const match of css.matchAll(/@import\s+(?:url\()?\s*['"]?([^'")\s;]+)/gi)) {
    if (isOffSite(match[1])) problems.push({ message: `off-site @import ${match[1]}` });
  }
  return problems;
}

let htmlCount = 0;
const problems = [];

try {
  for await (const file of filesUnder(distDir, ['.html', '.css'])) {
    const text = await readFile(file, 'utf8');
    const isHtml = file.endsWith('.html');
    if (isHtml) htmlCount += 1;
    for (const problem of isHtml ? checkHtml(text) : checkCss(text)) {
      const where = problem.line ? `${relative(distDir, file)}:${problem.line}` : relative(distDir, file);
      problems.push(`${where}: ${problem.message}`);
    }
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('check:csp: dist/ does not exist. Run `npm run build` first.');
    process.exit(1);
  }
  throw error;
}

if (htmlCount === 0) {
  console.error('check:csp: no HTML files found in dist/.');
  process.exit(1);
}

if (problems.length > 0) {
  console.error(`check:csp: ${problems.length} problem(s) the CSP would block or that load from another site:`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`check:csp: ${htmlCount} HTML file(s) and their CSS are clean.`);
