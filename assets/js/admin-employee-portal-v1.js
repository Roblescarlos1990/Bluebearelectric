(() => {
  if (!window.supabase) return;
  const client = window.BLUE_BEAR_SUPABASE_CLIENT;
  if (!client) return;
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>\"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');
  let employees = [],
    forms = [],
    announcements = [],
    documents = [];
  const status = (text, ok = true) => {
    const el = $('[data-admin-status]');
    el.textContent = text;
    el.className = 'form-status ' + (ok ? 'success' : 'error');
  };
  function bindTabs() {
    $$('[data-admin-page-button]').forEach(
      (b) =>
        (b.onclick = () => {
          $$('[data-admin-page-button]').forEach((x) => x.classList.toggle('active', x === b));
          $$('[data-admin-page]').forEach((p) =>
            p.classList.toggle('active', p.dataset.adminPage === b.dataset.adminPageButton),
          );
        }),
    );
  }
  async function authRoute() {
    const { data } = await client.auth.getUser();
    if (!data.user) {
      $('[data-admin-login-shell]').hidden = false;
      $('[data-admin-app]').hidden = true;
      return;
    }
    const { data: a } = await client
      .from('admin_users')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle();
    if (!a) {
      await client.auth.signOut();
      $('[data-admin-login-status]').textContent = 'This account is not an administrator.';
      return;
    }
    $('[data-admin-login-shell]').hidden = true;
    $('[data-admin-app]').hidden = false;
    await load();
  }
  async function load() {
    status('Loading…');
    const [e, f, a, d] = await Promise.all([
      client.from('employee_users').select('*').order('created_at', { ascending: false }),
      client
        .from('employee_form_submissions')
        .select('*')
        .order('submitted_at', { ascending: false }),
      client.from('company_announcements').select('*').order('published_at', { ascending: false }),
      client.from('employee_documents').select('*').order('uploaded_at', { ascending: false }),
    ]);
    employees = e.data || [];
    forms = f.data || [];
    announcements = a.data || [];
    documents = d.data || [];
    render();
    status('');
  }
  function render() {
    $('[data-pending-count]').textContent = employees.filter(
      (x) => x.approval_status === 'pending',
    ).length;
    $('[data-approved-count]').textContent = employees.filter(
      (x) => x.approval_status === 'approved' && x.active,
    ).length;
    $('[data-disabled-count]').textContent = employees.filter(
      (x) => !x.active || x.approval_status === 'disabled',
    ).length;
    $('[data-employee-account-list]').innerHTML = employees.length
      ? employees
          .map(
            (e) =>
              `<div class="portal-row"><div><b>${esc(e.full_name)}</b><p>${esc(e.email || '')} · ${esc(e.phone || 'No phone')}</p><small>${esc(e.approval_status)} · Created ${fmt(e.created_at)}</small></div><div class="portal-actions">${e.approval_status === 'pending' ? `<button data-account-action="approve" data-id="${e.user_id}">Approve</button><button data-account-action="reject" data-id="${e.user_id}">Reject</button>` : ''}${e.active ? `<button data-account-action="disable" data-id="${e.user_id}">Disable</button>` : `<button data-account-action="approve" data-id="${e.user_id}">Activate</button>`}</div></div>`,
          )
          .join('')
      : '<p>No employee accounts.</p>';
    $$('[data-account-action]').forEach(
      (b) => (b.onclick = () => accountAction(b.dataset.id, b.dataset.accountAction)),
    );
    $('[data-admin-form-list]').innerHTML = forms.length
      ? forms
          .map(
            (f) =>
              `<div class="portal-row"><div><b>${esc(f.subject)}</b><p>${esc(f.form_type.replaceAll('_', ' '))} · ${esc(f.details)}</p><small>${esc(f.status)} · ${fmt(f.submitted_at)}</small></div><div class="portal-actions"><button data-form-status="Reviewed" data-id="${f.id}">Reviewed</button><button data-form-status="Approved" data-id="${f.id}">Approve</button><button data-form-status="Denied" data-id="${f.id}">Deny</button></div></div>`,
          )
          .join('')
      : '<p>No employee forms.</p>';
    $$('[data-form-status]').forEach(
      (b) => (b.onclick = () => formAction(b.dataset.id, b.dataset.formStatus)),
    );
    $('[data-admin-announcement-list]').innerHTML = announcements.length
      ? announcements
          .map(
            (a) =>
              `<div class="portal-row"><div><b class="priority-${esc(a.priority)}">${esc(a.title)}</b><p>${esc(a.message)}</p><small>${fmt(a.published_at)}</small></div><div class="portal-actions"><button data-announcement-delete="${a.id}">Delete</button></div></div>`,
          )
          .join('')
      : '<p>No announcements.</p>';
    $$('[data-announcement-delete]').forEach(
      (b) => (b.onclick = () => deleteAnnouncement(b.dataset.announcementDelete)),
    );
    $('[data-admin-document-list]').innerHTML = documents.length
      ? documents
          .map(
            (d) =>
              `<div class="portal-row"><div><b>${esc(d.document_type)}</b><p>${esc(d.file_name)} · Employee ${esc(d.user_id)}</p><small>${d.expires_on ? 'Expires ' + esc(d.expires_on) : 'No expiration'} · ${fmt(d.uploaded_at)}</small></div><div class="portal-actions"><button data-admin-doc-open="${esc(d.storage_path)}">Open</button></div></div>`,
          )
          .join('')
      : '<p>No employee documents.</p>';
    $$('[data-admin-doc-open]').forEach((b) => (b.onclick = () => openDoc(b.dataset.adminDocOpen)));
  }
  async function accountAction(id, action) {
    const patch =
      action === 'approve'
        ? { approval_status: 'approved', active: true, approved_at: new Date().toISOString() }
        : action === 'reject'
          ? { approval_status: 'rejected', active: false }
          : { approval_status: 'disabled', active: false };
    const { error } = await client
      .from('employee_users')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('user_id', id);
    if (error) return status(error.message, false);
    await load();
  }
  async function formAction(id, next) {
    const { data } = await client.auth.getUser();
    const { error } = await client
      .from('employee_form_submissions')
      .update({ status: next, reviewed_by: data.user.id, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return status(error.message, false);
    await load();
  }
  async function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement?')) return;
    const { error } = await client.from('company_announcements').delete().eq('id', id);
    if (error) return status(error.message, false);
    await load();
  }
  async function openDoc(path) {
    const { data, error } = await client.storage
      .from('employee-documents')
      .createSignedUrl(path, 60);
    if (error) return status(error.message, false);
    window.open(data.signedUrl, '_blank', 'noopener');
  }
  $('[data-admin-login-form]').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    $('[data-admin-login-status]').textContent = 'Signing in…';
    const { error } = await client.auth.signInWithPassword({
      email: f.get('email'),
      password: f.get('password'),
    });
    if (error) {
      $('[data-admin-login-status]').textContent = error.message;
      return;
    }
    await authRoute();
  };
  $('[data-admin-signout]').onclick = async () => {
    await client.auth.signOut();
    location.reload();
  };
  $('[data-announcement-form]').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      { data } = await client.auth.getUser();
    const { error } = await client.from('company_announcements').insert({
      title: f.get('title'),
      priority: f.get('priority'),
      message: f.get('message'),
      created_by: data.user.id,
    });
    if (error) return status(error.message, false);
    e.currentTarget.reset();
    await load();
  };
  bindTabs();
  client.auth.onAuthStateChange(() => authRoute());
  authRoute();
})();
