// Usage: node scripts/security-smoke-test.mjs https://your-domain.com
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) {
  console.error('Usage: node scripts/security-smoke-test.mjs https://your-domain.com');
  process.exit(1);
}
const checks = [];
const baseOrigin = new URL(base).origin;
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
  'Quote endpoint rejects cross-origin POST',
  `${base}/api/quote`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' },
    body: '{}',
  },
  (r, t) => r.status === 403 && !/SUPABASE_SERVICE_ROLE_KEY|TURNSTILE_SECRET_KEY/.test(t),
);
await check(
  'Quote endpoint validates malformed payloads safely',
  `${base}/api/quote`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: baseOrigin },
    body: '[]',
  },
  (r, t) => r.status === 400 && !/SUPABASE_SERVICE_ROLE_KEY|TURNSTILE_SECRET_KEY/.test(t),
);
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
await check('Admin response is private and no-store', `${base}/admin.html`, {}, (r) => {
  const cacheControl = r.headers.get('cache-control') || '';
  return cacheControl.includes('private') && cacheControl.includes('no-store');
});
await check('Enforced CSP has no executable inline allowance', `${base}/`, {}, (r) => {
  const policy = r.headers.get('content-security-policy') || '';
  return (
    policy.includes("script-src 'self'") &&
    policy.includes("script-src-attr 'none'") &&
    !policy.includes("script-src 'self' 'unsafe-inline'") &&
    !r.headers.has('content-security-policy-report-only')
  );
});

try {
  const configResponse = await fetch(`${base}/assets/js/supabase-config.js`);
  const config = await configResponse.text();
  const url = config.match(/BLUE_BEAR_SUPABASE_URL\s*=\s*'([^']+)'/)?.[1];
  const key = config.match(/BLUE_BEAR_SUPABASE_KEY\s*=\s*'([^']+)'/)?.[1];
  if (!configResponse.ok || !url || !key) {
    checks.push({ name: 'Anonymous private-record boundaries', ok: false, status: 'CONFIG' });
    console.log('FAIL Anonymous private-record boundaries: public database config unavailable');
  } else {
    const privateTables = [
      'admin_users',
      'employee_users',
      'customer_users',
      'employee_documents',
      'security_events',
      'quote_attempts',
    ];
    for (const table of privateTables) {
      await check(
        `Anonymous cannot read ${table}`,
        `${url}/rest/v1/${table}?select=id&limit=1`,
        {
          method: 'HEAD',
          headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
        },
        (r) =>
          r.status === 401 || r.status === 403 || /\/0$/.test(r.headers.get('content-range') || ''),
      );
    }
  }
} catch (error) {
  checks.push({ name: 'Anonymous private-record boundaries', ok: false, status: 'ERROR' });
  console.log(`FAIL Anonymous private-record boundaries: ${error.message}`);
}
if (checks.some((c) => !c.ok)) process.exit(1);
