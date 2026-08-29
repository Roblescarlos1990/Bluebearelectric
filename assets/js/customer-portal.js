(function () {
  if (!window.supabase) return;
  const client = window.supabase.createClient(
    window.BLUE_BEAR_SUPABASE_URL,
    window.BLUE_BEAR_SUPABASE_KEY,
  );
  const $ = (s) => document.querySelector(s);
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  const money = (n) =>
    Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  let state = { session: null, customer: null, projects: [], gallery: [], invoices: [], items: [] };
  function msg(t, ok = true) {
    const el = $('[data-customer-message]');
    if (el) {
      el.textContent = t;
      el.className = 'form-status ' + (ok ? 'success' : 'error');
    }
  }
  function showLogin(t = '') {
    $('[data-customer-login]').style.display = 'block';
    $('[data-customer-app]').style.display = 'none';
    const s = $('[data-customer-login-status]');
    if (s) s.textContent = t;
  }
  function showApp() {
    $('[data-customer-login]').style.display = 'none';
    $('[data-customer-app]').style.display = 'block';
    loadPortal();
  }
  async function signedUrl(path) {
    if (!path) return '';
    const { data } = await client.storage.from('project-photos').createSignedUrl(path, 3600);
    return data?.signedUrl || '';
  }
  async function loadPortal() {
    msg('Loading portal...');
    const cust = await client.from('customers').select('*').limit(1).maybeSingle();
    if (cust.error) {
      console.error(cust.error);
      msg('No customer profile mapped to this login yet.', false);
      return;
    }
    state.customer = cust.data;
    $('[data-customer-name]').textContent = cust.data
      ? `${cust.data.full_name} Portal`
      : 'Customer Portal';
    const projects = await client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    const invoices = await client
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    const items = await client
      .from('estimate_items')
      .select('*')
      .order('created_at', { ascending: false });
    const gallery = await client
      .from('gallery')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    [projects, invoices, items, gallery].forEach((r) => {
      if (r.error) console.error(r.error);
    });
    state.projects = projects.data || [];
    state.invoices = invoices.data || [];
    state.items = items.data || [];
    state.gallery = gallery.data || [];
    render();
    msg('');
  }
  function render() {
    const stats = $('[data-customer-stats]');
    if (stats)
      stats.innerHTML = `<div class="stat"><b>${state.projects.length}</b><span>Projects</span></div><div class="stat"><b>${state.gallery.length}</b><span>Public Files</span></div><div class="stat"><b>${state.invoices.length}</b><span>Invoices</span></div>`;
    const wrap = $('[data-customer-projects]');
    if (wrap)
      wrap.innerHTML = state.projects.length
        ? state.projects
            .map(
              (p) =>
                `<article class="v6-card project-card" data-cust-project="${p.id}"><div class="card-top"><span class="badge">${esc(p.status || 'Planning')}</span></div><h4>${esc(p.project_name)}</h4><p class="small">${esc(p.service_type || 'Service')} • ${esc(p.city || '')}</p><p>${esc(p.notes || '')}</p><button class="btn yellow" type="button">View Project</button></article>`,
            )
            .join('')
        : '<p class="small">No projects are connected to this customer login yet.</p>';
  }
  async function openProject(id) {
    const p = state.projects.find((x) => x.id === id);
    if (!p) return;
    const files = state.gallery.filter((g) => g.project_id === id);
    const inv = state.invoices.filter((i) => i.project_id === id);
    const items = state.items.filter((i) => i.project_id === id);
    let fileHtml = '';
    for (const g of files) {
      const url = await signedUrl(g.file_path || g.image_url);
      const isImg =
        String(g.file_type || '').startsWith('image') ||
        String(g.file_path || '').match(/\.(jpg|jpeg|png|webp|gif)$/i);
      fileHtml += `<article class="media-card">${isImg && url ? `<img src="${url}" alt="${esc(g.title || 'File')}">` : `<div class="file-tile">FILE</div>`}<div><b>${esc(g.title || 'File')}</b><small>${esc(g.photo_stage || g.category || 'General')}</small>${url ? `<a class="learn" target="_blank" href="${url}">Open →</a>` : ''}</div></article>`;
    }
    const itemTotal = items.reduce((s, i) => s + Number(i.total || 0), 0);
    const detail = $('[data-customer-project-detail]');
    detail.innerHTML = `<div class="workspace-summary"><div><span class="badge">${esc(p.status || 'Planning')}</span><h2>${esc(p.project_name)}</h2><p class="small">${esc(p.service_type || 'Service')} • ${esc(p.city || '')}</p><p>${esc(p.notes || '')}</p></div></div><h3>Visible Photos / Documents</h3><div class="media-grid">${fileHtml || '<p class="small">No customer-visible files yet.</p>'}</div><h3>Estimate Items</h3><div class="line-table">${items.map((i) => `<div><span>${esc(i.description)}</span><span>${i.quantity}</span><span>${money(i.unit_price)}</span><b>${money(i.total)}</b></div>`).join('') || '<p class="small">No estimate items visible yet.</p>'}</div><div class="totals"><b>Estimate subtotal: ${money(itemTotal)}</b></div><h3>Invoices</h3>${inv.map((i) => `<div class="mini-row"><b>${esc(i.invoice_number || 'Invoice')}</b><span>${esc(i.status || 'Unpaid')} • Due ${esc(i.due_date || 'N/A')} • ${money(i.total)}</span></div>`).join('') || '<p class="small">No invoices yet.</p>'}`;
  }
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cust-project]');
    if (c) openProject(c.dataset.custProject);
  });
  $('[data-customer-login-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    $('[data-customer-login-status]').textContent = 'Signing in...';
    const { error } = await client.auth.signInWithPassword({
      email: fd.get('email'),
      password: fd.get('password'),
    });
    if (error) {
      $('[data-customer-login-status]').textContent = 'Login failed.';
      return;
    }
    showApp();
  });
  $('[data-customer-logout]')?.addEventListener('click', async () => {
    await client.auth.signOut();
    showLogin('Signed out.');
  });
  client.auth.getSession().then(({ data }) => (data.session ? showApp() : showLogin()));
})();
