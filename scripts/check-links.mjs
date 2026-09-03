import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function idsIn(html) {
  return new Set([...html.matchAll(/\b(?:id|name)=["']([^"']+)["']/gi)].map((match) => match[1]));
}

function resolveReference(sourceFile, pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidate = decoded.startsWith('/')
    ? path.join(root, decoded.slice(1))
    : path.resolve(path.dirname(sourceFile), decoded);
  return path.extname(candidate) || candidate.endsWith(path.sep) ? candidate : `${candidate}.html`;
}

const htmlFiles = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => path.join(root, entry.name));

for (const sourceFile of htmlFiles) {
  const sourceName = path.basename(sourceFile);
  const html = await readFile(sourceFile, 'utf8');
  const references = [...html.matchAll(/\b(?:href|src|action)=["']([^"']+)["']/gi)].map((match) =>
    match[1].trim(),
  );

  for (const reference of references) {
    if (!reference || /^(?:https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(reference)) {
      continue;
    }

    const [pathname, fragment = ''] = reference.split('#', 2);
    const targetFile = pathname ? resolveReference(sourceFile, pathname.split('?')[0]) : sourceFile;

    if (!(await exists(targetFile))) {
      failures.push(`${sourceName}: missing target ${reference}`);
      continue;
    }

    if (fragment && path.extname(targetFile).toLowerCase() === '.html') {
      const targetHtml = await readFile(targetFile, 'utf8');
      if (!idsIn(targetHtml).has(decodeURIComponent(fragment))) {
        failures.push(`${sourceName}: missing fragment target ${reference}`);
      }
    }
  }
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log(`PASS ${htmlFiles.length} runtime HTML pages have valid local links and fragments.`);
