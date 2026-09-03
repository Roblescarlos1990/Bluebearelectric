(function () {
  if (!window.supabase) return;
  const client = window.BLUE_BEAR_SUPABASE_CLIENT;
  if (!client) return;
  const $ = (s) => document.querySelector(s);
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>\"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' })[c],
    );
  let rows = [];
  let channel = null;
  let newestId = null;
  const projectId = () => $('[data-workspace-project]')?.value || '';
  const status = (t) => {
    const el = $('[data-live-media-status]');
    if (el) el.textContent = t;
  };
  async function urlFor(path) {
    if (!path) return '';
    const { data } = await client.storage.from('project-photos').createSignedUrl(path, 3600);
    return data?.signedUrl || '';
  }
  async function loadMedia() {
    const id = projectId();
    if (!id) return;
    status('Syncing');
    const { data, error } = await client
      .from('gallery')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      status('Sync error');
      return;
    }
    rows = data || [];
    await render();
    status('Live');
  }
  async function render() {
    const wrap = $('[data-project-gallery]');
    if (!wrap) return;
    const q = ($('[data-media-search]')?.value || '').toLowerCase();
    const f = $('[data-media-filter]')?.value || 'all';
    const list = rows.filter(
      (r) =>
        (f === 'all' ||
          String(r.photo_stage || r.category || 'General').toLowerCase() === f.toLowerCase()) &&
        (!q ||
          [r.title, r.description, r.category, r.photo_stage].join(' ').toLowerCase().includes(q)),
    );
    const count = $('[data-media-count]');
    if (count) count.textContent = `${list.length} file${list.length === 1 ? '' : 's'}`;
    if (!list.length) {
      wrap.innerHTML = '<div class="media-empty-v872">No files match this view.</div>';
      return;
    }
    const cards = [];
    for (const g of list) {
      const path = g.file_path || g.image_url;
      const u = await urlFor(path);
      const img =
        (g.file_type || '').startsWith('image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(path || '');
      cards.push(
        `<article class="media-card media-card-v872 ${g.id === newestId ? 'media-new-v872' : ''}" data-media-id="${g.id}">${img && u ? `<img src="${u}" alt="${esc(g.title || 'Project file')}" data-lightbox="${u}">` : '<div class="file-tile">FILE</div>'}<div class="media-card-body-v872"><div class="media-card-title-v872"><b>${esc(g.title || 'Project file')}</b><span class="visibility-pill-v872 ${g.is_public ? 'customer' : 'internal'}">${g.is_public ? 'Customer visible' : 'Internal'}</span></div><small>${esc(g.photo_stage || g.category || 'General')} • ${g.created_at ? new Date(g.created_at).toLocaleString() : ''}</small><p>${esc(g.description || '')}</p><div class="media-actions-v872">${u ? `<a href="${u}" target="_blank">Open</a>` : ''}<button type="button" data-media-toggle="${g.id}" data-public="${g.is_public ? '1' : '0'}">${g.is_public ? 'Make internal' : 'Share with customer'}</button><button type="button" class="danger" data-media-delete="${g.id}" data-path="${esc(path || '')}">Delete</button></div></div></article>`,
      );
    }
    wrap.innerHTML = `<div class="media-grid media-grid-v872">${cards.join('')}</div>`;
    if (newestId) {
      setTimeout(() => {
        document.querySelector(`[data-media-id="${newestId}"]`)?.classList.remove('media-new-v872');
        newestId = null;
      }, 3500);
    }
  }
  function subscribe() {
    if (channel) client.removeChannel(channel);
    const id = projectId();
    if (!id) return;
    channel = client
      .channel(`gallery-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gallery', filter: `project_id=eq.${id}` },
        () => loadMedia(),
      )
      .subscribe();
  }
  function setupForm() {
    const old = $('[data-photo-upload]');
    if (!old) return;
    const form = old.cloneNode(true);
    old.replaceWith(form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = projectId();
      if (!id) {
        alert('Select a project first.');
        return;
      }
      const fd = new FormData(form),
        files = [...form.querySelector('[name=file]').files];
      if (!files.length) return;
      const btn = form.querySelector('button[type=submit]'),
        box = $('[data-media-upload-progress]'),
        bar = $('[data-media-progress-bar]'),
        label = $('[data-media-progress-label]'),
        cnt = $('[data-media-progress-count]');
      btn.disabled = true;
      box.hidden = false;
      bar.value = 0;
      status('Uploading');
      let done = 0;
      for (const file of files) {
        label.textContent = `Uploading ${file.name}`;
        cnt.textContent = `${done} / ${files.length}`;
        if (file.size > 25 * 1024 * 1024) {
          alert(`${file.name} exceeds the 25 MB limit.`);
          continue;
        }
        const category = String(fd.get('category') || 'General'),
          safe = file.name
            .toLowerCase()
            .replace(/[^a-z0-9.]+/g, '-')
            .replace(/^-+|-+$/g, ''),
          path = `${id}/${category.toLowerCase()}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
        const up = await client.storage
          .from('project-photos')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (up.error) {
          console.error(up.error);
          alert(`Upload failed for ${file.name}`);
          continue;
        }
        const title = String(fd.get('title') || '').trim();
        const row = {
          project_id: id,
          title: title ? (files.length > 1 ? `${title} — ${file.name}` : title) : file.name,
          category,
          photo_stage: category,
          image_url: path,
          file_path: path,
          file_type: file.type || 'file',
          description: String(fd.get('description') || '').trim(),
          is_public: fd.get('visibility') === 'customer',
        };
        const db = await client.from('gallery').insert(row).select('*').single();
        if (db.error) {
          console.error(db.error);
          await client.storage.from('project-photos').remove([path]);
          alert(`Database record failed for ${file.name}`);
          continue;
        }
        newestId = db.data.id;
        rows.unshift(db.data);
        done++;
        bar.value = Math.round((done / files.length) * 100);
        cnt.textContent = `${done} / ${files.length}`;
        await render();
      }
      label.textContent =
        done === files.length
          ? 'Upload complete — gallery updated'
          : `${done} of ${files.length} uploaded`;
      btn.disabled = false;
      form.reset();
      status('Live');
      setTimeout(() => (box.hidden = true), 3200);
    });
  }
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-media-toggle]');
    if (t) {
      const id = t.dataset.mediaToggle;
      const next = t.dataset.public !== '1';
      const { error } = await client.from('gallery').update({ is_public: next }).eq('id', id);
      if (error) alert('Could not update visibility.');
      else loadMedia();
    }
    const d = e.target.closest('[data-media-delete]');
    if (d && confirm('Delete this file permanently?')) {
      const { error } = await client.from('gallery').delete().eq('id', d.dataset.mediaDelete);
      if (error) {
        alert('Could not delete gallery record.');
        return;
      }
      if (d.dataset.path) await client.storage.from('project-photos').remove([d.dataset.path]);
      loadMedia();
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.matches('[data-media-search]')) render();
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-media-filter]')) render();
    if (e.target.matches('[data-workspace-project]')) {
      subscribe();
      loadMedia();
    }
  });
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-ws-tab="photos"]'))
      setTimeout(() => {
        subscribe();
        loadMedia();
      }, 0);
  });
  window.addEventListener('load', () => {
    setupForm();
    subscribe();
    if (projectId()) loadMedia();
  });
})();
