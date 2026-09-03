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
const seoPages = new Set(Object.keys(config.seo.pages));
const prettierConfig = (await prettier.resolveConfig(path.join(root, 'index.html'))) || {};
const failures = [];
const changed = [];
const canonicalUrls = new Map();
const descriptions = new Map();

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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

function absoluteUrl(resourcePath) {
  return config.siteUrl.replace(/\/$/, '') + '/' + resourcePath.replace(/^\//, '');
}

function businessStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Electrician',
    '@id': config.siteUrl.replace(/\/$/, '') + '/#business',
    name: config.business.name,
    url: config.siteUrl.replace(/\/$/, '') + '/',
    telephone: config.business.phoneInternational,
    image: absoluteUrl(config.seo.socialImage.path),
    logo: absoluteUrl('/assets/branding/blue-bear/logo-mark-solid.png'),
    areaServed: {
      '@type': 'AdministrativeArea',
      name: config.business.serviceAreaLong,
    },
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'California contractor license',
      value: config.business.license,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: config.business.phoneInternational,
      contactType: 'customer service',
      areaServed: 'US-CA',
      availableLanguage: 'English',
    },
  };
}

function renderSeoRegion(filename) {
  const page = config.seo.pages[filename];
  const canonical = canonicalUrl(filename);
  const previousCanonical = canonicalUrls.get(canonical);
  if (previousCanonical)
    fail(filename + ': canonical URL duplicates ' + previousCanonical + ': ' + canonical);
  canonicalUrls.set(canonical, filename);

  const previousDescription = descriptions.get(page.description);
  if (previousDescription) fail(filename + ': meta description duplicates ' + previousDescription);
  descriptions.set(page.description, filename);

  const image = config.seo.socialImage;
  const imageUrl = absoluteUrl(image.path);
  const jsonLd = JSON.stringify(businessStructuredData(), null, 2).replaceAll('<', '\\u003c');

  return [
    '<title>' + escapeHtml(page.title) + '</title>',
    '<link rel="canonical" href="' + escapeHtml(canonical) + '" />',
    '<meta name="description" content="' + escapeHtml(page.description) + '" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="' + escapeHtml(config.business.name) + '" />',
    '<meta property="og:locale" content="' + escapeHtml(config.seo.locale) + '" />',
    '<meta property="og:title" content="' + escapeHtml(page.title) + '" />',
    '<meta property="og:description" content="' + escapeHtml(page.description) + '" />',
    '<meta property="og:url" content="' + escapeHtml(canonical) + '" />',
    '<meta property="og:image" content="' + escapeHtml(imageUrl) + '" />',
    '<meta property="og:image:type" content="' + escapeHtml(image.type) + '" />',
    '<meta property="og:image:width" content="' + image.width + '" />',
    '<meta property="og:image:height" content="' + image.height + '" />',
    '<meta property="og:image:alt" content="' + escapeHtml(image.alt) + '" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + escapeHtml(page.title) + '" />',
    '<meta name="twitter:description" content="' + escapeHtml(page.description) + '" />',
    '<meta name="twitter:image" content="' + escapeHtml(imageUrl) + '" />',
    '<meta name="twitter:image:alt" content="' + escapeHtml(image.alt) + '" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
    '<meta name="apple-mobile-web-app-title" content="Blue Bear" />',
    '<script type="application/ld+json" data-blue-bear-business>',
    jsonLd,
    '</script>',
  ].join('\n');
}

function ensureSeo(html, filename) {
  const start = '<!-- shared:public-seo:start -->';
  const end = '<!-- shared:public-seo:end -->';
  const regionPattern = /<!-- shared:public-seo:start -->[\s\S]*?<!-- shared:public-seo:end -->/g;
  const regions = [...html.matchAll(regionPattern)];
  if (regions.length > 1) {
    fail(filename + ': contains more than one generated public-seo region');
    return html;
  }

  const replacement = start + '\n' + renderSeoRegion(filename) + '\n' + end;
  if (regions.length === 1) return html.replace(regionPattern, replacement);

  const managedMetaPattern =
    /<meta\b(?=[^>]*(?:name|property)=["'](?:description|og:[^"']+|twitter:[^"']+|apple-mobile-web-app[^"']*)["'])[^>]*>\s*/gi;
  const canonicalPattern = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>\s*/gi;
  const titlePattern = /<title>[\s\S]*?<\/title>\s*/gi;
  const structuredDataPattern =
    /<script\b(?=[^>]*\bdata-blue-bear-business\b)[^>]*>[\s\S]*?<\/script>\s*/gi;
  const viewportPattern = /<meta\b(?=[^>]*\bname=["']viewport["'])[^>]*>/i;
  const viewport = html.match(viewportPattern);
  if (!viewport) {
    fail(filename + ': cannot insert SEO metadata because viewport metadata is missing');
    return html;
  }

  const stripped = html
    .replace(titlePattern, '')
    .replace(canonicalPattern, '')
    .replace(managedMetaPattern, '')
    .replace(structuredDataPattern, '');
  return stripped.replace(viewportPattern, viewport[0] + '\n    ' + replacement);
}

function renderSitemap() {
  const urls = project.runtime.public_pages
    .filter((filename) => config.seo.pages[filename].indexable !== false)
    .map((filename) => '  <url>\n    <loc>' + canonicalUrl(filename) + '</loc>\n  </url>')
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls +
    '\n</urlset>\n'
  );
}

for (const filename of configuredPages) {
  if (!publicPages.has(filename)) fail(filename + ': configured shell page is not a public route');
}

for (const filename of standalonePages) {
  if (!publicPages.has(filename)) fail(filename + ': standalone page is not a public route');
  if (configuredPages.has(filename))
    fail(filename + ': cannot be both standalone and shell-managed');
}

for (const filename of seoPages) {
  if (!publicPages.has(filename)) fail(filename + ': SEO config is not a public route');
}

for (const filename of publicPages) {
  if (!/^[^/\\]+\.html$/i.test(filename)) {
    fail(filename + ': public routes must remain root .html files');
    continue;
  }
  if (!configuredPages.has(filename) && !standalonePages.has(filename)) {
    fail(filename + ': public route is missing from config/site.json');
  }
  if (!seoPages.has(filename)) fail(filename + ': public route is missing SEO config');
}

for (const filename of project.runtime.public_pages) {
  const filePath = path.join(root, filename);
  let html = await readFile(filePath, 'utf8');
  html = ensureSeo(html, filename);

  const page = config.pages[filename];
  if (page) {
    html = replaceRegion(html, 'public-header', renderPublicHeader(config, page.header), filename);
    html = replaceRegion(html, 'public-footer', renderPublicFooter(config, page.footer), filename);
  } else if (
    html.includes('<!-- shared:public-header:') ||
    html.includes('<!-- shared:public-footer:')
  ) {
    fail(filename + ': standalone page contains a generated public shell marker');
  }

  const formatted = await prettier.format(html, { ...prettierConfig, parser: 'html' });
  const current = await readFile(filePath, 'utf8');
  if (formatted !== current) {
    changed.push(filename);
    if (!checkOnly) await writeFile(filePath, formatted, 'utf8');
  }
}

const sitemapPath = path.join(root, 'sitemap.xml');
const sitemap = renderSitemap();
let currentSitemap = '';
try {
  currentSitemap = await readFile(sitemapPath, 'utf8');
} catch {
  // A missing sitemap is treated as a stale generated artifact.
}
if (sitemap !== currentSitemap) {
  changed.push('sitemap.xml');
  if (!checkOnly) await writeFile(sitemapPath, sitemap, 'utf8');
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
      ' unique canonical routes, metadata, and sitemap entries are synchronized.',
  );
} else {
  console.log(
    'Generated ' +
      changed.length +
      ' public HTML files from config/site.json and the shared shell templates.',
  );
}
