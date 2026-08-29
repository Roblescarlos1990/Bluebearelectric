(function () {
  if (!window.supabase) return;
  const client = window.supabase.createClient(
    window.BLUE_BEAR_SUPABASE_URL,
    window.BLUE_BEAR_SUPABASE_KEY,
  );
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>\"]/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' })[char],
    );
  const sinceHours = (hours) => new Date(Date.now() - hours * 3600000).toISOString();
  let events = [];

  function badge(severity) {
    return `<span class="security-severity ${esc(severity || 'info')}">${esc(severity || 'info')}</span>`;
  }
  function render() {
    const kpis = $('[data-security-kpis]');
    const list = $('[data-security-events]');
    const countries = $('[data-security-countries]');
    const day = events.filter((event) => event.created_at >= sinceHours(24));
    const accepted = day.filter((event) => event.event_type === 'quote_accepted').length;
    const blocked = day.filter((event) =>
      ['quote_spam_blocked', 'quote_bot_challenge_failed', 'quote_rate_limited'].includes(
        event.event_type,
      ),
    ).length;
    const high = day.filter((event) => ['high', 'critical'].includes(event.severity)).length;
    const rateLimited = day.filter((event) => event.event_type === 'quote_rate_limited').length;
    if (kpis)
      kpis.innerHTML = [
        ['Accepted Quotes', accepted],
        ['Blocked / Challenged', blocked],
        ['Rate Limited', rateLimited],
        ['High Severity', high],
      ]
        .map(
          ([label, value]) =>
            `<article class="security-kpi"><strong>${value}</strong><span>${label}<small>Last 24 hours</small></span></article>`,
        )
        .join('');
    if (list)
      list.innerHTML = events.length
        ? events
            .slice(0, 100)
            .map(
              (event) =>
                `<article class="security-event"><div><b>${esc(event.event_type.replaceAll('_', ' '))}</b><p>${esc(event.reason || 'No additional reason')}</p></div><div>${badge(event.severity)}<small>${esc(event.country || 'XX')} • ${new Date(event.created_at).toLocaleString()}</small></div></article>`,
            )
            .join('')
        : '<p class="small">No security events recorded yet.</p>';
    if (countries) {
      const counts = events.reduce((map, event) => {
        const country = event.country || 'XX';
        map[country] = (map[country] || 0) + 1;
        return map;
      }, {});
      countries.innerHTML =
        Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(
            ([country, count]) =>
              `<div class="security-country"><span>${esc(country)}</span><b>${count}</b></div>`,
          )
          .join('') || '<p class="small">No country data yet.</p>';
    }
  }
  async function load() {
    const status = $('[data-security-status]');
    if (status) status.textContent = 'Loading security telemetry…';
    const { data, error } = await client
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(250);
    if (error) {
      console.error(error);
      if (status) {
        status.textContent =
          'Security data is unavailable. Run the V8.6.6 SQL migration and verify admin permissions.';
        status.className = 'form-status error';
      }
      return;
    }
    events = data || [];
    if (status) {
      status.textContent = `Monitoring active • ${events.length} recent events loaded`;
      status.className = 'form-status success';
    }
    render();
  }
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-refresh-security]')) load();
  });
  client.auth.onAuthStateChange((event, session) => {
    if (session) load();
  });
  client.auth.getSession().then(({ data }) => {
    if (data.session) load();
  });
})();
