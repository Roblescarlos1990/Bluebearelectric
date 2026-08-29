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
