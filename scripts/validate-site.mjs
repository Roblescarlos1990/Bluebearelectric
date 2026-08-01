import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

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
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
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
  if (!/<meta\b[^>]*name=["']viewport["']/i.test(html)) errors.push(`${relative}: missing viewport metadata`);
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${relative}: missing document title`);
  if (path.dirname(relative) === '.') {
    if (!/<link\b[^>]*rel=["']icon["']/i.test(html)) errors.push(`${relative}: missing favicon metadata`);
    if (!/<link\b[^>]*rel=["']manifest["']/i.test(html)) errors.push(`${relative}: missing web manifest metadata`);
  }

  const references = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|mailto:|tel:|data:|blob:|#)/i.test(reference)) continue;
    const cleanReference = reference.split('#')[0].split('?')[0];
    if (!cleanReference) continue;
    const resolved = cleanReference.startsWith('/')
      ? path.join(root, cleanReference.slice(1))
      : path.resolve(path.dirname(htmlFile), cleanReference);
    if (!await exists(resolved)) errors.push(`${relative}: missing local asset ${reference}`);
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
if (!await exists(manifestPath)) errors.push('site.webmanifest is missing');
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
      if (!await exists(iconPath)) errors.push(`site.webmanifest: missing icon ${icon.src}`);
    }
  } catch (error) {
    errors.push(`site.webmanifest is invalid JSON: ${error.message}`);
  }
}

if (!htmlFiles.some((file) => path.basename(file) === 'index.html')) errors.push('index.html is missing');
if (warnings.length) warnings.forEach((warning) => console.warn(`WARN ${warning}`));

if (errors.length) {
  errors.forEach((error) => console.error(`FAIL ${error}`));
  process.exit(1);
}

console.log(`PASS ${htmlFiles.length} HTML pages, ${javascriptFiles.length} JavaScript files, and all local references validated.`);
