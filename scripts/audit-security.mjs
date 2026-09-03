import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pinnedSupabaseUrl =
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/dist/umd/supabase.min.js';
const pinnedSupabaseIntegrity =
  'sha384-yiVMs0R/Jyz7OhoXa/DsEMUSBLjEhr/QJta2ONO+zB6I8/GmNg/7AUFrZmAJV7KV';
const failures = [];

function fail(message) {
  failures.push(message);
}

function parseDirectives(policy) {
  return new Map(
    policy
      .split(';')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        const [name, ...sources] = value.split(/\s+/);
        return [name, sources];
      }),
  );
}

const vercel = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
const globalRule = vercel.headers.find((rule) => rule.source === '/(.*)');
const cspHeader = globalRule?.headers.find((header) => header.key === 'Content-Security-Policy');
const reportOnly = globalRule?.headers.find(
  (header) => header.key === 'Content-Security-Policy-Report-Only',
);

if (!cspHeader) fail('vercel.json is missing an enforced Content-Security-Policy header.');
if (reportOnly) fail('Report-only CSP remains configured after the enforcement phase.');

const directives = parseDirectives(cspHeader?.value || '');
const requiredDirectives = [
  'default-src',
  'base-uri',
  'object-src',
  'frame-ancestors',
  'form-action',
  'img-src',
  'style-src',
  'style-src-attr',
  'script-src',
  'script-src-attr',
  'connect-src',
  'frame-src',
  'font-src',
  'worker-src',
];
for (const directive of requiredDirectives) {
  if (!directives.has(directive)) fail(`CSP is missing ${directive}.`);
}
if (directives.get('script-src')?.includes("'unsafe-inline'")) {
  fail("script-src must not allow 'unsafe-inline'.");
}
if (directives.get('script-src')?.includes("'unsafe-eval'")) {
  fail("script-src must not allow 'unsafe-eval'.");
}
if (directives.get('script-src')?.includes('https://cdn.jsdelivr.net')) {
  fail('script-src must authorize the SDK hash rather than the entire CDN host.');
}
if (!directives.get('script-src')?.includes(`'${pinnedSupabaseIntegrity}'`)) {
  fail('script-src does not authorize the exact integrity-protected Supabase SDK.');
}
if (!directives.get('script-src-attr')?.includes("'none'")) {
  fail("script-src-attr must be set to 'none'.");
}
if (directives.get('img-src')?.includes('https:')) {
  fail('img-src must list approved hosts instead of the unrestricted https: scheme.');
}

const htmlFiles = (await readdir(root)).filter((file) => file.endsWith('.html')).sort();
let inlineJsonLd = 0;
let inlineStyleAttributes = 0;
let pinnedSdkIncludes = 0;
for (const file of htmlFiles) {
  const html = await readFile(path.join(root, file), 'utf8');
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (const match of inlineScripts) {
    const type = match[1].match(/\btype=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (type !== 'application/ld+json') {
      fail(`${file} contains executable inline JavaScript.`);
      continue;
    }
    inlineJsonLd += 1;
    const hash = `sha256-${crypto.createHash('sha256').update(match[2]).digest('base64')}`;
    if (!directives.get('script-src')?.includes(`'${hash}'`)) {
      fail(`${file} JSON-LD hash is absent from script-src (${hash}).`);
    }
  }

  if (/\son[a-z]+\s*=/i.test(html)) fail(`${file} contains an inline event handler.`);
  if (/<style\b/i.test(html)) fail(`${file} contains an inline style block.`);
  inlineStyleAttributes += [...html.matchAll(/\sstyle\s*=/gi)].length;

  for (const match of html.matchAll(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>/gi)) {
    const attributes = `${match[1]} ${match[3]}`;
    const source = match[2];
    if (!source.startsWith('https://')) continue;
    if (source !== pinnedSupabaseUrl) fail(`${file} loads an unapproved remote script: ${source}`);
    if (!attributes.includes(`integrity="${pinnedSupabaseIntegrity}"`)) {
      fail(`${file} does not verify the pinned Supabase SDK integrity.`);
    }
    if (!/crossorigin=["']anonymous["']/i.test(attributes)) {
      fail(`${file} does not use anonymous CORS for its integrity-protected SDK.`);
    }
    pinnedSdkIncludes += 1;
  }

  for (const match of html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)) {
    if (/\bhref=["']https:\/\//i.test(match[0])) {
      fail(`${file} retains a remote stylesheet dependency.`);
    }
  }
}

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean);
const projectFiles = [...new Set([...tracked, ...untracked])];
const trackedEnvironmentFiles = tracked.filter((file) => /(^|\/)\.env(?:\.|$)/.test(file));
if (trackedEnvironmentFiles.length) {
  fail(`Tracked environment file(s): ${trackedEnvironmentFiles.join(', ')}`);
}

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsb_secret_[A-Za-z0-9_-]{20,}\b/,
  /\b(?:sk_live_|sk-proj-)[A-Za-z0-9_-]{20,}\b/,
];
for (const file of projectFiles) {
  if (/\.(?:png|jpe?g|webp|avif|ico|woff2?)$/i.test(file)) continue;
  const contents = await readFile(path.join(root, file), 'utf8').catch(() => '');
  if (secretPatterns.some((pattern) => pattern.test(contents))) {
    fail(`${file} contains material matching a private-secret signature.`);
  }
}

const clientFiles = projectFiles.filter(
  (file) => file.endsWith('.html') || file.startsWith('assets/js/'),
);
const serverOnlyNames =
  /SUPABASE_SERVICE_ROLE_KEY|TURNSTILE_SECRET_KEY|RESEND_API_KEY|OPENAI_API_KEY|SECURITY_HASH_SALT/;
for (const file of clientFiles) {
  const contents = await readFile(path.join(root, file), 'utf8').catch(() => '');
  if (serverOnlyNames.test(contents)) fail(`${file} references a server-only secret name.`);
}

const quoteApi = await readFile(path.join(root, 'api', 'quote.js'), 'utf8');
if (!quoteApi.includes("createHmac('sha256'")) fail('Quote identifiers are not HMAC protected.');
if (quoteApi.includes("SECURITY_HASH_SALT || 'voltflow'")) {
  fail('Quote hashing still has a predictable fallback salt.');
}

const migrations = await Promise.all(
  projectFiles
    .filter((file) => file.startsWith('supabase/migrations/') && file.endsWith('.sql'))
    .map((file) => readFile(path.join(root, file), 'utf8')),
);
const migrationSql = migrations.join('\n');
if (!/drop policy if exists "public can create leads"/i.test(migrationSql)) {
  fail('No migration closes the anonymous direct-lead insertion policy.');
}
if (!/employee_user_id\s*=\s*\(select auth\.uid\(\)\)/i.test(migrationSql)) {
  fail('No migration pins employee-created time entries to auth.uid().');
}
if (
  !/where id = 'site-media'/i.test(migrationSql) ||
  !/where id = 'project-photos'/i.test(migrationSql)
) {
  fail('No migration applies upload limits to both managed media buckets.');
}
if (!/drop policy if exists "Public reads site media objects"/i.test(migrationSql)) {
  fail('No migration closes anonymous site-media object listing.');
}

if (failures.length) {
  console.error('Security audit failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('Security audit passed.');
console.log(`- ${htmlFiles.length} HTML entry points inspected`);
console.log(`- ${inlineJsonLd} hashed JSON-LD blocks; no executable inline scripts or handlers`);
console.log(
  `- ${inlineStyleAttributes} inventoried inline style attributes; no inline style blocks`,
);
console.log(`- ${pinnedSdkIncludes} exact, integrity-protected Supabase SDK includes`);
console.log('- enforced CSP, approved remote origins, and repository secret signatures verified');
