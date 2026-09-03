(() => {
  if (!window.supabase) return;
  const client = window.BLUE_BEAR_SUPABASE_CLIENT;
  if (!client) return;
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  let user = null,
    profile = null,
    times = [],
    announcements = [],
    forms = [],
    documents = [],
    timer = null;
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>\"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  const setStatus = (sel, text, ok = true) => {
    const el = $(sel);
    if (!el) return;
    el.textContent = text;
    el.className = 'form-status ' + (ok ? 'success' : 'error');
  };
  const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');
  const hours = (a, b) => Math.max(0, (new Date(b) - new Date(a)) / 36e5);
  function show(sel) {
    ['[data-auth-shell]', '[data-pending-shell]', '[data-employee-app]'].forEach(
      (s) => ($(s).hidden = s !== sel),
    );
  }
  function bindTabs() {
    $$('[data-auth-tab]').forEach(
      (b) =>
        (b.onclick = () => {
          $$('[data-auth-tab]').forEach((x) => x.classList.toggle('active', x === b));
          $('[data-login-form]').hidden = b.dataset.authTab !== 'login';
          $('[data-register-form]').hidden = b.dataset.authTab !== 'register';
        }),
    );
    $$('[data-page-button]').forEach(
      (b) =>
        (b.onclick = () => {
          $$('[data-page-button]').forEach((x) => x.classList.toggle('active', x === b));
          $$('[data-page]').forEach((p) =>
            p.classList.toggle('active', p.dataset.page === b.dataset.pageButton),
          );
        }),
    );
  }
  async function route() {
    const { data } = await client.auth.getUser();
    user = data.user;
    if (!user) {
      show('[data-auth-shell]');
      return;
    }
    const { data: p, error } = await client
      .from('employee_users')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error || !p) {
      show('[data-pending-shell]');
      $('[data-pending-email]').textContent = user.email || '';
      return;
    }
    profile = p;
    if (!p.active || p.approval_status !== 'approved') {
      show('[data-pending-shell]');
      $('[data-pending-email]').textContent = user.email || p.email || '';
      return;
    }
    show('[data-employee-app]');
    await load();
  }
  async function load() {
    setStatus('[data-app-status]', 'Loading…');
    const [tr, ar, fr, dr] = await Promise.all([
      client
        .from('time_entries')
        .select('*')
        .eq('employee_user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(50),
      client
        .from('company_announcements')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(30),
      client
        .from('employee_form_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false }),
      client
        .from('employee_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false }),
    ]);
    times = tr.data || [];
    announcements = ar.data || [];
    forms = fr.data || [];
    documents = dr.data || [];
    render();
    setStatus('[data-app-status]', '');
  }
  function openEntry() {
    return times.find((t) => !t.end_time);
  }
  function render() {
    const name = profile.full_name || user.email;
    $('[data-welcome]').textContent = `Welcome, ${name.split(' ')[0]}`;
    $('[data-account-name]').textContent = name;
    $('[data-account-email]').textContent = profile.email || user.email || '';
    $('[data-account-phone]').textContent = profile.phone || 'Not provided';
    const now = new Date(),
      today = now.toISOString().slice(0, 10),
      monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    let todayH = 0,
      weekH = 0;
    times.forEach((t) => {
      const end = t.end_time || new Date();
      const h = hours(t.start_time, end);
      if (String(t.start_time).slice(0, 10) === today) todayH += h;
      if (new Date(t.start_time) >= monday) weekH += h;
    });
    $('[data-today-hours]').textContent = todayH.toFixed(2);
    $('[data-week-hours]').textContent = weekH.toFixed(2);
    const open = openEntry(),
      label = open ? 'Clock Out' : 'Clock In';
    $('[data-clock-status]').textContent = open ? 'Clocked In' : 'Clocked Out';
    $('[data-quick-clock]').textContent = label;
    $('[data-clock-action]').textContent = label;
    $('[data-live-shift]').textContent = open
      ? `Started ${fmt(open.start_time)}`
      : 'No active shift';
    if (timer) clearInterval(timer);
    const tick = () => {
      $('[data-live-duration]').textContent = open
        ? new Date(Date.now() - new Date(open.start_time)).toISOString().slice(11, 19)
        : '00:00:00';
    };
    tick();
    timer = setInterval(tick, 1000);
    $('[data-time-list]').innerHTML = times.length
      ? times
          .map(
            (t) =>
              `<div class="portal-row"><div><b>${fmt(t.start_time)}</b><p>${t.end_time ? 'Ended ' + fmt(t.end_time) : 'Active shift'}</p></div><strong>${hours(t.start_time, t.end_time || new Date()).toFixed(2)} hrs</strong></div>`,
          )
          .join('')
      : '<p>No time entries yet.</p>';
    $('[data-announcement-list]').innerHTML = announcements.length
      ? announcements
          .map(
            (a) =>
              `<div class="portal-row"><div><b class="priority-${esc(a.priority)}">${esc(a.title)}</b><p>${esc(a.message)}</p><small>${fmt(a.published_at)} · ${esc(a.priority)}</small></div></div>`,
          )
          .join('')
      : '<p>No announcements yet.</p>';
    $('[data-latest-announcement]').innerHTML = announcements[0]
      ? `<b class="priority-${esc(announcements[0].priority)}">${esc(announcements[0].title)}</b><p>${esc(announcements[0].message)}</p>`
      : '<p>No announcements yet.</p>';
    $('[data-form-list]').innerHTML = forms.length
      ? forms
          .map(
            (f) =>
              `<div class="portal-row"><div><b>${esc(f.subject)}</b><p>${esc(f.form_type.replaceAll('_', ' '))} · ${esc(f.status)}</p><small>${fmt(f.submitted_at)}</small></div></div>`,
          )
          .join('')
      : '<p>No submitted forms.</p>';
    $('[data-document-list]').innerHTML = documents.length
      ? documents
          .map(
            (d) =>
              `<div class="portal-row"><div><b>${esc(d.document_type)}</b><p>${esc(d.file_name)}</p><small>${d.expires_on ? 'Expires ' + esc(d.expires_on) : 'No expiration'}</small></div><div class="portal-actions"><button data-doc-open="${esc(d.storage_path)}">Open</button><button data-doc-delete="${esc(d.id)}" data-doc-path="${esc(d.storage_path)}">Delete</button></div></div>`,
          )
          .join('')
      : '<p>No uploaded documents.</p>';
    $$('[data-doc-open]').forEach((b) => (b.onclick = () => openDoc(b.dataset.docOpen)));
    $$('[data-doc-delete]').forEach(
      (b) => (b.onclick = () => deleteDoc(b.dataset.docDelete, b.dataset.docPath)),
    );
    const recent = [
      ...times.slice(0, 3).map((t) => `Time entry · ${fmt(t.start_time)}`),
      ...forms.slice(0, 3).map((f) => `${f.subject} · ${f.status}`),
      ...documents.slice(0, 3).map((d) => `${d.document_type} uploaded`),
    ].slice(0, 7);
    $('[data-recent-activity]').innerHTML = recent.length
      ? recent.map((x) => `<div class="portal-row"><span>${esc(x)}</span></div>`).join('')
      : '<p>No activity yet.</p>';
  }
  async function clock() {
    const open = openEntry();
    setStatus('[data-app-status]', open ? 'Clocking out…' : 'Clocking in…');
    const result = open
      ? await client
          .from('time_entries')
          .update({ end_time: new Date().toISOString() })
          .eq('id', open.id)
          .eq('employee_user_id', user.id)
      : await client.from('time_entries').insert({
          employee_user_id: user.id,
          start_time: new Date().toISOString(),
          notes: 'Employee portal time clock',
        });
    if (result.error) {
      setStatus('[data-app-status]', result.error.message, false);
      return;
    }
    await load();
  }
  async function openDoc(path) {
    const { data, error } = await client.storage
      .from('employee-documents')
      .createSignedUrl(path, 60);
    if (error) return setStatus('[data-app-status]', error.message, false);
    window.open(data.signedUrl, '_blank', 'noopener');
  }
  async function deleteDoc(id, path) {
    if (!confirm('Delete this document?')) return;
    const s = await client.storage.from('employee-documents').remove([path]);
    if (s.error) return setStatus('[data-app-status]', s.error.message, false);
    await client.from('employee_documents').delete().eq('id', id).eq('user_id', user.id);
    await load();
  }
  $('[data-login-form]').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setStatus('[data-login-status]', 'Signing in…');
    const { error } = await client.auth.signInWithPassword({
      email: f.get('email'),
      password: f.get('password'),
    });
    if (error) return setStatus('[data-login-status]', error.message, false);
    await route();
  };
  $('[data-register-form]').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      pw = String(f.get('password')),
      cp = String(f.get('confirm_password'));
    if (pw !== cp) return setStatus('[data-register-status]', 'Passwords do not match.', false);
    setStatus('[data-register-status]', 'Creating account…');
    const { error } = await client.auth.signUp({
      email: f.get('email'),
      password: pw,
      options: {
        emailRedirectTo: new URL('employee-portal.html', location.href).href,
        data: { account_type: 'employee', full_name: f.get('full_name'), phone: f.get('phone') },
      },
    });
    if (error) return setStatus('[data-register-status]', error.message, false);
    setStatus(
      '[data-register-status]',
      'Account created. Check your email to verify your address, then return here.',
    );
    e.currentTarget.reset();
  };
  $('[data-forgot-password]').onclick = async () => {
    const email = prompt('Enter your employee email address:');
    if (!email) return;
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: new URL('reset-password.html', location.href).href,
    });
    setStatus('[data-login-status]', error ? error.message : 'Password reset email sent.', !error);
  };
  $$('[data-signout],[data-pending-signout]').forEach(
    (b) =>
      (b.onclick = async () => {
        await client.auth.signOut();
        location.reload();
      }),
  );
  $$('[data-quick-clock],[data-clock-action]').forEach((b) => (b.onclick = clock));
  $('[data-form-submit]').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await client.from('employee_form_submissions').insert({
      user_id: user.id,
      form_type: f.get('form_type'),
      subject: f.get('subject'),
      details: f.get('details'),
    });
    if (error) return setStatus('[data-app-status]', error.message, false);
    e.currentTarget.reset();
    await load();
  };
  $('[data-document-upload]').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      file = f.get('file');
    if (!file || file.size > 10485760)
      return setStatus('[data-app-status]', 'Choose a file under 10 MB.', false);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-'),
      path = `${user.id}/${Date.now()}-${safe}`;
    setStatus('[data-app-status]', 'Uploading document…');
    const up = await client.storage
      .from('employee-documents')
      .upload(path, file, { upsert: false });
    if (up.error) return setStatus('[data-app-status]', up.error.message, false);
    const rec = await client.from('employee_documents').insert({
      user_id: user.id,
      document_type: f.get('document_type'),
      file_name: file.name,
      storage_path: path,
      expires_on: f.get('expires_on') || null,
    });
    if (rec.error) {
      await client.storage.from('employee-documents').remove([path]);
      return setStatus('[data-app-status]', rec.error.message, false);
    }
    e.currentTarget.reset();
    await load();
  };
  $('[data-account-reset]').onclick = async () => {
    const { error } = await client.auth.resetPasswordForEmail(user.email, {
      redirectTo: new URL('reset-password.html', location.href).href,
    });
    setStatus('[data-app-status]', error ? error.message : 'Password reset email sent.', !error);
  };
  bindTabs();
  client.auth.onAuthStateChange(() => route());
  route();
})();
