// Usage: node scripts/security-smoke-test.mjs https://your-domain.com
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) {
  console.error('Usage: node scripts/security-smoke-test.mjs https://your-domain.com');
  process.exit(1);
}
const checks = [];
async function check(name, url, options, expect) {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    const ok = expect(response, text);
    checks.push({ name, ok, status: response.status });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (${response.status})`);
  } catch (error) {
    checks.push({ name, ok: false, status: 'ERROR' });
    console.log(`FAIL ${name}: ${error.message}`);
  }
}
await check(
  'Security config endpoint',
  `${base}/api/security-config`,
  {},
  (r, t) => r.ok && t.includes('turnstileEnabled'),
);
await check('Quote endpoint rejects GET', `${base}/api/quote`, {}, (r) => r.status === 405);
await check(
  'Robots policy',
  `${base}/robots.txt`,
  {},
  (r, t) => r.ok && t.includes('GPTBot') && t.includes('/admin.html'),
);
await check('Security contact', `${base}/.well-known/security.txt`, {}, (r) => r.ok);
await check('Admin noindex header', `${base}/admin.html`, {}, (r) =>
  (r.headers.get('x-robots-tag') || '').includes('noindex'),
);
if (checks.some((c) => !c.ok)) process.exit(1);
