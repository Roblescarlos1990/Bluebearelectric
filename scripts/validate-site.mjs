import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const ignoredDirectories = new Set([
  '.git',
  '.npm-cache',
  '.playwright-browsers',
  'coverage',
  'node_modules',
  'playwright-report',
  'test-results',
]);

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
}

const files = await walk(root);
const htmlFiles = files.filter((file) => path.extname(file) === '.html');
const javascriptFiles = files.filter((file) => ['.js', '.mjs'].includes(path.extname(file)));

for (const htmlFile of htmlFiles) {
  const relative = path.relative(root, htmlFile);
  const html = await readFile(htmlFile, 'utf8');

  if (!/<html\b[^>]*\blang=["']en["']/i.test(html)) errors.push(`${relative}: missing lang="en"`);
  if (!/<meta\b[^>]*name=["']viewport["']/i.test(html))
    errors.push(`${relative}: missing viewport metadata`);
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${relative}: missing document title`);
  if (path.dirname(relative) === '.') {
    if (!/<link\b[^>]*rel=["']icon["']/i.test(html))
      errors.push(`${relative}: missing favicon metadata`);
    if (!/<link\b[^>]*rel=["']manifest["']/i.test(html))
      errors.push(`${relative}: missing web manifest metadata`);
    if (!/<link\b[^>]*rel=["']apple-touch-icon["'][^>]*sizes=["']180x180["']/i.test(html))
      errors.push(`${relative}: missing dedicated 180x180 Apple touch icon`);
    if (!html.includes('assets/js/image-performance.js'))
      errors.push(`${relative}: missing responsive image runtime`);
  }

  const references = [
    ...[...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map((match) => match[1]),
    ...[...html.matchAll(/\b(?:srcset|imagesrcset)=["']([^"']+)["']/gi)].flatMap((match) =>
      match[1].split(',').map((candidate) => candidate.trim().split(/\s+/)[0]),
    ),
  ];
  for (const reference of references) {
    if (/^(?:https?:|mailto:|tel:|data:|blob:|#)/i.test(reference)) continue;
    const cleanReference = reference.split('#')[0].split('?')[0];
    if (!cleanReference) continue;
    const resolved = cleanReference.startsWith('/')
      ? path.join(root, cleanReference.slice(1))
      : path.resolve(path.dirname(htmlFile), cleanReference);
    if (!(await exists(resolved))) errors.push(`${relative}: missing local asset ${reference}`);
  }

  if (path.dirname(relative) === '.') {
    for (const image of html.matchAll(/<img\b[^>]*>/gi)) {
      const markup = image[0];
      for (const attribute of ['alt', 'width', 'height', 'loading', 'decoding']) {
        if (!new RegExp(`\\b${attribute}\\s*=`, 'i').test(markup))
          errors.push(`${relative}: image missing ${attribute}: ${markup.slice(0, 120)}`);
      }
    }
    const highPriorityCount = [...html.matchAll(/\bfetchpriority=["']high["']/gi)].length;
    if (highPriorityCount > 1)
      errors.push(`${relative}: more than one image is marked fetchpriority=high`);
  }
}

for (const cssFile of files.filter((file) => path.extname(file) === '.css')) {
  const relative = path.relative(root, cssFile);
  const css = await readFile(cssFile, 'utf8');
  for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/gi)) {
    const reference = match[1];
    if (/^(?:https?:|data:|blob:|#)/i.test(reference)) continue;
    const resolved = path.resolve(path.dirname(cssFile), reference.split('?')[0]);
    if (!(await exists(resolved))) errors.push(`${relative}: missing local asset ${reference}`);
  }
}

for (const javascriptFile of javascriptFiles) {
  const result = spawnSync(process.execPath, ['--check', javascriptFile], { encoding: 'utf8' });
  if (result.status !== 0) {
    const relative = path.relative(root, javascriptFile);
    errors.push(`${relative}: JavaScript syntax check failed\n${result.stderr.trim()}`);
  }
}

const manifestPath = path.join(root, 'site.webmanifest');
if (!(await exists(manifestPath))) errors.push('site.webmanifest is missing');
else {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const requiredManifestValues = {
      name: 'Blue Bear Electric',
      short_name: 'Blue Bear',
      id: '/',
      start_url: '/',
      scope: '/',
      lang: 'en-US',
      display: 'standalone',
      background_color: '#030a13',
      theme_color: '#030a13',
    };
    for (const [field, expected] of Object.entries(requiredManifestValues)) {
      if (manifest[field] !== expected)
        errors.push(`site.webmanifest: ${field} must be ${JSON.stringify(expected)}`);
    }
    if (manifest.prefer_related_applications !== false)
      errors.push('site.webmanifest: prefer_related_applications must be false');
    if (!manifest.display_override?.includes('standalone'))
      errors.push('site.webmanifest: display_override must include standalone');
    if (!manifest.icons?.length) errors.push('site.webmanifest has no icons');
    for (const icon of manifest.icons || []) {
      if (!icon.src) {
        errors.push('site.webmanifest contains an icon without a src');
        continue;
      }
      const iconPath = path.join(root, icon.src.replace(/^\//, ''));
      if (!(await exists(iconPath))) errors.push(`site.webmanifest: missing icon ${icon.src}`);
    }
    if (!manifest.icons?.some((icon) => icon.sizes === '192x192' && icon.purpose === 'any'))
      errors.push('site.webmanifest is missing the 192x192 app icon');
    if (!manifest.icons?.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'))
      errors.push('site.webmanifest is missing the 512x512 app icon');
    if (!manifest.icons?.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'))
      errors.push('site.webmanifest is missing the padded 512x512 maskable icon');
  } catch (error) {
    errors.push(`site.webmanifest is invalid JSON: ${error.message}`);
  }
}

const projectPath = path.join(root, 'PROJECT-MANIFEST.json');
const configPath = path.join(root, 'config', 'site.json');
try {
  const project = JSON.parse(await readFile(projectPath, 'utf8'));
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const publicPages = project.runtime.public_pages;
  const descriptions = new Set();
  const canonicals = new Set();

  for (const filename of publicPages) {
    const html = await readFile(path.join(root, filename), 'utf8');
    const descriptionMatches = [
      ...html.matchAll(
        /<meta\b(?=[^>]*name=["']description["'])[^>]*content=["']([^"']+)["'][^>]*>/gi,
      ),
    ];
    const canonicalMatches = [
      ...html.matchAll(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*href=["']([^"']+)["'][^>]*>/gi),
    ];
    if (descriptionMatches.length !== 1)
      errors.push(`${filename}: expected exactly one meta description`);
    if (canonicalMatches.length !== 1)
      errors.push(`${filename}: expected exactly one canonical URL`);
    const description = config.seo?.pages?.[filename]?.description;
    if (!description) errors.push(`${filename}: missing config/site.json SEO description`);
    else if (descriptions.has(description)) errors.push(`${filename}: duplicate SEO description`);
    else descriptions.add(description);
    const canonical = canonicalMatches[0]?.[1];
    if (canonical && canonicals.has(canonical)) errors.push(`${filename}: duplicate canonical URL`);
    else if (canonical) canonicals.add(canonical);
    for (const required of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt']) {
      if (!new RegExp(`<meta\\b(?=[^>]*property=["']${required}["'])`, 'i').test(html))
        errors.push(`${filename}: missing ${required} metadata`);
    }
    if (
      !/<script\b(?=[^>]*type=["']application\/ld\+json["'])(?=[^>]*data-blue-bear-business)[^>]*>/i.test(
        html,
      )
    )
      errors.push(`${filename}: missing Electrician structured data`);
  }

  const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const expectedSitemapUrls = publicPages
    .filter((filename) => config.seo.pages[filename].indexable !== false)
    .map((filename) => {
      const route = filename === 'index.html' ? '/' : '/' + filename.replace(/\.html$/i, '');
      return config.siteUrl.replace(/\/$/, '') + route;
    });
  if (JSON.stringify(sitemapUrls) !== JSON.stringify(expectedSitemapUrls))
    errors.push('sitemap.xml does not match the configured indexable public routes');
} catch (error) {
  errors.push(`search metadata validation failed: ${error.message}`);
}

const imageManifestPath = path.join(root, 'assets', 'data', 'image-variants.json');
if (!(await exists(imageManifestPath))) errors.push('assets/data/image-variants.json is missing');
else {
  try {
    const imageManifest = JSON.parse(await readFile(imageManifestPath, 'utf8'));
    for (const [source, details] of Object.entries(imageManifest.images || {})) {
      if (!(await exists(path.join(root, source))))
        errors.push(`image metadata source is missing: ${source}`);
      const formats = new Set();
      for (const variant of details.variants || []) {
        formats.add(variant.format);
        if (!(await exists(path.join(root, variant.path))))
          errors.push(`image metadata variant is missing: ${variant.path}`);
      }
      if (!formats.has('avif') || !formats.has('webp'))
        errors.push(`image metadata lacks AVIF/WebP variants: ${source}`);
    }
  } catch (error) {
    errors.push(`assets/data/image-variants.json is invalid JSON: ${error.message}`);
  }
}

if (!htmlFiles.some((file) => path.basename(file) === 'index.html'))
  errors.push('index.html is missing');
if (warnings.length) warnings.forEach((warning) => console.warn(`WARN ${warning}`));

if (errors.length) {
  errors.forEach((error) => console.error(`FAIL ${error}`));
  process.exit(1);
}

console.log(
  `PASS ${htmlFiles.length} HTML pages, ${javascriptFiles.length} JavaScript files, and all local references validated.`,
);
