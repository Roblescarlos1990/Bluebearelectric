(function () {
  if (!window.supabase) return;
  const client = window.supabase.createClient(
    window.BLUE_BEAR_SUPABASE_URL,
    window.BLUE_BEAR_SUPABASE_KEY,
  );
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  const money = (n) =>
    Number(n || 0).toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);
  let data = {
    projects: [],
    customers: [],
    leads: [],
    invoices: [],
    schedule: [],
    gallery: [],
    tasks: [],
    milestones: [],
  };

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }
  function projectProgress(p) {
    const map = {
      New: 8,
      Planning: 18,
      Scheduled: 32,
      Approved: 38,
      'In Progress': 66,
      Testing: 80,
      Inspection: 90,
      Completed: 100,
      Closed: 100,
      'On Hold': 25,
    };
    return map[String(p.status || 'Planning')] || 20;
  }
  function projectHealth(p) {
    let score = 100;
    const progress = projectProgress(p);
    const age = daysBetween(p.created_at || new Date(), new Date());
    const overdueTasks = data.tasks.filter(
      (t) =>
        t.project_id === p.id &&
        t.due_date &&
        new Date(t.due_date) < new Date() &&
        !['Completed', 'Done'].includes(t.status),
    ).length;
    const media = data.gallery.filter((g) => g.project_id === p.id).length;
    const next = data.schedule.filter(
      (s) => s.project_id === p.id && s.start_time && new Date(s.start_time) >= new Date(),
    ).length;
    if (String(p.status) === 'On Hold') score -= 28;
    if (age > 60 && progress < 50) score -= 18;
    if (overdueTasks) score -= Math.min(30, overdueTasks * 10);
    if (progress > 40 && media === 0) score -= 12;
    if (progress < 100 && next === 0) score -= 8;
    return Math.max(25, Math.min(100, score));
  }
  async function load() {
    const queries = await Promise.all([
      client.from('projects').select('*').order('created_at', { ascending: false }),
      client.from('customers').select('*').order('created_at', { ascending: false }),
      client.from('leads').select('*').order('created_at', { ascending: false }).limit(100),
      client.from('invoices').select('*').order('created_at', { ascending: false }),
      client.from('schedule_events').select('*').order('start_time', { ascending: true }),
      client.from('gallery').select('*').order('created_at', { ascending: false }).limit(100),
      client.from('project_tasks').select('*').order('created_at', { ascending: false }),
      client.from('project_milestones').select('*').order('display_order', { ascending: true }),
    ]);
    [
      'projects',
      'customers',
      'leads',
      'invoices',
      'schedule',
      'gallery',
      'tasks',
      'milestones',
    ].forEach((k, i) => {
      data[k] = queries[i].data || [];
      if (queries[i].error) console.warn('V8.8 ' + k, queries[i].error.message);
    });
    render();
  }
  function render() {
    const g = $('[data-vf88-greeting]');
    if (g) g.textContent = `${greeting()}, here is what needs attention`;
    renderKpis();
    renderInsights();
    renderHealth();
    renderActivity();
  }
  function renderKpis() {
    const active = data.projects.filter(
      (p) => !['Completed', 'Closed'].includes(String(p.status || '')),
    );
    const outstanding = data.invoices
      .filter((i) => !['Paid', 'Void'].includes(String(i.status || '')))
      .reduce((s, i) => s + Number(i.balance_due ?? i.total ?? 0), 0);
    const collected = data.invoices
      .filter((i) => String(i.status) === 'Paid')
      .reduce((s, i) => s + Number(i.total || 0), 0);
    const newLeads = data.leads.filter((l) => String(l.status || 'New') === 'New').length;
    const due = data.tasks.filter(
      (t) =>
        t.due_date &&
        new Date(t.due_date) < new Date() &&
        !['Completed', 'Done'].includes(t.status),
    ).length;
    const avg = active.length
      ? Math.round(active.reduce((s, p) => s + projectHealth(p), 0) / active.length)
      : 100;
    const rows = [
      ['Active Projects', active.length, 'Current workload'],
      ['New Opportunities', newLeads, 'Awaiting first action'],
      ['Outstanding', money(outstanding), 'Open invoice balance'],
      ['Collected', money(collected), 'Recorded paid invoices'],
      ['Overdue Tasks', due, due ? 'Action required' : 'No overdue work'],
      ['Project Health', avg + '%', avg < 75 ? 'Review risks' : 'Portfolio condition'],
    ];
    const el = $('[data-vf88-kpis]');
    if (el)
      el.innerHTML = rows
        .map(
          (r) =>
            `<article class="vf88-kpi"><div class="vf88-kpi-label">${esc(r[0])}</div><div class="vf88-kpi-value">${esc(r[1])}</div><div class="vf88-kpi-note">${esc(r[2])}</div></article>`,
        )
        .join('');
  }
  function insights() {
    const out = [];
    const now = new Date();
    data.tasks
      .filter(
        (t) =>
          t.due_date && new Date(t.due_date) < now && !['Completed', 'Done'].includes(t.status),
      )
      .slice(0, 3)
      .forEach((t) => {
        const p = data.projects.find((p) => p.id === t.project_id);
        out.push({
          level: 'high',
          title: 'Overdue project task',
          text: `${t.title || 'Task'}${p ? ' on ' + p.project_name : ''} is past due.`,
          tab: 'projects',
        });
      });
    data.invoices
      .filter(
        (i) =>
          !['Paid', 'Void'].includes(String(i.status || '')) &&
          i.due_date &&
          new Date(i.due_date) < now,
      )
      .slice(0, 3)
      .forEach((i) => {
        out.push({
          level: 'high',
          title: 'Invoice overdue',
          text: `${i.invoice_number || 'Invoice'} has an outstanding balance of ${money(i.balance_due ?? i.total)}.`,
          tab: 'billing',
        });
      });
    data.leads
      .filter(
        (l) => String(l.status || 'New') === 'New' && daysBetween(l.created_at || now, now) >= 2,
      )
      .slice(0, 3)
      .forEach((l) => {
        out.push({
          level: 'medium',
          title: 'Lead awaiting response',
          text: `${l.full_name || l.name || 'A website lead'} has been new for ${daysBetween(l.created_at, now)} days.`,
          tab: 'crm',
        });
      });
    data.projects
      .filter((p) => !['Completed', 'Closed'].includes(String(p.status || '')))
      .forEach((p) => {
        const score = projectHealth(p);
        if (score < 65)
          out.push({
            level: 'high',
            title: 'Project at risk',
            text: `${p.project_name} has a health score of ${score}%.`,
            tab: 'projects',
          });
        else if (score < 80)
          out.push({
            level: 'medium',
            title: 'Project needs review',
            text: `${p.project_name} has a health score of ${score}%.`,
            tab: 'projects',
          });
      });
    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowEvents = data.schedule.filter(
      (s) => s.start_time && new Date(s.start_time).toDateString() === tomorrow.toDateString(),
    );
    if (tomorrowEvents.length === 0)
      out.push({
        level: 'medium',
        title: 'No work scheduled tomorrow',
        text: 'Review crew capacity and unscheduled approved projects.',
        tab: 'projects',
      });
    if (!out.length)
      out.push({
        level: 'good',
        title: 'Operations are stable',
        text: 'No urgent rule-based issues were detected from the current data.',
        tab: 'dashboard',
      });
    return out.slice(0, 8);
  }
  function renderInsights() {
    const rows = insights(),
      el = $('[data-vf88-insights]'),
      count = $('[data-vf88-alert-count]');
    if (count) count.textContent = `${rows.filter((r) => r.level !== 'good').length} alerts`;
    if (el)
      el.innerHTML = rows
        .map(
          (r, i) =>
            `<article class="vf88-insight" data-level="${r.level}"><span class="vf88-severity"></span><div><b>${esc(r.title)}</b><p>${esc(r.text)}</p></div><button class="text-action" type="button" data-vf88-jump="${esc(r.tab)}">Open</button></article>`,
        )
        .join('');
  }
  function renderHealth() {
    const el = $('[data-vf88-project-health]');
    if (!el) return;
    const rows = data.projects
      .filter((p) => !['Completed', 'Closed'].includes(String(p.status || '')))
      .map((p) => ({ ...p, health: projectHealth(p) }))
      .sort((a, b) => a.health - b.health)
      .slice(0, 7);
    el.innerHTML = rows.length
      ? rows
          .map(
            (p) =>
              `<div class="vf88-health-row"><div><b>${esc(p.project_name)}</b><div class="vf88-health-meta"><span>${esc(p.status || 'Planning')}</span><span>${esc(p.city || '')}</span><span>${projectProgress(p)}% complete</span></div></div><span class="vf88-health-score ${p.health < 65 ? 'risk' : p.health < 80 ? 'attention' : ''}">${p.health}%</span></div>`,
          )
          .join('')
      : '<div class="vf88-empty">No active projects.</div>';
  }
  function renderActivity() {
    const el = $('[data-vf88-activity]');
    if (!el) return;
    const rows = [];
    data.projects.forEach((x) =>
      rows.push({ t: x.created_at, title: 'Project created', detail: x.project_name }),
    );
    data.gallery.forEach((x) =>
      rows.push({
        t: x.created_at,
        title: 'Project media uploaded',
        detail: x.title || x.file_path || 'File',
      }),
    );
    data.invoices.forEach((x) =>
      rows.push({
        t: x.created_at,
        title: 'Invoice created',
        detail: `${x.invoice_number || 'Invoice'} · ${money(x.total)}`,
      }),
    );
    data.schedule.forEach((x) =>
      rows.push({
        t: x.created_at || x.start_time,
        title: 'Work scheduled',
        detail: x.title || 'Schedule event',
      }),
    );
    data.leads.forEach((x) =>
      rows.push({
        t: x.created_at,
        title: 'Lead received',
        detail: x.full_name || x.name || 'Website lead',
      }),
    );
    rows.sort((a, b) => new Date(b.t || 0) - new Date(a.t || 0));
    el.innerHTML =
      rows
        .slice(0, 14)
        .map(
          (r) =>
            `<div class="vf88-activity-item"><span class="vf88-activity-dot"></span><div><b>${esc(r.title)}</b><div>${esc(r.detail)}</div></div><small>${r.t ? new Date(r.t).toLocaleString() : ''}</small></div>`,
        )
        .join('') || '<div class="vf88-empty">No recent activity.</div>';
  }
  function searchRows(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const rows = [];
    data.customers.forEach((x) =>
      rows.push({
        type: 'Customer',
        title: x.full_name || x.company || 'Customer',
        meta: [x.company, x.phone, x.email, x.city].filter(Boolean).join(' · '),
        tab: 'crm',
        hay: JSON.stringify(x).toLowerCase(),
      }),
    );
    data.projects.forEach((x) =>
      rows.push({
        type: 'Project',
        title: x.project_name || 'Project',
        meta: [x.status, x.service_type, x.city].filter(Boolean).join(' · '),
        tab: 'projects',
        hay: JSON.stringify(x).toLowerCase(),
      }),
    );
    data.leads.forEach((x) =>
      rows.push({
        type: 'Lead',
        title: x.full_name || x.name || 'Lead',
        meta: [x.status, x.service_type, x.phone, x.city].filter(Boolean).join(' · '),
        tab: 'crm',
        hay: JSON.stringify(x).toLowerCase(),
      }),
    );
    data.invoices.forEach((x) =>
      rows.push({
        type: 'Invoice',
        title: x.invoice_number || 'Invoice',
        meta: [x.status, money(x.total)].filter(Boolean).join(' · '),
        tab: 'billing',
        hay: JSON.stringify(x).toLowerCase(),
      }),
    );
    data.schedule.forEach((x) =>
      rows.push({
        type: 'Schedule',
        title: x.title || 'Event',
        meta: [x.location, x.start_time ? new Date(x.start_time).toLocaleString() : '']
          .filter(Boolean)
          .join(' · '),
        tab: 'dashboard',
        hay: JSON.stringify(x).toLowerCase(),
      }),
    );
    data.gallery.forEach((x) =>
      rows.push({
        type: 'Media',
        title: x.title || 'Project file',
        meta: [x.photo_stage || x.category, x.file_type].filter(Boolean).join(' · '),
        tab: 'workspace',
        hay: JSON.stringify(x).toLowerCase(),
      }),
    );
    return rows.filter((x) => x.hay.includes(q)).slice(0, 20);
  }
  function jump(tab) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (btn) btn.click();
  }
  document.addEventListener('click', (e) => {
    const jumpBtn = e.target.closest('[data-vf88-jump]');
    if (jumpBtn) jump(jumpBtn.dataset.vf88Jump);
    if (e.target.closest('[data-vf88-refresh],[data-vf88-refresh-activity]')) load();
    if (e.target.closest('[data-vf88-open-search]')) {
      const input = $('[data-vf88-search]');
      input?.focus();
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const result = e.target.closest('[data-vf88-result-tab]');
    if (result) {
      jump(result.dataset.vf88ResultTab);
      const box = $('[data-vf88-search-results]');
      if (box) box.hidden = true;
    }
  });
  $('[data-vf88-search]')?.addEventListener('input', (e) => {
    const box = $('[data-vf88-search-results]');
    if (!box) return;
    const rows = searchRows(e.target.value);
    box.hidden = !e.target.value.trim();
    box.innerHTML = rows.length
      ? rows
          .map(
            (r) =>
              `<div class="vf88-search-result" tabindex="0" data-vf88-result-tab="${esc(r.tab)}"><span class="vf88-result-type">${esc(r.type)}</span><div><div class="vf88-result-title">${esc(r.title)}</div><div class="vf88-result-meta">${esc(r.meta)}</div></div><span>Open</span></div>`,
          )
          .join('')
      : '<div class="vf88-empty">No matching records.</div>';
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      $('[data-vf88-search]')?.focus();
    }
    if (e.key === 'Escape') {
      const box = $('[data-vf88-search-results]');
      if (box) box.hidden = true;
    }
  });
  window.addEventListener('voltflow:data-updated', load);
  client.auth.getSession().then(({ data: s }) => {
    if (s.session) setTimeout(load, 700);
  });
})();
