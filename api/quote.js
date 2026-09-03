import crypto from 'node:crypto';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};
const MAX_BODY_BYTES = 24_000;
const DEFAULT_ALLOWED_COUNTRIES = ['US', 'CA', 'MX'];
const ALLOWED_SERVICE_TYPES = new Set([
  'Industrial',
  'Commercial',
  'Residential',
  'Solar / BESS',
  'Emergency Repair',
  'Maintenance',
]);
const ALLOWED_URGENCY_LEVELS = new Set(['Normal', 'This Week', 'Emergency']);
const UPSTREAM_TIMEOUT_MS = 4_500;

class UpstreamRequestError extends Error {
  constructor(provider, status) {
    super(`${provider} request failed.`);
    this.name = 'UpstreamRequestError';
    this.provider = provider;
    this.status = status;
  }
}

function safeLog(label, error) {
  console.error(label, {
    name: error?.name || 'Error',
    provider: error?.provider || undefined,
    status: Number.isFinite(error?.status) ? error.status : undefined,
  });
}

function upstreamSignal() {
  return AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
}

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', JSON_HEADERS['Content-Type']);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.end(JSON.stringify(body));
}

function normalize(value, max = 500) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
function hash(value) {
  const secret = process.env.SECURITY_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Server security configuration is incomplete.');
  return crypto
    .createHmac('sha256', secret)
    .update(String(value || ''))
    .digest('hex');
}
function getIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return forwarded || String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
}
function getCountry(req) {
  return String(
    req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || 'XX',
  ).toUpperCase();
}
function allowedOrigin(req) {
  const configured = String(process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, '').toLowerCase())
    .filter(Boolean);
  const origin = String(req.headers.origin || '').replace(/\/$/, '');
  if (!origin) return true;

  const host = String(req.headers.host || '').toLowerCase();
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  const protocol = forwardedProtocol || (host.startsWith('localhost:') ? 'http' : 'https');
  const sameOrigin = host && origin.toLowerCase() === `${protocol}://${host}`;
  const defaults = ['https://bluebearelectric.com', 'https://www.bluebearelectric.com'];
  return (
    sameOrigin ||
    defaults.includes(origin.toLowerCase()) ||
    configured.includes(origin.toLowerCase())
  );
}
async function supabase(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server database configuration is incomplete.');
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    signal: upstreamSignal(),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new UpstreamRequestError('database', response.status);
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new UpstreamRequestError('database', 502);
  }
  return data;
}
async function verifyTurnstile(token, ip, requestHost) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { success: true, skipped: true };
  if (!token) return { success: false, reason: 'missing-token' };
  const body = new URLSearchParams({ secret, response: token, remoteip: ip });
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    signal: upstreamSignal(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!response.ok) throw new UpstreamRequestError('turnstile', response.status);
  const result = await response.json();
  if (result.success && result.action && result.action !== 'quote') {
    return { success: false, reason: 'unexpected-action' };
  }
  if (result.success) {
    const verifiedHostname = String(result.hostname || '').toLowerCase();
    const requestHostname = String(requestHost || '')
      .split(':')[0]
      .toLowerCase();
    const allowedHostnames = new Set(
      [
        'bluebearelectric.com',
        'www.bluebearelectric.com',
        requestHostname,
        ...String(process.env.TURNSTILE_ALLOWED_HOSTNAMES || '')
          .split(',')
          .map((value) => value.trim().toLowerCase()),
      ].filter(Boolean),
    );
    if (!verifiedHostname || !allowedHostnames.has(verifiedHostname)) {
      return { success: false, reason: 'unexpected-hostname' };
    }
  }
  return result;
}
async function countAttempts(column, value, sinceIso, acceptedOnly = true) {
  const accepted = acceptedOnly ? '&accepted=eq.true' : '';
  const result = await supabase(
    `quote_attempts?select=id&${column}=eq.${encodeURIComponent(value)}&created_at=gte.${encodeURIComponent(sinceIso)}${accepted}`,
    { method: 'GET' },
  );
  return Array.isArray(result) ? result.length : 0;
}
async function recordAttempt(row) {
  try {
    await supabase('quote_attempts', { method: 'POST', body: JSON.stringify(row) });
  } catch (error) {
    safeLog('quote_attempt_log_failed', error);
  }
}
async function recordEvent(event_type, severity, details) {
  try {
    await supabase('security_events', {
      method: 'POST',
      body: JSON.stringify({
        event_type,
        severity,
        route: '/api/quote',
        country: details.country,
        ip_hash: details.ip_hash,
        reason: details.reason || null,
        metadata: details.metadata || {},
      }),
    });
  } catch (error) {
    safeLog('security_event_log_failed', error);
  }
}
function suspiciousText(payload) {
  const joined =
    `${payload.full_name} ${payload.email} ${payload.city} ${payload.message}`.toLowerCase();
  const links = (joined.match(/https?:\/\//g) || []).length;
  const spamTerms = [
    'crypto investment',
    'guest post',
    'seo service',
    'backlinks',
    'casino',
    'viagra',
    'loan approval',
  ];
  return links > 2 || spamTerms.some((term) => joined.includes(term));
}

async function buildAcknowledgement(payload, reference) {
  const fallback = `Hi ${payload.full_name},

Thank you for contacting Blue Bear Electric regarding ${payload.service_type.toLowerCase()} electrical service.

We received your request${payload.city ? ` for the ${payload.city} area` : ''}. A member of our team will review the details and contact you to confirm the next step. For urgent electrical conditions, please call 760-234-8306.

Reference: ${reference || 'Pending'}

Blue Bear Electric
Powered by VoltFlow`;

  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: upstreamSignal(),
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EMAIL_MODEL || 'gpt-5-mini',
        input: [
          {
            role: 'system',
            content:
              'Write a concise, professional acknowledgement email for Blue Bear Electric. Do not promise pricing, arrival times, code compliance, or availability. Mention that a team member will review the request. Return only the email body.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              name: payload.full_name,
              service: payload.service_type,
              urgency: payload.urgency,
              city: payload.city,
              message: payload.message,
              reference,
            }),
          },
        ],
        max_output_tokens: 280,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new UpstreamRequestError('email-copy', response.status);
    return data.output_text || fallback;
  } catch (error) {
    safeLog('ai_email_generation_failed', error);
    return fallback;
  }
}
async function sendAcknowledgement(payload, reference, body) {
  if (!process.env.RESEND_API_KEY) return { skipped: true };
  const sendingDomain = normalize(process.env.RESEND_EMAIL_DOMAIN, 253);
  const from =
    process.env.ADMIN_FROM_EMAIL ||
    (sendingDomain
      ? `Blue Bear Electric <estimates@${sendingDomain}>`
      : 'Blue Bear Electric <onboarding@resend.dev>');
  const adminNotificationEmail = normalize(process.env.ADMIN_NOTIFICATION_EMAIL, 254);
  const replyTo = process.env.ADMIN_REPLY_TO_EMAIL || adminNotificationEmail || undefined;

  if (!payload.email && !adminNotificationEmail) return { skipped: true };

  if (payload.email) {
    const customer = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: upstreamSignal(),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `blue-bear-estimate-customer-${reference || hash(payload.email)}`,
      },
      body: JSON.stringify({
        from,
        to: [payload.email],
        reply_to: replyTo,
        subject: `We received your estimate request${reference ? ` — ${reference}` : ''}`,
        text: body,
      }),
    });
    if (!customer.ok) throw new UpstreamRequestError('customer-email', customer.status);
  }

  if (adminNotificationEmail) {
    const admin = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: upstreamSignal(),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `blue-bear-estimate-admin-${reference || hash(payload.phone)}`,
      },
      body: JSON.stringify({
        from,
        to: [adminNotificationEmail],
        reply_to: payload.email || undefined,
        subject: `New ${payload.service_type} estimate request — ${payload.full_name}`,
        text: `New lead received.\n\nName: ${payload.full_name}\nPhone: ${payload.phone}\nEmail: ${payload.email || 'Not provided'}\nCity: ${payload.city || 'Not provided'}\nUrgency: ${payload.urgency}\nService: ${payload.service_type}\nReference: ${reference || 'Pending'}\n\nMessage:\n${payload.message || 'No message provided.'}`,
      }),
    });
    if (!admin.ok) throw new UpstreamRequestError('admin-email', admin.status);
  }

  return {
    sent: true,
    customer_sent: Boolean(payload.email),
    admin_sent: Boolean(adminNotificationEmail),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method not allowed.' });
  if (!allowedOrigin(req))
    return json(res, 403, { ok: false, message: 'Request origin is not allowed.' });

  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    return json(res, 415, { ok: false, message: 'Content type must be application/json.' });
  }

  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES)
    return json(res, 413, { ok: false, message: 'Request is too large.' });

  let body = req.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
      return json(res, 413, { ok: false, message: 'Request is too large.' });
    }
    try {
      body = JSON.parse(body);
    } catch {
      return json(res, 400, { ok: false, message: 'Invalid request format.' });
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json(res, 400, { ok: false, message: 'Invalid request format.' });
  }
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
    return json(res, 413, { ok: false, message: 'Request is too large.' });
  }

  const fieldLimits = {
    full_name: 120,
    phone: 50,
    email: 160,
    city: 120,
    service_type: 100,
    urgency: 50,
    message: 2500,
    company_website: 200,
    turnstile_token: 4000,
  };
  const oversizedField = Object.entries(fieldLimits).find(
    ([field, limit]) => String(body[field] ?? '').length > limit,
  );
  if (oversizedField) {
    return json(res, 400, { ok: false, message: 'One or more fields are too long.' });
  }

  const payload = {
    full_name: normalize(body.full_name, 120),
    phone: normalize(body.phone, 50),
    email: normalize(body.email, 160).toLowerCase(),
    city: normalize(body.city, 120),
    service_type: normalize(body.service_type, 100),
    urgency: normalize(body.urgency || 'Normal', 50),
    message: normalize(body.message, 2500),
    source: 'website-secure-api',
    status: 'New',
  };

  if (!payload.full_name || !payload.phone || !payload.service_type) {
    return json(res, 400, {
      ok: false,
      message: 'Name, phone number, and service needed are required.',
    });
  }
  const phoneDigits = payload.phone.replace(/\D/g, '');
  if (!/^[+()\d.\s-]+$/.test(payload.phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return json(res, 400, { ok: false, message: 'Please enter a valid phone number.' });
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return json(res, 400, { ok: false, message: 'Please enter a valid email address.' });
  }
  if (!ALLOWED_SERVICE_TYPES.has(payload.service_type)) {
    return json(res, 400, { ok: false, message: 'Please choose a valid service.' });
  }
  if (!ALLOWED_URGENCY_LEVELS.has(payload.urgency)) {
    return json(res, 400, { ok: false, message: 'Please choose a valid urgency.' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    safeLog('quote_security_configuration_failed', new Error('Missing server configuration.'));
    return json(res, 503, {
      ok: false,
      message: 'The request system is temporarily unavailable. Please call 760-234-8306.',
    });
  }

  const ip = getIp(req);
  const country = getCountry(req);
  const ip_hash = hash(ip);
  const userAgent = normalize(req.headers['user-agent'], 300);
  const allowedCountries = String(
    process.env.ALLOWED_QUOTE_COUNTRIES || DEFAULT_ALLOWED_COUNTRIES.join(','),
  )
    .split(',')
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
  const geoMode = String(process.env.GEO_MODE || 'monitor').toLowerCase();
  const email_hash = hash(payload.email || 'none');
  const phone_hash = hash(payload.phone || 'none');
  const baseAttempt = {
    ip_hash,
    email_hash,
    phone_hash,
    country,
    user_agent: userAgent,
    accepted: false,
    reason: null,
  };

  if (normalize(body.company_website, 200)) {
    await recordAttempt({ ...baseAttempt, reason: 'honeypot' });
    await recordEvent('quote_spam_blocked', 'medium', { country, ip_hash, reason: 'honeypot' });
    return json(res, 200, { ok: true, message: 'Request received.' });
  }

  const startedAt = Number(body.form_started_at || 0);
  if (!startedAt || Date.now() - startedAt < 1800) {
    await recordAttempt({ ...baseAttempt, reason: 'submitted_too_fast' });
    await recordEvent('quote_spam_blocked', 'low', {
      country,
      ip_hash,
      reason: 'submitted_too_fast',
    });
    return json(res, 400, { ok: false, message: 'Please review the form and try again.' });
  }

  if (suspiciousText(payload)) {
    await recordAttempt({ ...baseAttempt, reason: 'spam_content' });
    await recordEvent('quote_spam_blocked', 'medium', { country, ip_hash, reason: 'spam_content' });
    return json(res, 400, {
      ok: false,
      message: 'Please remove links or promotional content and try again.',
    });
  }
  if (!allowedCountries.includes(country)) {
    await recordEvent('quote_geo_flagged', geoMode === 'restrict' ? 'medium' : 'low', {
      country,
      ip_hash,
      reason: 'outside_service_region',
    });
    if (geoMode === 'restrict')
      return json(res, 403, {
        ok: false,
        message: 'Online requests are limited to supported regions. Please call us for assistance.',
      });
  }

  let turnstile;
  try {
    turnstile = await verifyTurnstile(normalize(body.turnstile_token, 4000), ip, req.headers.host);
  } catch (error) {
    safeLog('turnstile_verification_failed', error);
    return json(res, 503, {
      ok: false,
      message: 'Security verification is temporarily unavailable. Please try again.',
    });
  }
  if (!turnstile.success) {
    await recordAttempt({ ...baseAttempt, reason: 'turnstile_failed' });
    await recordEvent('quote_bot_challenge_failed', 'medium', {
      country,
      ip_hash,
      reason: 'turnstile_failed',
      metadata: { codes: turnstile['error-codes'] || [] },
    });
    return json(res, 403, {
      ok: false,
      message: 'We could not verify this request. Please refresh and try again.',
    });
  }

  const now = Date.now();
  const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  let ip10;
  let ip24;
  let email24;
  let phone24;
  try {
    [ip10, ip24, email24, phone24] = await Promise.all([
      countAttempts('ip_hash', ip_hash, tenMinutesAgo),
      countAttempts('ip_hash', ip_hash, dayAgo),
      payload.email ? countAttempts('email_hash', email_hash, dayAgo) : 0,
      countAttempts('phone_hash', phone_hash, dayAgo),
    ]);
  } catch (error) {
    safeLog('quote_rate_limit_check_failed', error);
    return json(res, 503, {
      ok: false,
      message: 'The request system is temporarily unavailable. Please call 760-234-8306.',
    });
  }
  if (ip10 >= 3 || ip24 >= 8 || email24 >= 3 || phone24 >= 3) {
    await recordAttempt({ ...baseAttempt, reason: 'rate_limited' });
    await recordEvent('quote_rate_limited', 'medium', {
      country,
      ip_hash,
      reason: 'rate_limited',
      metadata: { ip10, ip24, email24, phone24 },
    });
    res.setHeader('Retry-After', '600');
    return json(res, 429, {
      ok: false,
      message:
        'We received several recent requests. Please wait a few minutes or call 760-234-8306.',
    });
  }

  try {
    const inserted = await supabase('leads', { method: 'POST', body: JSON.stringify(payload) });
    const lead = Array.isArray(inserted) ? inserted[0] : inserted;
    await recordAttempt({ ...baseAttempt, accepted: true, reason: 'accepted' });
    await recordEvent('quote_accepted', 'info', {
      country,
      ip_hash,
      reason: 'accepted',
      metadata: { lead_id: lead?.id || null, service_type: payload.service_type },
    });
    const reference = lead?.id ? String(lead.id).slice(0, 8).toUpperCase() : null;
    let email_status = 'not_configured';
    try {
      const acknowledgement = await buildAcknowledgement(payload, reference);
      const sent = await sendAcknowledgement(payload, reference, acknowledgement);
      email_status = sent.sent ? 'sent' : 'not_configured';
    } catch (emailError) {
      email_status = 'failed';
      safeLog('automatic_email_failed', emailError);
      await recordEvent('automatic_email_failed', 'medium', {
        country,
        ip_hash,
        reason: 'email_provider_error',
      });
    }
    return json(res, 201, {
      ok: true,
      message: 'Request delivered successfully.',
      reference,
      email_status,
    });
  } catch (error) {
    safeLog('secure_quote_insert_failed', error);
    await recordAttempt({ ...baseAttempt, reason: 'database_error' });
    await recordEvent('quote_submission_error', 'high', {
      country,
      ip_hash,
      reason: 'database_error',
    });
    return json(res, 500, {
      ok: false,
      message: 'The request system is temporarily unavailable. Please call 760-234-8306.',
    });
  }
}
