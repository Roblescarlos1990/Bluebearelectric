import assert from 'node:assert/strict';
import quoteHandler from '../api/quote.js';
import securityConfigHandler from '../api/security-config.js';

const controlledEnvironmentKeys = [
  'ADMIN_NOTIFICATION_EMAIL',
  'ALLOWED_ORIGIN',
  'ALLOWED_QUOTE_COUNTRIES',
  'EMAIL_FROM',
  'GEO_MODE',
  'OPENAI_API_KEY',
  'RESEND_API_KEY',
  'SECURITY_HASH_SALT',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'TURNSTILE_ALLOWED_HOSTNAMES',
  'TURNSTILE_SECRET_KEY',
  'TURNSTILE_SITE_KEY',
];
const validBody = {
  full_name: 'Phase Nine Test',
  phone: '760-555-0199',
  email: 'phase-nine@example.com',
  city: 'El Centro',
  service_type: 'Commercial',
  urgency: 'Normal',
  message: 'Please contact me about an estimate.',
  company_website: '',
  form_started_at: Date.now() - 5_000,
  turnstile_token: '',
};

function loadHandler(fetchImplementation, environment = {}) {
  const logs = [];
  const handler = async (req, res) => {
    const originalFetch = globalThis.fetch;
    const originalConsoleError = console.error;
    const originalEnvironment = Object.fromEntries(
      controlledEnvironmentKeys.map((key) => [key, process.env[key]]),
    );

    for (const key of controlledEnvironmentKeys) delete process.env[key];
    Object.assign(process.env, {
      SUPABASE_URL: 'https://database.test',
      SUPABASE_SERVICE_ROLE_KEY: 'test-server-role-key',
      SECURITY_HASH_SALT: 'phase-nine-private-test-salt',
      ...environment,
    });
    globalThis.fetch = fetchImplementation;
    console.error = (...values) => logs.push(values);

    try {
      return await quoteHandler(req, res);
    } finally {
      globalThis.fetch = originalFetch;
      console.error = originalConsoleError;
      for (const key of controlledEnvironmentKeys) {
        if (originalEnvironment[key] === undefined) delete process.env[key];
        else process.env[key] = originalEnvironment[key];
      }
    }
  };
  return { handler, logs };
}

function request(body = validBody, overrides = {}) {
  const serialized = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    method: 'POST',
    body,
    headers: {
      'content-length': String(Buffer.byteLength(serialized)),
      'content-type': 'application/json',
      'x-forwarded-proto': 'https',
      'x-real-ip': '192.0.2.25',
      'x-vercel-ip-country': 'US',
      host: 'bluebearelectric.com',
      origin: 'https://bluebearelectric.com',
      'user-agent': 'Phase 9 security test',
      ...(overrides.headers || {}),
    },
    socket: { remoteAddress: '192.0.2.25' },
    ...overrides,
  };
}

function response() {
  const headers = new Map();
  return {
    body: '',
    headers,
    statusCode: 200,
    status(value) {
      this.statusCode = value;
      return this;
    },
    setHeader(name, value) {
      headers.set(name.toLowerCase(), String(value));
    },
    end(body = '') {
      this.body = body;
      return this;
    },
  };
}

async function invoke(handler, req) {
  const res = response();
  await handler(req, res);
  return { ...res, json: JSON.parse(res.body) };
}

async function run(name, callback) {
  try {
    await callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const noFetch = async () => {
  throw new Error('Unexpected upstream request.');
};

await run('exports ESM handlers for the Vercel runtime', async () => {
  assert.equal(typeof quoteHandler, 'function');
  assert.equal(typeof securityConfigHandler, 'function');
  const result = response();
  securityConfigHandler({}, result);
  assert.equal(JSON.parse(result.body).geoMode, 'monitor');
});

await run('rejects unsupported methods', async () => {
  const { handler } = loadHandler(noFetch);
  const result = await invoke(handler, request(undefined, { method: 'GET' }));
  assert.equal(result.statusCode, 405);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

await run('rejects a hostile browser origin', async () => {
  const { handler } = loadHandler(noFetch);
  const result = await invoke(
    handler,
    request(validBody, { headers: { origin: 'https://attacker.example' } }),
  );
  assert.equal(result.statusCode, 403);
});

await run('requires JSON and rejects malformed bodies', async () => {
  const { handler } = loadHandler(noFetch);
  const wrongType = await invoke(
    handler,
    request(validBody, { headers: { 'content-type': 'text/plain' } }),
  );
  assert.equal(wrongType.statusCode, 415);
  const malformed = await invoke(handler, request('{'));
  assert.equal(malformed.statusCode, 400);
  const arrayBody = await invoke(handler, request([]));
  assert.equal(arrayBody.statusCode, 400);
});

await run('validates lengths, phone, service, and urgency server-side', async () => {
  const { handler } = loadHandler(noFetch);
  assert.equal(
    (await invoke(handler, request({ ...validBody, message: 'x'.repeat(2501) }))).statusCode,
    400,
  );
  assert.equal(
    (await invoke(handler, request({ ...validBody, phone: 'call-me' }))).statusCode,
    400,
  );
  assert.equal(
    (await invoke(handler, request({ ...validBody, service_type: 'Unknown' }))).statusCode,
    400,
  );
  assert.equal(
    (await invoke(handler, request({ ...validBody, urgency: 'Whenever' }))).statusCode,
    400,
  );
});

await run('accepts a valid request without exposing raw rate-limit identifiers', async () => {
  const calls = [];
  const fetchMock = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    if (String(url).includes('quote_attempts?')) {
      return new Response('[]', { status: 200 });
    }
    if (String(url).endsWith('/rest/v1/leads')) {
      return Response.json([{ id: 'abcdef12-3456-7890' }], { status: 201 });
    }
    return Response.json([{}], { status: 201 });
  };
  const { handler } = loadHandler(fetchMock);
  const result = await invoke(handler, request());
  assert.equal(result.statusCode, 201);
  assert.equal(result.json.reference, 'ABCDEF12');
  const urls = calls.map(({ url }) => url).join('\n');
  assert.doesNotMatch(urls, /phase-nine@example\.com|760-555-0199|192\.0\.2\.25/);
});

await run('returns Retry-After when the durable rate limit is reached', async () => {
  const fetchMock = async (url) => {
    if (String(url).includes('quote_attempts?')) {
      return Response.json([{ id: 1 }, { id: 2 }, { id: 3 }]);
    }
    return Response.json([{}], { status: 201 });
  };
  const { handler } = loadHandler(fetchMock);
  const result = await invoke(handler, request());
  assert.equal(result.statusCode, 429);
  assert.equal(result.headers.get('retry-after'), '600');
});

await run('keeps upstream details out of responses and logs', async () => {
  const sensitiveUpstreamText = 'SUPABASE_SERVICE_ROLE_KEY=do-not-return-this';
  const fetchMock = async (url) => {
    if (String(url).includes('quote_attempts?')) return new Response('[]', { status: 200 });
    if (String(url).endsWith('/rest/v1/leads')) {
      return new Response(sensitiveUpstreamText, { status: 500 });
    }
    return Response.json([{}], { status: 201 });
  };
  const { handler, logs } = loadHandler(fetchMock);
  const result = await invoke(handler, request());
  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(result.body, /do-not-return-this|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(JSON.stringify(logs), /do-not-return-this/);
});

await run('fails closed when Turnstile cannot verify', async () => {
  const fetchMock = async (url) => {
    if (String(url).includes('challenges.cloudflare.com')) {
      return new Response('provider detail must stay private', { status: 502 });
    }
    throw new Error('Unexpected upstream request.');
  };
  const { handler, logs } = loadHandler(fetchMock, { TURNSTILE_SECRET_KEY: 'test-secret' });
  const result = await invoke(handler, request({ ...validBody, turnstile_token: 'test-token' }));
  assert.equal(result.statusCode, 503);
  assert.doesNotMatch(result.body, /provider detail/);
  assert.doesNotMatch(JSON.stringify(logs), /provider detail/);
});

console.log('Quote API security tests passed.');
