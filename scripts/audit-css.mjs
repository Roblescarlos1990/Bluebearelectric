import { execFile as execFileCallback } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedFiles = process.argv.filter((argument) => argument.endsWith('.css'));
const filenames = requestedFiles.length ? requestedFiles : ['style.css', 'theme.css', 'portal.css'];
const outputIndex = process.argv.indexOf('--output');
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
const refIndex = process.argv.indexOf('--ref');
const gitRef = refIndex >= 0 ? process.argv[refIndex + 1] : null;
const quiet = process.argv.includes('--quiet');
const focusSelectors = ['.hero', '.nav', '.section', '.brand img', '.btn', 'button'];
const execFile = promisify(execFileCallback);

async function readCss(filename) {
  if (!gitRef) return readFile(path.join(root, filename), 'utf8');
  const { stdout } = await execFile('git', ['show', `${gitRef}:${filename}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout;
}

function splitSelectors(selector) {
  try {
    return selectorParser()
      .astSync(selector)
      .nodes.map((node) => String(node).trim());
  } catch {
    return [selector.trim()];
  }
}

function contextFor(node) {
  const context = [];
  let parent = node.parent;
  while (parent && parent.type !== 'root') {
    if (parent.type === 'atrule') context.unshift('@' + parent.name + ' ' + parent.params);
    parent = parent.parent;
  }
  return context.join(' > ') || 'root';
}

function declarationsFor(rule) {
  return rule.nodes
    .filter((node) => node.type === 'decl')
    .map((declaration) => ({
      property: declaration.prop,
      value: declaration.value,
      important: Boolean(declaration.important),
    }));
}

function declarationSignature(declarations) {
  return declarations
    .map(
      (declaration) =>
        declaration.property +
        ':' +
        declaration.value +
        (declaration.important ? '!important' : ''),
    )
    .join(';');
}

function countDuplicateDeclarations(rule) {
  const seen = new Set();
  let duplicates = 0;
  for (const declaration of declarationsFor(rule)) {
    const signature = declarationSignature([declaration]);
    if (seen.has(signature)) duplicates += 1;
    seen.add(signature);
  }
  return duplicates;
}

function isKeyframeStep(rule) {
  let parent = rule.parent;
  while (parent && parent.type !== 'root') {
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return true;
    parent = parent.parent;
  }
  return false;
}

const report = {
  generatedAt: new Date().toISOString(),
  files: {},
  summary: {
    bytes: 0,
    lines: 0,
    rules: 0,
    declarations: 0,
    repeatedSelectorOccurrences: 0,
    exactDuplicateRuleOccurrences: 0,
    duplicateDeclarationsWithinRules: 0,
  },
};

for (const filename of filenames) {
  const css = await readCss(filename);
  const tree = postcss.parse(css, { from: filename });
  const rules = [];
  const selectorOccurrences = new Map();
  const exactRuleOccurrences = new Map();
  const breakpoints = new Map();
  let declarationCount = 0;
  let duplicateDeclarationsWithinRules = 0;

  tree.walkAtRules('media', (atRule) => {
    const key = atRule.params.trim();
    breakpoints.set(key, (breakpoints.get(key) || 0) + 1);
  });

  tree.walkRules((rule) => {
    const selectors = splitSelectors(rule.selector);
    const declarations = declarationsFor(rule);
    const context = contextFor(rule);
    const record = {
      selector: rule.selector,
      selectors,
      context,
      line: rule.source?.start?.line || null,
      declarations,
    };
    rules.push(record);
    declarationCount += declarations.length;
    duplicateDeclarationsWithinRules += countDuplicateDeclarations(rule);

    if (isKeyframeStep(rule)) return;

    for (const selector of selectors) {
      const list = selectorOccurrences.get(selector) || [];
      list.push({ line: record.line, context, declarations });
      selectorOccurrences.set(selector, list);
    }

    const exactKey =
      context + '|' + rule.selector.trim() + '|' + declarationSignature(declarations);
    const exactList = exactRuleOccurrences.get(exactKey) || [];
    exactList.push({ line: record.line, selector: rule.selector, context });
    exactRuleOccurrences.set(exactKey, exactList);
  });

  const repeatedSelectors = [...selectorOccurrences.entries()]
    .filter(([, occurrences]) => occurrences.length > 1)
    .map(([selector, occurrences]) => ({ selector, occurrences }))
    .sort((left, right) =>
      right.occurrences.length === left.occurrences.length
        ? left.selector.localeCompare(right.selector)
        : right.occurrences.length - left.occurrences.length,
    );
  const exactDuplicateRules = [...exactRuleOccurrences.values()]
    .filter((occurrences) => occurrences.length > 1)
    .sort((left, right) => right.length - left.length);
  const repeatedSelectorOccurrences = repeatedSelectors.reduce(
    (sum, entry) => sum + entry.occurrences.length - 1,
    0,
  );
  const exactDuplicateRuleOccurrences = exactDuplicateRules.reduce(
    (sum, occurrences) => sum + occurrences.length - 1,
    0,
  );

  report.files[filename] = {
    bytes: Buffer.byteLength(css),
    lines: css.split(/\r?\n/).length,
    rules: rules.length,
    declarations: declarationCount,
    repeatedSelectors: repeatedSelectors.slice(0, 80).map((entry) => ({
      selector: entry.selector,
      occurrences: entry.occurrences.map(({ line, context }) => ({ line, context })),
    })),
    repeatedSelectorCount: repeatedSelectors.length,
    repeatedSelectorOccurrences,
    exactDuplicateRules,
    exactDuplicateRuleOccurrences,
    duplicateDeclarationsWithinRules,
    breakpoints: [...breakpoints.entries()]
      .map(([query, count]) => ({ query, count }))
      .sort((left, right) => left.query.localeCompare(right.query)),
    focusSelectors: Object.fromEntries(
      focusSelectors.map((selector) => [selector, selectorOccurrences.get(selector) || []]),
    ),
  };

  report.summary.bytes += Buffer.byteLength(css);
  report.summary.lines += css.split(/\r?\n/).length;
  report.summary.rules += rules.length;
  report.summary.declarations += declarationCount;
  report.summary.repeatedSelectorOccurrences += repeatedSelectorOccurrences;
  report.summary.exactDuplicateRuleOccurrences += exactDuplicateRuleOccurrences;
  report.summary.duplicateDeclarationsWithinRules += duplicateDeclarationsWithinRules;
}

const serialized = JSON.stringify(report, null, 2) + '\n';
if (outputPath) await writeFile(path.resolve(root, outputPath), serialized, 'utf8');
process.stdout.write(quiet ? JSON.stringify(report.summary) + '\n' : serialized);
