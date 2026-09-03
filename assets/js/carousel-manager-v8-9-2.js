(function () {
  if (!window.supabase) return;
  const c = window.BLUE_BEAR_SUPABASE_CLIENT,
    $ = (s) => document.querySelector(s);
  if (!c) return;
  const page = $('[data-carousel-page]'),
    key = $('[data-carousel-system]'),
    list = $('[data-carousel-manager-list]'),
    preview = $('[data-carousel-admin-preview]'),
    status = $('[data-carousel-manager-status]');
  if (!key || !list) return;
  let rows = [];
  const ctx = () => {
    const k = key.value,
      r = ['panel', 'ev', 'lighting', 'garage'].includes(k);
    return {
      page: r ? 'residential' : page.value,
      section: r ? 'home-systems' : 'service-gallery',
      key: k,
    };
  };
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  function options() {
    [...key.options].forEach((o) => {
      if (['panel', 'ev', 'lighting', 'garage'].includes(o.value))
        o.hidden = page.value !== 'residential';
    });
    if (page.value !== 'residential' && ['panel', 'ev', 'lighting', 'garage'].includes(key.value))
      key.value = 'hero';
  }
  async function load() {
    options();
    status.textContent = 'Loading...';
    const x = ctx(),
      r = await c
        .from('website_carousel_items')
        .select('*')
        .eq('tenant_key', 'blue-bear-electric')
        .eq('page_key', x.page)
        .eq('section_key', x.section)
        .eq('carousel_key', x.key)
        .order('display_order');
    if (r.error) {
      list.innerHTML = '<p class="small">Run V8.9.6 SQL.</p>';
      status.textContent = 'Setup required';
      return;
    }
    rows = r.data || [];
    render();
    status.textContent = rows.length + ' photos';
  }
  function render() {
    list.innerHTML = rows.length
      ? rows
          .map(
            (r) =>
              `<article class="carousel-manager-row"><img src="${esc(r.public_url)}"><div><b>${esc(r.title)}</b><small>${r.is_published ? 'Published' : 'Hidden'} · ${r.display_order}</small><input value="${esc(r.alt_text || '')}" data-alt="${r.id}"></div><div class="carousel-row-actions"><button class="btn dark mini-btn" data-move="${r.id}" data-direction="-1">Up</button><button class="btn dark mini-btn" data-move="${r.id}" data-direction="1">Down</button><button class="btn dark mini-btn" data-publish="${r.id}">${r.is_published ? 'Hide' : 'Publish'}</button><button class="btn danger mini-btn" data-delete="${r.id}">Delete</button></div></article>`,
          )
          .join('')
      : '<div class="vf88-empty">Using repository fallback images.</div>';
    preview.innerHTML =
      rows
        .filter((x) => x.is_published)
        .map((r, i) => `<img src="${esc(r.public_url)}" style="--i:${i}">`)
        .join('') || '<p class="small">Publish photos to preview.</p>';
  }
  page?.addEventListener('change', load);
  key.addEventListener('change', load);
  $('[data-carousel-upload-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget,
      file = f.file.files[0],
      x = ctx(),
      btn = f.querySelector('button');
    if (!file) return;
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    try {
      const path = `blue-bear-electric/website/${x.page}/${x.section}/${x.key}/${Date.now()}-${file.name.replace(/[^a-z0-9._-]+/gi, '-')}`,
        up = await c.storage.from('site-media').upload(path, file, { cacheControl: '3600' });
      if (up.error) throw up.error;
      const url = c.storage.from('site-media').getPublicUrl(path).data.publicUrl,
        ord = (rows.at(-1)?.display_order || 0) + 10,
        ins = await c.from('website_carousel_items').insert({
          tenant_key: 'blue-bear-electric',
          page_key: x.page,
          section_key: x.section,
          carousel_key: x.key,
          title: f.title.value.trim(),
          alt_text: f.alt_text.value.trim(),
          caption: f.alt_text.value.trim(),
          storage_path: path,
          public_url: url,
          display_order: ord,
          is_published: true,
        });
      if (ins.error) throw ins.error;
      f.reset();
      await load();
    } catch (err) {
      status.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload & Add Photo';
    }
  });
  list.addEventListener('change', async (e) => {
    if (e.target.matches('[data-alt]'))
      await c
        .from('website_carousel_items')
        .update({ alt_text: e.target.value, caption: e.target.value })
        .eq('id', e.target.dataset.alt);
  });
  list.addEventListener('click', async (e) => {
    const id = e.target.dataset.move || e.target.dataset.publish || e.target.dataset.delete,
      row = rows.find((x) => x.id === id);
    if (!row) return;
    if (e.target.dataset.move) {
      const i = rows.findIndex((x) => x.id === id),
        other = rows[i + Number(e.target.dataset.direction)];
      if (!other) return;
      await Promise.all([
        c
          .from('website_carousel_items')
          .update({ display_order: other.display_order })
          .eq('id', row.id),
        c
          .from('website_carousel_items')
          .update({ display_order: row.display_order })
          .eq('id', other.id),
      ]);
      await load();
    }
    if (e.target.dataset.publish) {
      await c
        .from('website_carousel_items')
        .update({ is_published: !row.is_published })
        .eq('id', id);
      await load();
    }
    if (e.target.dataset.delete && confirm('Delete permanently?')) {
      await c.storage.from('site-media').remove([row.storage_path]);
      await c.from('website_carousel_items').delete().eq('id', id);
      await load();
    }
  });
  load();
})();
