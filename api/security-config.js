module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.end(JSON.stringify({
    turnstileEnabled: Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY),
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null,
    geoMode: process.env.GEO_MODE || 'monitor'
  }));
};
