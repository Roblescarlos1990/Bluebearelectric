const crypto = require('crypto');

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const MAX_BODY_BYTES = 24_000;
const DEFAULT_ALLOWED_COUNTRIES = ['US', 'CA', 'MX'];

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', JSON_HEADERS['Content-Type']);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.end(JSON.stringify(body));
}

function normalize(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function hash(value) {
  return crypto.createHash('sha256').update(`${process.env.SECURITY_HASH_SALT || 'voltflow'}:${value || ''}`).digest('hex');
}
function getIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
}
function getCountry(req) {
  return String(req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || 'XX').toUpperCase();
}
function allowedOrigin(req) {
  const configured = String(process.env.ALLOWED_ORIGIN || '').split(',').map(v => v.trim()).filter(Boolean);
  if (!configured.length) return true;
  const origin = String(req.headers.origin || '');
  return configured.includes(origin);
}
async function supabase(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server database configuration is incomplete.');
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  return data;
}
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { success: true, skipped: true };
  if (!token) return { success: false, reason: 'missing-token' };
  const body = new URLSearchParams({ secret, response: token, remoteip: ip });
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.json();
}
async function countAttempts(column, value, sinceIso, acceptedOnly = true) {
  const accepted = acceptedOnly ? '&accepted=eq.true' : '';
  const result = await supabase(`quote_attempts?select=id&${column}=eq.${encodeURIComponent(value)}&created_at=gte.${encodeURIComponent(sinceIso)}${accepted}`, { method: 'GET' });
  return Array.isArray(result) ? result.length : 0;
}
async function recordAttempt(row) {
  try { await supabase('quote_attempts', { method: 'POST', body: JSON.stringify(row) }); } catch (error) { console.error('quote_attempt_log_failed', error.message); }
}
async function recordEvent(event_type, severity, details) {
  try {
    await supabase('security_events', { method: 'POST', body: JSON.stringify({ event_type, severity, route: '/api/quote', country: details.country, ip_hash: details.ip_hash, reason: details.reason || null, metadata: details.metadata || {} }) });
  } catch (error) { console.error('security_event_log_failed', error.message); }
}
function suspiciousText(payload) {
  const joined = `${payload.full_name} ${payload.email} ${payload.city} ${payload.message}`.toLowerCase();
  const links = (joined.match(/https?:\/\//g) || []).length;
  const spamTerms = ['crypto investment', 'guest post', 'seo service', 'backlinks', 'casino', 'viagra', 'loan approval'];
  return links > 2 || spamTerms.some(term => joined.includes(term));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method not allowed.' });
  if (!allowedOrigin(req)) return json(res, 403, { ok: false, message: 'Request origin is not allowed.' });

  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES) return json(res, 413, { ok: false, message: 'Request is too large.' });

  const ip = getIp(req);
  const country = getCountry(req);
  const ip_hash = hash(ip);
  const userAgent = normalize(req.headers['user-agent'], 300);
  const allowedCountries = String(process.env.ALLOWED_QUOTE_COUNTRIES || DEFAULT_ALLOWED_COUNTRIES.join(',')).split(',').map(v => v.trim().toUpperCase()).filter(Boolean);
  const geoMode = String(process.env.GEO_MODE || 'monitor').toLowerCase();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return json(res, 400, { ok: false, message: 'Invalid request format.' }); }
  }
  body = body || {};
  const payload = {
    full_name: normalize(body.full_name, 120),
    phone: normalize(body.phone, 50),
    email: normalize(body.email, 160).toLowerCase(),
    city: normalize(body.city, 120),
    service_type: normalize(body.service_type, 100),
    urgency: normalize(body.urgency || 'Normal', 50),
    message: normalize(body.message, 2500),
    source: 'website-secure-api',
    status: 'New'
  };
  const email_hash = hash(payload.email || 'none');
  const phone_hash = hash(payload.phone || 'none');
  const baseAttempt = { ip_hash, email_hash, phone_hash, country, user_agent: userAgent, accepted: false, reason: null };

  if (normalize(body.company_website, 200)) {
    await recordAttempt({ ...baseAttempt, reason: 'honeypot' });
    await recordEvent('quote_spam_blocked', 'medium', { country, ip_hash, reason: 'honeypot' });
    return json(res, 200, { ok: true, message: 'Request received.' });
  }

  const startedAt = Number(body.form_started_at || 0);
  if (!startedAt || Date.now() - startedAt < 1800) {
    await recordAttempt({ ...baseAttempt, reason: 'submitted_too_fast' });
    await recordEvent('quote_spam_blocked', 'low', { country, ip_hash, reason: 'submitted_too_fast' });
    return json(res, 400, { ok: false, message: 'Please review the form and try again.' });
  }

  if (!payload.full_name || !payload.phone || !payload.service_type) {
    return json(res, 400, { ok: false, message: 'Name, phone number, and service needed are required.' });
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return json(res, 400, { ok: false, message: 'Please enter a valid email address.' });
  }
  if (suspiciousText(payload)) {
    await recordAttempt({ ...baseAttempt, reason: 'spam_content' });
    await recordEvent('quote_spam_blocked', 'medium', { country, ip_hash, reason: 'spam_content' });
    return json(res, 400, { ok: false, message: 'Please remove links or promotional content and try again.' });
  }
  if (!allowedCountries.includes(country)) {
    await recordEvent('quote_geo_flagged', geoMode === 'restrict' ? 'medium' : 'low', { country, ip_hash, reason: 'outside_service_region' });
    if (geoMode === 'restrict') return json(res, 403, { ok: false, message: 'Online requests are limited to supported regions. Please call us for assistance.' });
  }

  const turnstile = await verifyTurnstile(normalize(body.turnstile_token, 4000), ip);
  if (!turnstile.success) {
    await recordAttempt({ ...baseAttempt, reason: 'turnstile_failed' });
    await recordEvent('quote_bot_challenge_failed', 'medium', { country, ip_hash, reason: 'turnstile_failed', metadata: { codes: turnstile['error-codes'] || [] } });
    return json(res, 403, { ok: false, message: 'We could not verify this request. Please refresh and try again.' });
  }

  const now = Date.now();
  const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const [ip10, ip24, email24, phone24] = await Promise.all([
    countAttempts('ip_hash', ip_hash, tenMinutesAgo),
    countAttempts('ip_hash', ip_hash, dayAgo),
    payload.email ? countAttempts('email_hash', email_hash, dayAgo) : 0,
    countAttempts('phone_hash', phone_hash, dayAgo)
  ]);
  if (ip10 >= 3 || ip24 >= 8 || email24 >= 3 || phone24 >= 3) {
    await recordAttempt({ ...baseAttempt, reason: 'rate_limited' });
    await recordEvent('quote_rate_limited', 'medium', { country, ip_hash, reason: 'rate_limited', metadata: { ip10, ip24, email24, phone24 } });
    res.setHeader('Retry-After', '600');
    return json(res, 429, { ok: false, message: 'We received several recent requests. Please wait a few minutes or call 760-234-8306.' });
  }

  try {
    const inserted = await supabase('leads', { method: 'POST', body: JSON.stringify(payload) });
    const lead = Array.isArray(inserted) ? inserted[0] : inserted;
    await recordAttempt({ ...baseAttempt, accepted: true, reason: 'accepted' });
    await recordEvent('quote_accepted', 'info', { country, ip_hash, reason: 'accepted', metadata: { lead_id: lead?.id || null, service_type: payload.service_type } });
    return json(res, 201, { ok: true, message: 'Request delivered successfully.', reference: lead?.id ? String(lead.id).slice(0, 8).toUpperCase() : null });
  } catch (error) {
    console.error('secure_quote_insert_failed', error);
    await recordAttempt({ ...baseAttempt, reason: 'database_error' });
    await recordEvent('quote_submission_error', 'high', { country, ip_hash, reason: 'database_error' });
    return json(res, 500, { ok: false, message: 'The request system is temporarily unavailable. Please call 760-234-8306.' });
  }
};
