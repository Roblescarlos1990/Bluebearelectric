(function () {
  if (!window.supabase) return;
  const client = window.supabase.createClient(
    window.BLUE_BEAR_SUPABASE_URL,
    window.BLUE_BEAR_SUPABASE_KEY,
  );
  const TENANT = 'blue-bear-electric';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const state = { content: {}, media: [], services: [], portfolio: [] };
  const statusEl = $('[data-site-manager-status]');
  function status(msg, ok = true) {
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.className = 'form-status ' + (ok ? 'success' : 'error');
    }
  }
  function uid() {
    return window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  }
  function safeName(name) {
    return String(name || 'file')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-');
  }

  async function load() {
    const [content, media, services, portfolio] = await Promise.all([
      client.from('site_content').select('*').eq('tenant_key', TENANT),
      client
        .from('site_media')
        .select('*')
        .eq('tenant_key', TENANT)
        .order('created_at', { ascending: false }),
      client
        .from('site_services')
        .select('*')
        .eq('tenant_key', TENANT)
        .order('display_order', { ascending: true }),
      client
        .from('site_portfolio')
        .select('*')
        .eq('tenant_key', TENANT)
        .order('display_order', { ascending: true }),
    ]);
    const err = [content, media, services, portfolio].find((r) => r.error)?.error;
    if (err) {
      console.error(err);
      status('Content Manager tables are not ready. Run docs/sql/V8-4-CONTENT-MANAGER.sql.', false);
      return;
    }
    state.content = {};
    (content.data || []).forEach((r) => (state.content[r.content_key] = r));
    state.media = media.data || [];
    state.services = services.data || [];
    state.portfolio = portfolio.data || [];
    fillForms();
    renderMedia();
    renderServices();
    renderPortfolio();
    renderPreview();
    status('Website content loaded.', true);
  }

  function fillForms() {
    const company = state.content.company?.content_value || {};
    const hero = state.content.homepage_hero?.content_value || {};
    const form = $('[data-site-content-form]');
    if (!form) return;
    const values = {
      company_name: company.company_name,
      phone: company.phone,
      license: company.license,
      service_area: company.service_area,
      mission: company.mission,
      hero_eyebrow: hero.eyebrow,
      hero_headline: hero.headline,
      hero_description: hero.description,
      primary_button: hero.primary_button,
      secondary_button: hero.secondary_button,
    };
    Object.entries(values).forEach(([k, v]) => {
      if (form.elements[k] && v != null) form.elements[k].value = v;
    });
    const status = state.content.homepage_hero?.status || 'published';
    if (form.elements.publish_status) form.elements.publish_status.value = status;
  }

  async function upsertContent(key, value, publishStatus) {
    const { error } = await client.from('site_content').upsert(
      {
        tenant_key: TENANT,
        content_key: key,
        content_value: value,
        status: publishStatus,
        updated_by: (await client.auth.getUser()).data.user?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_key,content_key' },
    );
    if (error) throw error;
  }

  $('[data-site-content-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const btn = f.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const publishStatus = f.publish_status.value;
      await upsertContent(
        'company',
        {
          company_name: f.company_name.value.trim(),
          phone: f.phone.value.trim(),
          license: f.license.value.trim(),
          service_area: f.service_area.value.trim(),
          mission: f.mission.value.trim(),
        },
        publishStatus,
      );
      await upsertContent(
        'homepage_hero',
        {
          eyebrow: f.hero_eyebrow.value.trim(),
          headline: f.hero_headline.value.trim(),
          description: f.hero_description.value.trim(),
          primary_button: f.primary_button.value.trim(),
          secondary_button: f.secondary_button.value.trim(),
        },
        publishStatus,
      );
      status(publishStatus === 'published' ? 'Website content published.' : 'Draft saved.');
      await load();
    } catch (err) {
      console.error(err);
      status(err.message || 'Could not save website content.', false);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Website Content';
    }
  });

  $('[data-media-upload-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget,
      file = f.file.files[0];
    if (!file) return;
    const btn = f.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Uploading…';
    try {
      const path = `${TENANT}/${f.category.value.toLowerCase().replace(/\s+/g, '-')}/${Date.now()}-${uid().slice(0, 8)}-${safeName(file.name)}`;
      const up = await client.storage
        .from('site-media')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (up.error) throw up.error;
      const publicUrl = client.storage.from('site-media').getPublicUrl(path).data.publicUrl;
      const user = (await client.auth.getUser()).data.user;
      const row = {
        tenant_key: TENANT,
        title: f.title.value.trim() || file.name,
        category: f.category.value,
        file_path: path,
        file_type: file.type,
        alt_text: f.alt_text.value.trim(),
        public_url: publicUrl,
        is_active: true,
        uploaded_by: user?.id,
      };
      const ins = await client.from('site_media').insert(row);
      if (ins.error) throw ins.error;
      f.reset();
      status('Media uploaded and added to the public library.');
      await load();
    } catch (err) {
      console.error(err);
      status(err.message || 'Media upload failed.', false);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload Website Media';
    }
  });

  function renderMedia() {
    const w = $('[data-site-media-grid]');
    if (!w) return;
    w.innerHTML = state.media.length
      ? state.media
          .map(
            (m) =>
              `<article class="media-card site-media-card"><img src="${esc(m.public_url)}" alt="${esc(m.alt_text || m.title)}"><div><b>${esc(m.title)}</b><small>${esc(m.category)}</small><div class="media-actions"><button class="btn dark mini-btn" data-copy-media="${esc(m.public_url)}">Copy URL</button><button class="btn dark mini-btn" data-toggle-media="${m.id}" data-active="${m.is_active}">${m.is_active ? 'Hide' : 'Show'}</button></div></div></article>`,
          )
          .join('')
      : '<p class="small">No website media uploaded yet.</p>';
  }

  $('[data-site-media-grid]')?.addEventListener('click', async (e) => {
    const copy = e.target.closest('[data-copy-media]');
    if (copy) {
      await navigator.clipboard.writeText(copy.dataset.copyMedia);
      status('Media URL copied.');
      return;
    }
    const toggle = e.target.closest('[data-toggle-media]');
    if (toggle) {
      const { error } = await client
        .from('site_media')
        .update({ is_active: toggle.dataset.active !== 'true' })
        .eq('id', toggle.dataset.toggleMedia);
      if (error) status(error.message, false);
      else await load();
    }
  });

  $('[data-service-editor-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const id = f.service_id.value;
    const row = {
      tenant_key: TENANT,
      title: f.title.value.trim(),
      slug: f.slug.value.trim(),
      category: f.category.value.trim(),
      short_description: f.short_description.value.trim(),
      image_path: f.image_path.value.trim(),
      page_url: f.page_url.value.trim(),
      display_order: Number(f.display_order.value || 0),
      is_active: f.is_active.checked,
      updated_at: new Date().toISOString(),
    };
    const q = id
      ? client.from('site_services').update(row).eq('id', id)
      : client.from('site_services').insert(row);
    const { error } = await q;
    if (error) status(error.message, false);
    else {
      f.reset();
      f.service_id.value = '';
      status(id ? 'Service updated.' : 'Service added.');
      await load();
    }
  });

  function renderServices() {
    const w = $('[data-site-services-list]');
    if (!w) return;
    w.innerHTML =
      state.services
        .map(
          (s) =>
            `<div class="content-list-row"><div><b>${esc(s.title)}</b><span>${esc(s.category || '')} • order ${s.display_order} • ${s.is_active ? 'Visible' : 'Hidden'}</span></div><button class="btn dark mini-btn" data-edit-service="${s.id}">Edit</button></div>`,
        )
        .join('') || '<p class="small">No services configured.</p>';
  }
  $('[data-site-services-list]')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-edit-service]');
    if (!b) return;
    const s = state.services.find((x) => x.id === b.dataset.editService),
      f = $('[data-service-editor-form]');
    if (!s || !f) return;
    [
      'id',
      'title',
      'slug',
      'category',
      'short_description',
      'image_path',
      'page_url',
      'display_order',
    ].forEach((k) => {
      const n = k === 'id' ? 'service_id' : k;
      if (f.elements[n]) f.elements[n].value = s[k] ?? '';
    });
    f.is_active.checked = !!s.is_active;
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  $('[data-portfolio-editor-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const id = f.portfolio_id.value;
    const row = {
      tenant_key: TENANT,
      title: f.title.value.trim(),
      category: f.category.value.trim(),
      location: f.location.value.trim(),
      service_type: f.service_type.value.trim(),
      description: f.description.value.trim(),
      capabilities: f.capabilities.value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      cover_image_path: f.cover_image_path.value.trim(),
      display_order: Number(f.display_order.value || 0),
      status: f.status.value,
      updated_at: new Date().toISOString(),
    };
    const q = id
      ? client.from('site_portfolio').update(row).eq('id', id)
      : client.from('site_portfolio').insert(row);
    const { error } = await q;
    if (error) status(error.message, false);
    else {
      f.reset();
      f.portfolio_id.value = '';
      status(id ? 'Portfolio item updated.' : 'Portfolio item created.');
      await load();
    }
  });

  function renderPortfolio() {
    const w = $('[data-site-portfolio-list]');
    if (!w) return;
    w.innerHTML =
      state.portfolio
        .map(
          (p) =>
            `<div class="content-list-row"><div><b>${esc(p.title)}</b><span>${esc(p.category)} • ${esc(p.location || '')} • ${esc(p.status)}</span></div><button class="btn dark mini-btn" data-edit-portfolio="${p.id}">Edit</button></div>`,
        )
        .join('') ||
      '<p class="small">No dynamic portfolio records yet. The existing static gallery remains visible.</p>';
  }
  $('[data-site-portfolio-list]')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-edit-portfolio]');
    if (!b) return;
    const p = state.portfolio.find((x) => x.id === b.dataset.editPortfolio),
      f = $('[data-portfolio-editor-form]');
    if (!p || !f) return;
    const map = {
      portfolio_id: 'id',
      title: 'title',
      category: 'category',
      location: 'location',
      service_type: 'service_type',
      description: 'description',
      cover_image_path: 'cover_image_path',
      display_order: 'display_order',
      status: 'status',
    };
    Object.entries(map).forEach(([n, k]) => (f.elements[n].value = p[k] ?? ''));
    f.capabilities.value = (p.capabilities || []).join(', ');
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function renderPreview() {
    const w = $('[data-site-preview]');
    if (!w) return;
    const c = state.content.company?.content_value || {},
      h = state.content.homepage_hero?.content_value || {};
    w.innerHTML = `<div class="site-preview-hero"><span>${esc(h.eyebrow || 'Industrial • Commercial • Residential')}</span><h3>${esc(h.headline || 'Homepage headline')}</h3><p>${esc(h.description || 'Homepage description')}</p><div class="cta-row"><span class="btn yellow">${esc(h.primary_button || 'Call Now')}</span><span class="btn blue">${esc(h.secondary_button || 'Request a Free Estimate')}</span></div></div><div class="site-preview-meta"><b>${esc(c.company_name || 'Blue Bear Electric')}</b><span>${esc(c.phone || '')} • CA License #${esc(c.license || '')}</span><p>${esc(c.mission || '')}</p></div>`;
  }

  const page = $('[data-tab-page="website"]');
  if (page) load();
})();
