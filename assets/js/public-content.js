(function () {
  if (!window.supabase) return;
  const client = window.BLUE_BEAR_SUPABASE_CLIENT;
  if (!client) return;
  const TENANT = 'blue-bear-electric';
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  async function run() {
    try {
      const [content, services, portfolio] = await Promise.all([
        client
          .from('site_content')
          .select('content_key,content_value')
          .eq('tenant_key', TENANT)
          .eq('status', 'published'),
        client
          .from('site_services')
          .select('*')
          .eq('tenant_key', TENANT)
          .eq('is_active', true)
          .order('display_order'),
        client
          .from('site_portfolio')
          .select('*')
          .eq('tenant_key', TENANT)
          .eq('status', 'published')
          .order('display_order'),
      ]);
      if (content.error) return;
      const values = {};
      (content.data || []).forEach((r) => (values[r.content_key] = r.content_value || {}));
      const company = values.company || {},
        hero = values.homepage_hero || {};
      const set = (sel, val) => {
        const el = document.querySelector(sel);
        if (el && val) el.textContent = val;
      };
      set('[data-dynamic-hero-eyebrow]', hero.eyebrow);
      set('[data-dynamic-hero-headline]', hero.headline);
      set('[data-dynamic-hero-description]', hero.description);
      document.querySelectorAll('[data-dynamic-phone]').forEach((el) => {
        if (company.phone) {
          el.textContent = company.phone;
          if (el.tagName === 'A') el.href = 'tel:' + company.phone.replace(/\D/g, '');
        }
      });
      document.querySelectorAll('[data-dynamic-license]').forEach((el) => {
        if (company.license) el.textContent = company.license;
      });
      set('[data-dynamic-mission]', company.mission);
      const sw = document.querySelector('[data-dynamic-services]');
      if (sw && !services.error && services.data?.length) {
        sw.innerHTML = services.data
          .map(
            (s) =>
              `<a class="service-card" href="${esc(s.page_url || '#')}"><img src="${esc(s.image_path || 'assets/images/site/switchgear.jpg')}" alt="${esc(s.title)}"><div class="card-body"><h3>${esc(s.title)}</h3><p>${esc(s.short_description || '')}</p><span class="learn">Learn More →</span></div></a>`,
          )
          .join('');
      }
      const pw = document.querySelector('[data-dynamic-portfolio]');
      if (pw && !portfolio.error && portfolio.data?.length) {
        pw.innerHTML = portfolio.data
          .map(
            (p) =>
              `<article class="premium-project-card" data-category="${esc(
                String(p.category || '')
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-'),
              )}" data-title="${esc(p.title)}" data-location="${esc(p.location || '')}" data-service="${esc(p.service_type || p.category || '')}" data-image="${esc(p.cover_image_path || 'assets/images/site/switchgear.jpg')}" data-description="${esc(p.description || '')}" data-capabilities="${esc((p.capabilities || []).join('|'))}"><button class="project-open" type="button" aria-label="Open ${esc(p.title)} project"><img src="${esc(p.cover_image_path || 'assets/images/site/switchgear.jpg')}" alt="${esc(p.title)}"><span class="project-overlay"><span class="project-badge">${esc(p.category)}</span><span class="project-view">View Project →</span></span></button><div class="project-meta"><span>${esc(p.location || p.service_type || 'Project')}</span><h3>${esc(p.title)}</h3><p>${esc(p.description || '')}</p></div></article>`,
          )
          .join('');
      }
    } catch (err) {
      console.warn('VoltFlow public content fallback active.', err);
    }
  }
  run();
})();
