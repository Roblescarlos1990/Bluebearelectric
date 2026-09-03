(function () {
  if (!window.supabase) return;
  const client = window.BLUE_BEAR_SUPABASE_CLIENT;
  if (!client) return;
  const $ = (s) => document.querySelector(s);
  const pageSelect = $('[data-photo-slot-page]');
  const search = $('[data-photo-slot-search]');
  const list = $('[data-photo-slot-list]');
  const status = $('[data-photo-slot-status]');
  if (!pageSelect || !list) return;

  let registry = [],
    managed = [];
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  const safe = (n) =>
    String(n || 'image')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-');

  async function loadRegistry() {
    const response = await fetch('assets/data/photo-slots.json');
    const data = await response.json();
    registry = data.slots || [];
    const pages = [...new Set(registry.map((x) => x.page_key))].sort();
    pageSelect.innerHTML =
      '<option value="">All pages</option>' +
      pages
        .map(
          (p) =>
            `<option value="${esc(p)}">${esc(p.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()))}</option>`,
        )
        .join('');
  }

  async function loadManaged() {
    const { data, error } = await client
      .from('website_photo_slots')
      .select('*')
      .eq('tenant_key', 'blue-bear-electric');
    managed = error ? [] : data || [];
  }

  function currentFor(slot) {
    return managed.find((x) => x.slot_key === slot.slot_key);
  }

  function render() {
    const q = (search.value || '').trim().toLowerCase();
    const page = pageSelect.value;
    const filtered = registry.filter((slot) => {
      if (page && slot.page_key !== page) return false;
      if (!q) return true;
      return `${slot.slot_key} ${slot.page_key} ${slot.alt_text} ${slot.current_src}`
        .toLowerCase()
        .includes(q);
    });

    status.textContent = `${filtered.length} locations`;
    list.innerHTML =
      filtered
        .map((slot) => {
          const row = currentFor(slot);
          const src = row?.public_url || slot.current_src;
          return `<article class="photo-slot-card" data-slot="${esc(slot.slot_key)}">
        <div class="photo-slot-preview"><img src="${esc(src)}" alt="${esc(row?.alt_text || slot.alt_text)}"></div>
        <div class="photo-slot-details">
          <div class="eyebrow">${esc(slot.page_key)}</div>
          <h4>${esc(slot.alt_text)}</h4>
          <code>${esc(slot.slot_key)}</code>
          <small>${row?.is_published ? 'Managed replacement active' : 'Using original repository image'}</small>
          <label>Accessible description<input data-slot-alt value="${esc(row?.alt_text || slot.alt_text)}"></label>
        </div>
        <div class="photo-slot-actions">
          <label class="btn blue mini-btn">Choose replacement<input type="file" data-slot-file accept="image/jpeg,image/png,image/webp" hidden></label>
          <button class="btn yellow mini-btn" type="button" data-slot-upload>Upload & Publish</button>
          ${
            row
              ? `<button class="btn dark mini-btn" type="button" data-slot-toggle>${row.is_published ? 'Hide replacement' : 'Publish replacement'}</button>
          <button class="btn danger mini-btn" type="button" data-slot-restore>Restore original</button>`
              : ''
          }
        </div>
      </article>`;
        })
        .join('') || '<div class="vf88-empty">No photo locations match the current filter.</div>';
  }

  async function refresh() {
    status.textContent = 'Loading...';
    await Promise.all([loadRegistry(), loadManaged()]);
    render();
  }

  pageSelect.addEventListener('change', render);
  search.addEventListener('input', render);

  list.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-slot]');
    if (!card) return;
    const slot = registry.find((x) => x.slot_key === card.dataset.slot);
    const row = currentFor(slot);
    if (e.target.matches('[data-slot-upload]')) {
      const file = card.querySelector('[data-slot-file]').files[0];
      if (!file) {
        window.voltflowToast?.(
          'Choose a photo first',
          'Select a replacement image before uploading.',
        );
        return;
      }
      e.target.disabled = true;
      e.target.textContent = 'Uploading...';
      try {
        const path = `blue-bear-electric/photo-slots/${slot.page_key}/${slot.slot_key}/${Date.now()}-${safe(file.name)}`;
        const up = await client.storage
          .from('site-media')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (up.error) throw up.error;
        const url = client.storage.from('site-media').getPublicUrl(path).data.publicUrl;
        const alt = card.querySelector('[data-slot-alt]').value.trim();
        const payload = {
          tenant_key: 'blue-bear-electric',
          slot_key: slot.slot_key,
          page_key: slot.page_key,
          alt_text: alt,
          storage_path: path,
          public_url: url,
          is_published: true,
          updated_at: new Date().toISOString(),
        };
        const { error } = await client
          .from('website_photo_slots')
          .upsert(payload, { onConflict: 'tenant_key,slot_key' });
        if (error) throw error;
        window.voltflowToast?.(
          'Photo location updated',
          `${slot.slot_key} now uses the uploaded image.`,
        );
        await refresh();
      } catch (err) {
        window.voltflowToast?.('Upload failed', err.message);
      } finally {
        e.target.disabled = false;
        e.target.textContent = 'Upload & Publish';
      }
    }
    if (e.target.matches('[data-slot-toggle]') && row) {
      await client
        .from('website_photo_slots')
        .update({ is_published: !row.is_published, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      await refresh();
    }
    if (
      e.target.matches('[data-slot-restore]') &&
      row &&
      confirm('Restore the original repository image for this exact location?')
    ) {
      if (row.storage_path) await client.storage.from('site-media').remove([row.storage_path]);
      await client.from('website_photo_slots').delete().eq('id', row.id);
      await refresh();
    }
  });

  refresh();
})();
