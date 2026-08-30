import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { renderPublicFooter, renderPublicHeader } from '../src/templates/public-shell.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const config = JSON.parse(await readFile(path.join(root, 'config', 'site.json'), 'utf8'));
const project = JSON.parse(await readFile(path.join(root, 'PROJECT-MANIFEST.json'), 'utf8'));
const publicPages = new Set(project.runtime.public_pages);
const standalonePages = new Set(config.standalonePages || []);
const configuredPages = new Set(Object.keys(config.pages));
const prettierConfig = (await prettier.resolveConfig(path.join(root, 'index.html'))) || {};
const failures = [];
const changed = [];
const canonicalUrls = new Map();

function fail(message) {
  failures.push(message);
}

function canonicalUrl(filename) {
  const route = filename === 'index.html' ? '/' : '/' + filename.replace(/\.html$/i, '');
  return config.siteUrl.replace(/\/$/, '') + route;
}

function replaceRegion(html, name, rendered, filename) {
  const start = '<!-- shared:' + name + ':start -->';
  const end = '<!-- shared:' + name + ':end -->';
  const markedPattern = new RegExp(
    '<!-- shared:' + name + ':start -->[\\s\\S]*?<!-- shared:' + name + ':end -->',
    'g',
  );
  const markedMatches = [...html.matchAll(markedPattern)];
  const elementName = name === 'public-header' ? 'header' : 'footer';
  const elementPattern = new RegExp(
    '<' + elementName + '\\b[\\s\\S]*?</' + elementName + '>',
    'gi',
  );

  if (markedMatches.length > 1) {
    fail(filename + ': contains more than one generated ' + name + ' region');
    return html;
  }

  const replacement = start + '\n' + rendered + '\n' + end;
  if (markedMatches.length === 1) return html.replace(markedPattern, replacement);

  const elements = [...html.matchAll(elementPattern)];
  if (elements.length !== 1) {
    fail(filename + ': expected exactly one <' + elementName + '> before consolidation');
    return html;
  }
  return html.replace(elementPattern, replacement);
}

function ensureCanonical(html, filename) {
  const expected = canonicalUrl(filename);
  const previous = canonicalUrls.get(expected);
  if (previous) fail(filename + ': canonical URL duplicates ' + previous + ': ' + expected);
  canonicalUrls.set(expected, filename);

  const canonicalTag = '<link rel="canonical" href="' + expected + '" />';
  const canonicalPattern = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\/?\s*>/gi;
  const matches = [...html.matchAll(canonicalPattern)];
  if (matches.length > 1) {
    fail(filename + ': contains more than one canonical link');
    return html;
  }
  if (matches.length === 1) return html.replace(canonicalPattern, canonicalTag);
  if (!/<\/title>/i.test(html)) {
    fail(filename + ': cannot insert canonical URL because </title> is missing');
    return html;
  }
  return html.replace(/<\/title>/i, '</title>\n    ' + canonicalTag);
}

for (const filename of configuredPages) {
  if (!publicPages.has(filename)) fail(filename + ': configured shell page is not a public route');
}

for (const filename of standalonePages) {
  if (!publicPages.has(filename)) fail(filename + ': standalone page is not a public route');
  if (configuredPages.has(filename))
    fail(filename + ': cannot be both standalone and shell-managed');
}

for (const filename of publicPages) {
  if (!/^[^/\\]+\.html$/i.test(filename)) {
    fail(filename + ': public routes must remain root .html files');
    continue;
  }
  if (!configuredPages.has(filename) && !standalonePages.has(filename)) {
    fail(filename + ': public route is missing from config/site.json');
  }
}

for (const filename of project.runtime.public_pages) {
  const filePath = path.join(root, filename);
  let html = await readFile(filePath, 'utf8');
  html = ensureCanonical(html, filename);

  const page = config.pages[filename];
  if (page) {
    html = replaceRegion(html, 'public-header', renderPublicHeader(config, page.header), filename);
    html = replaceRegion(html, 'public-footer', renderPublicFooter(config, page.footer), filename);
  } else if (html.includes('<!-- shared:public-')) {
    fail(filename + ': standalone page contains a generated public shell marker');
  }

  const formatted = await prettier.format(html, { ...prettierConfig, parser: 'html' });
  const current = await readFile(filePath, 'utf8');
  if (formatted !== current) {
    changed.push(filename);
    if (!checkOnly) await writeFile(filePath, formatted, 'utf8');
  }
}

for (const filename of [...project.runtime.portal_pages, ...project.runtime.admin_pages]) {
  const html = await readFile(path.join(root, filename), 'utf8');
  if (html.includes('<!-- shared:public-')) {
    fail(filename + ': portal and admin pages must stay outside the public shell');
  }
}

if (failures.length) {
  failures.forEach((message) => console.error('FAIL ' + message));
  process.exit(1);
}

if (checkOnly && changed.length) {
  changed.forEach((filename) => console.error('STALE ' + filename));
  console.error('Run npm run site:build to regenerate committed public HTML.');
  process.exit(1);
}

if (checkOnly) {
  console.log(
    'PASS ' +
      configuredPages.size +
      ' shared-shell pages, ' +
      standalonePages.size +
      ' standalone public page, and ' +
      canonicalUrls.size +
      ' unique canonical routes are synchronized.',
  );
} else {
  console.log(
    'Generated ' +
      changed.length +
      ' public HTML files from config/site.json and the shared shell templates.',
  );
}
