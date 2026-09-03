import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const writeReport = process.argv.includes('--write');
const checkReport = process.argv.includes('--check');
const reportPath = path.join(root, 'docs', 'baselines', 'phase-7', 'javascript-inventory.json');
const guidePath = path.join(root, 'docs', 'JAVASCRIPT-INVENTORY.md');

if (writeReport && checkReport) throw new Error('Use either --write or --check, not both.');

const project = JSON.parse(await readFile(path.join(root, 'PROJECT-MANIFEST.json'), 'utf8'));
const htmlFiles = (await readdir(root))
  .filter((filename) => filename.endsWith('.html'))
  .sort((left, right) => left.localeCompare(right));
const javascriptDirectory = path.join(root, project.runtime.javascript_directory);
const moduleFiles = (await readdir(javascriptDirectory))
  .filter((filename) => filename.endsWith('.js'))
  .sort((left, right) => left.localeCompare(right));

const pagesByModule = new Map(moduleFiles.map((filename) => [filename, []]));
const duplicates = [];
const missingModules = [];
const pageScripts = {};

for (const filename of htmlFiles) {
  const html = await readFile(path.join(root, filename), 'utf8');
  const sources = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1].split(/[?#]/, 1)[0].replaceAll('\\', '/'))
    .filter((source) => source.startsWith(project.runtime.javascript_directory + '/'));
  pageScripts[filename] = sources.map((source) => path.posix.basename(source));

  const counts = new Map();
  for (const source of sources) {
    const moduleName = path.posix.basename(source);
    counts.set(moduleName, (counts.get(moduleName) || 0) + 1);
    if (!pagesByModule.has(moduleName)) {
      missingModules.push({ page: filename, module: moduleName });
      continue;
    }
    pagesByModule.get(moduleName).push(filename);
  }
  for (const [moduleName, count] of counts) {
    if (count > 1) duplicates.push({ page: filename, module: moduleName, count });
  }
}

const standardDomEvents = new Set([
  'abort',
  'animationend',
  'beforeinput',
  'blur',
  'change',
  'click',
  'DOMContentLoaded',
  'dragend',
  'error',
  'focus',
  'focusin',
  'focusout',
  'input',
  'invalid',
  'keydown',
  'keyup',
  'load',
  'message',
  'mouseleave',
  'mousemove',
  'offline',
  'online',
  'pointerdown',
  'pointercancel',
  'pointerenter',
  'pointerleave',
  'pointermove',
  'pointerup',
  'popstate',
  'resize',
  'scroll',
  'storage',
  'submit',
  'touchend',
  'touchstart',
  'transitionend',
  'visibilitychange',
  'wheel',
]);

function sorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function collect(source, expression, group = 1) {
  return [...source.matchAll(expression)].map((match) => match[group]).filter(Boolean);
}

function camelToKebab(value) {
  return value.replace(/[A-Z]/g, (character) => '-' + character.toLowerCase());
}

function extractContracts(source) {
  const stringConstants = new Map(
    [...source.matchAll(/\bconst\s+([a-zA-Z_$][\w$]*)\s*=\s*(["'`])([^"'`]+)\2/g)].map((match) => [
      match[1],
      match[3],
    ]),
  );
  const storage = [
    ...source.matchAll(
      /\b(localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\(\s*(["'`])([^"'`]+)\2/g,
    ),
  ].map((match) => ({ type: match[1], key: match[3] }));
  for (const match of source.matchAll(
    /\b(localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\(\s*([a-zA-Z_$][\w$]*)/g,
  )) {
    const key = stringConstants.get(match[2]);
    if (key) storage.push({ type: match[1], key });
  }
  const buckets = sorted(
    collect(source, /\b(?:client|c)\.storage\s*\.\s*from\(\s*(["'`])([^"'`]+)\1/g, 2),
  );
  const fromTargets = sorted(collect(source, /\b(?:client|c)\.from\(\s*(["'`])([^"'`]+)\1/g, 2));
  const dataAttributes = sorted([
    ...collect(source, /\[\s*(data-[a-z0-9-]+)/gi),
    ...collect(source, /\b(data-[a-z0-9-]+)\s*=/gi),
    ...collect(source, /\.(?:get|set|has|remove)Attribute\(\s*(["'])(data-[a-z0-9-]+)\1/gi, 2),
    ...collect(source, /\.dataset\.([a-zA-Z0-9_$]+)/g).map((name) => 'data-' + camelToKebab(name)),
  ]);
  const listenedEvents = sorted(
    collect(source, /\.addEventListener\(\s*(["'])([^"']+)\1/g, 2).filter(
      (eventName) => !standardDomEvents.has(eventName),
    ),
  );
  const dispatchedEvents = sorted(
    [
      ...collect(source, /new\s+(?:CustomEvent|Event)\(\s*(["'])([^"']+)\1/g, 2),
      ...collect(source, /\.dispatchEvent\(\s*(["'])([^"']+)\1/g, 2),
    ].filter((eventName) => !standardDomEvents.has(eventName)),
  );

  return {
    localStorageKeys: sorted(
      storage.filter((entry) => entry.type === 'localStorage').map((entry) => entry.key),
    ),
    sessionStorageKeys: sorted(
      storage.filter((entry) => entry.type === 'sessionStorage').map((entry) => entry.key),
    ),
    supabaseTables: fromTargets.filter((target) => !buckets.includes(target)),
    supabaseBuckets: buckets,
    supabaseRpcCalls: sorted(collect(source, /\.rpc\(\s*(["'`])([^"'`]+)\1/g, 2)),
    dynamicSupabaseTargets: sorted(
      collect(source, /\b(?:client|c)\.from\(\s*([^"'`)][^)]*)\)/g).map((target) => target.trim()),
    ),
    customEventsListened: listenedEvents,
    customEventsDispatched: dispatchedEvents,
    dataAttributes,
    fetchTargets: sorted(collect(source, /\bfetch\(\s*(["'`])([^"'`]+)\1/g, 2)),
  };
}

const modules = {};
for (const filename of moduleFiles) {
  const absolutePath = path.join(javascriptDirectory, filename);
  const source = await readFile(absolutePath, 'utf8');
  const fileStat = await stat(absolutePath);
  modules[filename] = {
    bytes: fileStat.size,
    pages: sorted(pagesByModule.get(filename)),
    ...extractContracts(source),
  };
}

const unusedModules = moduleFiles.filter((filename) => modules[filename].pages.length === 0);
const dispatchedEvents = new Set(
  Object.values(modules).flatMap((moduleRecord) => moduleRecord.customEventsDispatched),
);
const orphanedEventListeners = Object.entries(modules).flatMap(([filename, moduleRecord]) =>
  moduleRecord.customEventsListened
    .filter((eventName) => !dispatchedEvents.has(eventName))
    .map((eventName) => ({ module: filename, event: eventName })),
);

const report = {
  summary: {
    pages: htmlFiles.length,
    modules: moduleFiles.length,
    activeModules: moduleFiles.length - unusedModules.length,
    unusedModules: unusedModules.length,
    duplicatePageLoads: duplicates.length,
    missingModules: missingModules.length,
    orphanedCustomEventListeners: orphanedEventListeners.length,
  },
  unusedModules,
  duplicatePageLoads: duplicates,
  missingModules,
  orphanedCustomEventListeners: orphanedEventListeners,
  pageScripts,
  modules,
};

function inlineList(values, emptyText = 'None') {
  return values.length ? values.map((value) => '`' + value + '`').join(', ') : emptyText;
}

function moduleRows() {
  return Object.entries(modules)
    .map(
      ([filename, record]) =>
        `| \`${filename}\` | ${record.bytes.toLocaleString('en-US')} | ${record.pages.map((page) => `\`${page}\``).join(', ')} |`,
    )
    .join('\n');
}

function contractRows() {
  return Object.entries(modules)
    .filter(([, record]) =>
      [
        record.localStorageKeys,
        record.sessionStorageKeys,
        record.supabaseTables,
        record.supabaseBuckets,
        record.supabaseRpcCalls,
        record.dynamicSupabaseTargets,
        record.customEventsListened,
        record.customEventsDispatched,
        record.fetchTargets,
      ].some((values) => values.length),
    )
    .map(([filename, record]) => {
      const storageKeys = [
        ...record.localStorageKeys.map((key) => `local:${key}`),
        ...record.sessionStorageKeys.map((key) => `session:${key}`),
      ];
      const events = [
        ...record.customEventsListened.map((eventName) => `listen:${eventName}`),
        ...record.customEventsDispatched.map((eventName) => `dispatch:${eventName}`),
      ];
      return `| \`${filename}\` | ${inlineList(storageKeys)} | ${inlineList(record.supabaseTables)} | ${inlineList(record.supabaseBuckets)} | ${inlineList(record.supabaseRpcCalls)} | ${inlineList(record.dynamicSupabaseTargets)} | ${inlineList(events)} | ${inlineList(record.fetchTargets)} |`;
    })
    .join('\n');
}

function dataAttributeSections() {
  return Object.entries(modules)
    .filter(([, record]) => record.dataAttributes.length)
    .map(
      ([filename, record]) =>
        `- \`${filename}\`: ${record.dataAttributes.map((attribute) => `\`${attribute}\``).join(', ')}`,
    )
    .join('\n');
}

const markdown = `# JavaScript Runtime Inventory

This file is generated by \`npm run js:audit\`. It records the active browser-module graph and the
client-side contracts that must be preserved during cleanup. Run \`npm run js:check\` in CI to reject
unreferenced modules, duplicate page loads, missing files, orphaned custom-event listeners, or stale
inventory output.

## Gate summary

| Check | Result |
| --- | ---: |
| Root HTML routes scanned | ${report.summary.pages} |
| Browser modules | ${report.summary.modules} |
| Modules loaded by a route | ${report.summary.activeModules} |
| Unused modules | ${report.summary.unusedModules} |
| Duplicate script loads | ${report.summary.duplicatePageLoads} |
| Missing referenced modules | ${report.summary.missingModules} |
| Orphaned custom-event listeners | ${report.summary.orphanedCustomEventListeners} |

## Page-to-module map

| Module | Bytes | Loaded by |
| --- | ---: | --- |
${moduleRows()}

## Runtime contracts by module

Static Supabase table and bucket names are separated below. Dynamic table expressions are listed
verbatim and require manual review. No service-role credential is present in browser code. An empty
RPC column means the browser modules make no Supabase RPC calls.

| Module | Web storage | Supabase tables | Storage buckets | RPC | Dynamic tables | Custom events | Fetch targets |
| --- | --- | --- | --- | --- | --- | --- | --- |
${contractRows()}

## Data-attribute hooks by module

These selectors and generated-markup attributes form the DOM contract between HTML, CSS, and
JavaScript. Renaming one requires a coordinated markup, styling, and browser-test change.

${dataAttributeSections()}

## Security and ownership boundaries

- Public modules may submit a quote or read explicitly published website content; they do not expose
  administrator CRUD controls.
- Employee and administrator modules remain separate entry points but reuse the shared authenticated
  Supabase client initialized by \`supabase-config.js\`.
- Authorization remains enforced by Supabase authentication, table policies, storage policies, and
  the administrator-membership queries. Hiding a button or panel is not treated as authorization.
- The publishable browser key in \`supabase-config.js\` is not a service-role key. RLS and storage
  policies remain the authority for every browser request.
- Historical portal implementations were removed in Phase 7 after the route graph confirmed that no
  root page loaded them. Git history remains the recovery path.
`;

const prettierConfig = (await resolveConfig(root)) || {};
const json = await format(JSON.stringify(report), { ...prettierConfig, parser: 'json' });
const markdownOutput = await format(markdown.trimEnd() + '\n', {
  ...prettierConfig,
  parser: 'markdown',
});
const errors = [];
if (unusedModules.length) errors.push('Unused modules: ' + unusedModules.join(', '));
if (duplicates.length)
  errors.push(
    'Duplicate page loads: ' +
      duplicates.map((entry) => `${entry.page}:${entry.module} (${entry.count})`).join(', '),
  );
if (missingModules.length)
  errors.push(
    'Missing modules: ' + missingModules.map((entry) => `${entry.page}:${entry.module}`).join(', '),
  );
if (orphanedEventListeners.length)
  errors.push(
    'Orphaned custom event listeners: ' +
      orphanedEventListeners.map((entry) => `${entry.module}:${entry.event}`).join(', '),
  );

if (writeReport) {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, json);
  await writeFile(guidePath, markdownOutput);
}

if (checkReport) {
  const [committedReport, committedGuide] = await Promise.all([
    readFile(reportPath, 'utf8'),
    readFile(guidePath, 'utf8'),
  ]);
  if (committedReport !== json || committedGuide !== markdownOutput)
    errors.push('Generated inventory is stale; run npm run js:audit.');
}

console.log(
  `JavaScript audit: ${report.summary.activeModules}/${report.summary.modules} active, ` +
    `${duplicates.length} duplicate loads, ${missingModules.length} missing references.`,
);

if (errors.length) {
  for (const error of errors) console.error('- ' + error);
  process.exitCode = 1;
}
