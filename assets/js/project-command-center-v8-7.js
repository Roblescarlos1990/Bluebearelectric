(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = $('[data-pcc-root]');
  if (!root) return;
  let client = null,
    projects = [],
    customers = new Map(),
    selected = null;
  const money = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(n || 0));
  const date = (v) =>
    v
      ? new Date(v).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Not set';
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const statusClass = (v) =>
    'status-' +
    String(v || 'planning')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
  const getClient = () => {
    if (client) return client;
    if (!window.BLUE_BEAR_SUPABASE_CLIENT) return null;
    client = window.BLUE_BEAR_SUPABASE_CLIENT;
    return client;
  };
  async function isAdmin() {
    const c = getClient();
    if (!c) return false;
    const {
      data: { user },
    } = await c.auth.getUser();
    if (!user) return false;
    const { data } = await c
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    return !!data;
  }
  async function load() {
    if (!(await isAdmin())) return;
    const c = getClient();
    const [{ data: p, error: pe }, { data: cu }] = await Promise.all([
      c.from('projects').select('*').order('created_at', { ascending: false }),
      c.from('customers').select('id,full_name,company,phone,email,city'),
    ]);
    if (pe) {
      showError(pe.message);
      return;
    }
    projects = p || [];
    customers = new Map((cu || []).map((x) => [x.id, x]));
    render();
    if (selected) {
      const found = projects.find((x) => x.id === selected.id);
      if (found) openProject(found.id);
    }
  }
  function filtered() {
    const q = ($('[data-pcc-search]')?.value || '').toLowerCase();
    const st = $('[data-pcc-status]')?.value || '';
    return projects.filter((p) => {
      const c = customers.get(p.customer_id) || {};
      const hay = [
        p.project_name,
        p.service_type,
        p.status,
        p.city,
        p.address,
        c.full_name,
        c.company,
      ]
        .join(' ')
        .toLowerCase();
      return (!q || hay.includes(q)) && (!st || p.status === st);
    });
  }
  function render() {
    const list = filtered();
    $('[data-pcc-count]').textContent = `${list.length} project${list.length === 1 ? '' : 's'}`;
    const active = projects.filter(
      (p) => !['Completed', 'Closed', 'Cancelled'].includes(p.status),
    ).length;
    const attention = projects.filter((p) =>
      ['On Hold', 'Delayed', 'Needs Attention'].includes(p.status),
    ).length;
    const completing = projects.filter((p) => p.status === 'Completed').length;
    $('[data-pcc-kpis]').innerHTML = [
      ['Active Projects', active, 'Projects currently moving through operations'],
      ['Needs Attention', attention, 'Projects with a hold or attention status'],
      ['Completed', completing, 'Projects recorded as completed'],
      ['Portfolio', projects.length, 'Total projects in the system'],
    ]
      .map(
        (x) =>
          `<article class="pcc-kpi"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`,
      )
      .join('');
    $('[data-pcc-project-list]').innerHTML = list.length
      ? list
          .map((p) => {
            const c = customers.get(p.customer_id) || {};
            return `<button class="pcc-project-card ${selected?.id === p.id ? 'active' : ''}" data-project-id="${p.id}"><div class="pcc-card-top"><span class="pcc-status ${statusClass(p.status)}">${esc(p.status || 'Planning')}</span><span class="pcc-card-city">${esc(p.city || 'Location pending')}</span></div><h4>${esc(p.project_name)}</h4><p>${esc(c.company || c.full_name || 'Customer not assigned')}</p><div class="pcc-card-meta"><span>${esc(p.service_type || 'General Electrical')}</span><span>${date(p.start_date)}</span></div></button>`;
          })
          .join('')
      : '<div class="pcc-empty-list">No projects match the current filters.</div>';
    $$('[data-project-id]').forEach((b) =>
      b.addEventListener('click', () => openProject(b.dataset.projectId)),
    );
  }
  async function openProject(id) {
    const c = getClient();
    selected = projects.find((p) => p.id === id);
    if (!selected) return;
    render();
    const command = $('[data-pcc-command]');
    command.innerHTML =
      '<div class="pcc-loading"><span></span>Loading project command center…</div>';
    const q = (table, cols = '*') => c.from(table).select(cols).eq('project_id', id);
    const results = await Promise.allSettled([
      q('project_milestones'),
      q('project_tasks'),
      q('project_activity'),
      q('gallery', 'id,title,category,image_url,file_path,photo_stage,is_public,created_at'),
      q('schedule_events'),
      q('estimate_items'),
      q('estimates'),
      q('invoices'),
      q('project_notes'),
    ]);
    const data = results.map((r) => (r.status === 'fulfilled' ? r.value.data || [] : []));
    const [milestones, tasks, activity, gallery, schedule, items, estimates, invoices, notes] =
      data;
    renderCommand({
      milestones,
      tasks,
      activity,
      gallery,
      schedule,
      items,
      estimates,
      invoices,
      notes,
    });
  }
  function healthScore({ tasks, milestones, schedule, gallery, estimates, invoices }) {
    let score = 70;
    const overdue = tasks.filter(
      (t) =>
        t.due_date &&
        new Date(t.due_date) < new Date() &&
        !['Completed', 'Done'].includes(t.status),
    ).length;
    score -= overdue * 8;
    if (gallery.length) score += 5;
    if (milestones.length) score += 5;
    if (schedule.length) score += 5;
    if (estimates.length) score += 5;
    if (invoices.some((i) => i.status === 'Overdue')) score -= 12;
    return Math.max(20, Math.min(100, score));
  }
  function renderCommand(ctx) {
    const p = selected,
      cust = customers.get(p.customer_id) || {};
    const score = healthScore(ctx);
    const openTasks = ctx.tasks.filter((t) => !['Completed', 'Done'].includes(t.status));
    const completedMilestones = ctx.milestones.filter((m) => m.status === 'Completed').length;
    const progress = ctx.milestones.length
      ? Math.round((completedMilestones / ctx.milestones.length) * 100)
      : p.status === 'Completed'
        ? 100
        : p.status === 'In Progress'
          ? 55
          : p.status === 'Scheduled'
            ? 25
            : 10;
    const estimateTotal = ctx.estimates.reduce((a, x) => a + Number(x.total || 0), 0);
    const invoiceTotal = ctx.invoices.reduce((a, x) => a + Number(x.total || 0), 0);
    $('[data-pcc-command]').innerHTML = `
      <section class="pcc-project-head"><div><div class="pcc-head-meta"><span class="pcc-status ${statusClass(p.status)}">${esc(p.status || 'Planning')}</span><span>${esc(p.service_type || 'General Electrical')}</span><span>${esc(p.city || 'Location pending')}</span></div><h2>${esc(p.project_name)}</h2><p>${esc(cust.company || cust.full_name || 'Customer not assigned')} ${p.address ? '• ' + esc(p.address) : ''}</p></div><div class="pcc-health"><div class="pcc-health-ring" style="--score:${score}"><strong>${score}</strong><span>Health</span></div></div></section>
      <nav class="pcc-subnav"><button class="active" data-pcc-view="overview">Overview</button><button data-pcc-view="tasks">Tasks</button><button data-pcc-view="timeline">Timeline</button><button data-pcc-view="photos">Photos</button><button data-pcc-view="financial">Financial</button><button data-pcc-view="schedule">Schedule</button></nav>
      <div class="pcc-view active" data-pcc-view-page="overview">
        <div class="pcc-metric-row"><article><span>Progress</span><strong>${progress}%</strong><div class="pcc-progress"><i style="width:${progress}%"></i></div></article><article><span>Open Tasks</span><strong>${openTasks.length}</strong><small>${openTasks.filter((t) => t.priority === 'High' || t.priority === 'Critical').length} high priority</small></article><article><span>Photos & Files</span><strong>${ctx.gallery.length}</strong><small>Project media records</small></article><article><span>Next Schedule</span><strong>${ctx.schedule.length ? date(ctx.schedule.sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0].start_time) : 'Not set'}</strong><small>${ctx.schedule.length ? 'Upcoming project event' : 'Schedule an event'}</small></article></div>
        <div class="pcc-overview-grid"><section class="pcc-panel"><div class="pcc-panel-head"><h3>Milestone Path</h3><button data-pcc-action="milestone">Add Milestone</button></div>${renderMilestones(ctx.milestones)}</section><section class="pcc-panel"><div class="pcc-panel-head"><h3>Priority Actions</h3><button data-pcc-action="task">Add Task</button></div>${renderTasks(openTasks.slice(0, 5))}</section><section class="pcc-panel"><div class="pcc-panel-head"><h3>Recent Activity</h3></div>${renderActivity(ctx.activity, ctx.notes)}</section><section class="pcc-panel pcc-intelligence"><div class="pcc-panel-head"><h3>Operations Intelligence</h3></div>${renderInsights(score, ctx)}</section></div>
      </div>
      <div class="pcc-view" data-pcc-view-page="tasks"><section class="pcc-panel"><div class="pcc-panel-head"><h3>Project Tasks</h3><button data-pcc-action="task">Add Task</button></div>${renderTasks(ctx.tasks)}</section></div>
      <div class="pcc-view" data-pcc-view-page="timeline"><section class="pcc-panel"><div class="pcc-panel-head"><h3>Unified Activity Timeline</h3><button data-pcc-action="activity">Record Activity</button></div>${renderActivity(ctx.activity, ctx.notes, true)}</section></div>
      <div class="pcc-view" data-pcc-view-page="photos"><section class="pcc-panel"><div class="pcc-panel-head"><h3>Project Media</h3><button data-tab-jump="workspace">Open Upload Workspace</button></div>${renderPhotos(ctx.gallery)}</section></div>
      <div class="pcc-view" data-pcc-view-page="financial"><div class="pcc-financial-grid"><article><span>Estimate Value</span><strong>${money(estimateTotal)}</strong><small>${ctx.estimates.length} estimate record(s)</small></article><article><span>Invoiced</span><strong>${money(invoiceTotal)}</strong><small>${ctx.invoices.length} invoice record(s)</small></article><article><span>Variance</span><strong>${money(estimateTotal - invoiceTotal)}</strong><small>Estimate less invoiced</small></article></div><section class="pcc-panel"><p>Use the Estimates & Billing workspace for line-item editing, customer documents, payments, and financial controls.</p><button class="btn yellow" data-tab-jump="billing">Open Estimates & Billing</button></section></div>
      <div class="pcc-view" data-pcc-view-page="schedule"><section class="pcc-panel"><div class="pcc-panel-head"><h3>Project Schedule</h3><button data-tab-jump="workspace">Open Schedule Workspace</button></div>${renderSchedule(ctx.schedule)}</section></div>
      <dialog class="pcc-dialog" data-pcc-dialog><form method="dialog"><button class="pcc-dialog-close" value="cancel">Close</button></form><div data-pcc-dialog-body></div></dialog>`;
    bindCommand(ctx);
  }
  const renderMilestones = (a) =>
    a.length
      ? `<div class="pcc-milestones">${a
          .sort((x, y) => (x.display_order || 0) - (y.display_order || 0))
          .map(
            (m) =>
              `<div class="pcc-milestone ${m.status === 'Completed' ? 'done' : ''}"><i></i><div><strong>${esc(m.title)}</strong><span>${esc(m.status || 'Pending')} ${m.target_date ? '• ' + date(m.target_date) : ''}</span></div></div>`,
          )
          .join('')}</div>`
      : '<div class="pcc-empty-inline">No milestones yet. Add the project path to make progress visible.</div>';
  const renderTasks = (a) =>
    a.length
      ? `<div class="pcc-task-list">${a.map((t) => `<article><div><span class="pcc-priority priority-${String(t.priority || 'normal').toLowerCase()}">${esc(t.priority || 'Normal')}</span><strong>${esc(t.title)}</strong><small>${esc(t.status || 'Open')} ${t.due_date ? '• Due ' + date(t.due_date) : ''}</small></div><button data-complete-task="${t.id}">${['Completed', 'Done'].includes(t.status) ? 'Completed' : 'Mark Complete'}</button></article>`).join('')}</div>`
      : '<div class="pcc-empty-inline">No tasks recorded for this project.</div>';
  const renderActivity = (a, n, full = false) => {
    const all = [
      ...a.map((x) => ({ ...x, _type: 'activity' })),
      ...n.map((x) => ({
        id: x.id,
        title: x.note_type || 'Project note',
        description: x.note,
        created_at: x.created_at,
        _type: 'note',
      })),
    ].sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
    const arr = full ? all : all.slice(0, 6);
    return arr.length
      ? `<div class="pcc-activity-list">${arr.map((x) => `<article><i></i><div><strong>${esc(x.title || x.event_type || 'Project activity')}</strong><p>${esc(x.description || x.details || '')}</p><small>${new Date(x.created_at).toLocaleString()}</small></div></article>`).join('')}</div>`
      : '<div class="pcc-empty-inline">No project activity recorded yet.</div>';
  };
  const renderPhotos = (a) =>
    a.length
      ? `<div class="pcc-photo-grid">${a.map((x) => `<figure>${x.image_url || x.file_path ? `<img src="${esc(x.image_url || x.file_path)}" alt="${esc(x.title || x.category || 'Project photo')}">` : '<div class="pcc-photo-placeholder"></div>'}<figcaption><strong>${esc(x.title || x.category || 'Project media')}</strong><span>${esc(x.photo_stage || x.category || 'General')}</span></figcaption></figure>`).join('')}</div>`
      : '<div class="pcc-empty-inline">No project media is attached yet.</div>';
  const renderSchedule = (a) =>
    a.length
      ? `<div class="pcc-schedule-list">${a
          .sort((x, y) => new Date(x.start_time) - new Date(y.start_time))
          .map(
            (x) =>
              `<article><time>${new Date(x.start_time).toLocaleString()}</time><div><strong>${esc(x.title)}</strong><span>${esc(x.location || 'Location not set')}</span></div></article>`,
          )
          .join('')}</div>`
      : '<div class="pcc-empty-inline">No schedule events are attached to this project.</div>';
  function renderInsights(score, c) {
    let items = [];
    if (score < 70)
      items.push(
        'Project health needs attention. Review overdue tasks, invoices, and schedule dependencies.',
      );
    else
      items.push(
        'Project health is stable based on currently recorded tasks, schedule, media, and financial records.',
      );
    if (!c.milestones.length)
      items.push('Create milestones so progress and upcoming phases are visible to the team.');
    if (!c.gallery.length)
      items.push('Add project photos to strengthen documentation and customer updates.');
    if (
      c.tasks.some(
        (t) =>
          t.due_date &&
          new Date(t.due_date) < new Date() &&
          !['Completed', 'Done'].includes(t.status),
      )
    )
      items.push('One or more project tasks are overdue.');
    if (!c.schedule.length) items.push('No project schedule event is recorded.');
    return `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><button class="btn blue" data-tab-jump="ai">Open Operations Intelligence</button>`;
  }
  function bindCommand(ctx) {
    $$('[data-pcc-view]').forEach((b) =>
      b.addEventListener('click', () => {
        $$('[data-pcc-view]').forEach((x) => x.classList.toggle('active', x === b));
        $$('[data-pcc-view-page]').forEach((x) =>
          x.classList.toggle('active', x.dataset.pccViewPage === b.dataset.pccView),
        );
      }),
    );
    $$('[data-tab-jump]').forEach((b) =>
      b.addEventListener('click', () => {
        const t = $(`[data-tab="${b.dataset.tabJump}"]`);
        if (t) t.click();
      }),
    );
    $$('[data-pcc-action]').forEach((b) =>
      b.addEventListener('click', () => openDialog(b.dataset.pccAction)),
    );
    $$('[data-complete-task]').forEach((b) =>
      b.addEventListener('click', () => completeTask(b.dataset.completeTask)),
    );
  }
  async function completeTask(id) {
    const c = getClient();
    const { error } = await c
      .from('project_tasks')
      .update({ status: 'Completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) alert(error.message);
    else openProject(selected.id);
  }
  function openDialog(type) {
    const d = $('[data-pcc-dialog]'),
      body = $('[data-pcc-dialog-body]');
    const forms = {
      task: `<h3>Add Project Task</h3><form class="pcc-dialog-form" data-dialog-form="task"><input name="title" placeholder="Task title" required><select name="priority"><option>Normal</option><option>High</option><option>Critical</option><option>Low</option></select><input type="date" name="due_date"><textarea name="description" placeholder="Task details"></textarea><button class="btn yellow" type="submit">Save Task</button></form>`,
      milestone: `<h3>Add Project Milestone</h3><form class="pcc-dialog-form" data-dialog-form="milestone"><input name="title" placeholder="Milestone title" required><input type="date" name="target_date"><select name="status"><option>Pending</option><option>In Progress</option><option>Completed</option></select><button class="btn yellow" type="submit">Save Milestone</button></form>`,
      activity: `<h3>Record Project Activity</h3><form class="pcc-dialog-form" data-dialog-form="activity"><input name="title" placeholder="Activity title" required><select name="event_type"><option>Update</option><option>Customer Communication</option><option>Field Work</option><option>Safety</option><option>Testing</option><option>Financial</option></select><textarea name="description" placeholder="What happened?"></textarea><button class="btn yellow" type="submit">Save Activity</button></form>`,
    };
    body.innerHTML = forms[type];
    d.showModal();
    $('[data-dialog-form]', d).addEventListener('submit', (e) => saveDialog(e, type, d));
  }
  async function saveDialog(e, type, d) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget),
      obj = Object.fromEntries(fd.entries()),
      c = getClient();
    obj.project_id = selected.id;
    let table =
      type === 'task'
        ? 'project_tasks'
        : type === 'milestone'
          ? 'project_milestones'
          : 'project_activity';
    if (type === 'task') {
      obj.status = 'Open';
      if (!obj.due_date) delete obj.due_date;
    }
    if (type === 'milestone' && !obj.target_date) delete obj.target_date;
    const { error } = await c.from(table).insert(obj);
    if (error) alert(error.message);
    else {
      d.close();
      openProject(selected.id);
    }
  }
  function showError(m) {
    $('[data-pcc-project-list]').innerHTML = `<div class="pcc-empty-list">${esc(m)}</div>`;
  }
  $('[data-pcc-search]')?.addEventListener('input', render);
  $('[data-pcc-status]')?.addEventListener('change', render);
  $('[data-pcc-refresh]')?.addEventListener('click', load);
  // Wait for auth/dashboard initialization from the existing admin backend.
  const obs = new MutationObserver(() => {
    const dash = $('[data-admin-dashboard]');
    if (dash && dash.style.display !== 'none' && !projects.length) load();
  });
  const dash = $('[data-admin-dashboard]');
  if (dash) obs.observe(dash, { attributes: true, attributeFilter: ['style', 'class'] });
  setTimeout(() => {
    if (dash && dash.style.display !== 'none') load();
  }, 1200);
})();
