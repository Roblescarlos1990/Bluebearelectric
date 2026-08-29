(function () {
  if (!window.supabase) return;
  const client = window.supabase.createClient(
    window.BLUE_BEAR_SUPABASE_URL,
    window.BLUE_BEAR_SUPABASE_KEY,
  );
  const $ = (s) => document.querySelector(s);
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const fmtDate = (v) =>
    v
      ? new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      : 'Not scheduled';
  const isoLocal = (v) => {
    if (!v) return '';
    const d = new Date(v);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  const todayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };
  let leads = [],
    notes = [],
    customers = [],
    projects = [],
    selectedId = null,
    session = null;
  const statuses = [
    'New',
    'Contacted',
    'Estimate Scheduled',
    'Quote Sent',
    'Approved',
    'In Progress',
    'Completed',
    'Closed',
  ];
  const priorities = ['Hot', 'High', 'Normal', 'Low'];

  function flash(message, ok = true) {
    const el = $('[data-admin-message]');
    if (!el) return;
    el.textContent = message;
    el.className = 'form-status ' + (ok ? 'success' : 'error');
  }
  async function isReady() {
    const { data } = await client.auth.getSession();
    session = data.session;
    return !!session;
  }
  async function load() {
    if (!(await isReady())) return;
    const [lr, nr, cr, pr] = await Promise.all([
      client.from('leads').select('*').order('created_at', { ascending: false }),
      client.from('lead_notes').select('*').order('created_at', { ascending: false }),
      client.from('customers').select('*').order('created_at', { ascending: false }),
      client.from('projects').select('*').order('created_at', { ascending: false }),
    ]);
    if (lr.error) {
      console.error(lr.error);
      renderSetupError(lr.error.message);
      return;
    }
    leads = lr.data || [];
    notes = nr.data || [];
    customers = cr.data || [];
    projects = pr.data || [];
    if (nr.error) console.warn('Lead notes unavailable:', nr.error.message);
    renderAll();
  }
  function renderSetupError(message) {
    const wrap = $('[data-crm-lead-list]');
    if (wrap)
      wrap.innerHTML = `<div class="crm-setup-error"><b>CRM setup required</b><p>${esc(message)}</p><p>Run <code>docs/sql/V8-5-CRM-LEAD-WORKFLOW.sql</code> in Supabase SQL Editor.</p></div>`;
  }
  function filteredLeads() {
    const q = ($('[data-lead-search]')?.value || '').toLowerCase().trim();
    const st = $('[data-lead-status-filter]')?.value || '';
    const pri = $('[data-lead-priority-filter]')?.value || '';
    const follow = $('[data-lead-followup-filter]')?.value || '';
    const now = new Date();
    return leads.filter((l) => {
      const hay = [
        l.full_name,
        l.name,
        l.phone,
        l.email,
        l.city,
        l.service_type,
        l.service,
        l.message,
        l.assigned_to,
      ]
        .join(' ')
        .toLowerCase();
      const due = l.follow_up_at ? new Date(l.follow_up_at) : null;
      return (
        (!q || hay.includes(q)) &&
        (!st || String(l.status || 'New') === st) &&
        (!pri || String(l.priority || 'Normal') === pri) &&
        (!follow ||
          (follow === 'due' && due && due <= now) ||
          (follow === 'scheduled' && due && due > now) ||
          (follow === 'none' && !due))
      );
    });
  }
  function leadAge(v) {
    if (!v) return '';
    const h = Math.max(0, Math.floor((Date.now() - new Date(v).getTime()) / 36e5));
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }
  function renderKpis() {
    const now = new Date(),
      start = todayStart();
    const newCount = leads.filter((l) => String(l.status || 'New') === 'New').length;
    const due = leads.filter(
      (l) =>
        l.follow_up_at &&
        new Date(l.follow_up_at) <= now &&
        !['Completed', 'Closed'].includes(String(l.status)),
    ).length;
    const hot = leads.filter(
      (l) =>
        ['Hot', 'High'].includes(String(l.priority || 'Normal')) &&
        !['Completed', 'Closed'].includes(String(l.status)),
    ).length;
    const converted = leads.filter(
      (l) =>
        l.converted_project_id ||
        ['Approved', 'In Progress', 'Completed'].includes(String(l.status)),
    ).length;
    const wrap = $('[data-crm-kpis]');
    if (!wrap) return;
    wrap.innerHTML = [
      ['New Leads', newCount, 'Awaiting first response'],
      ['Follow-ups Due', due, 'Needs attention'],
      ['High Priority', hot, 'Hot and high priority'],
      ['Converted', converted, 'Customer or project created'],
    ]
      .map(
        ([a, b, c]) =>
          `<article class="crm-kpi"><span>${esc(a)}</span><b>${b}</b><small>${esc(c)}</small></article>`,
      )
      .join('');
  }
  function renderLeadList() {
    const list = filteredLeads(),
      wrap = $('[data-crm-lead-list]');
    if (!wrap) return;
    const count = $('[data-lead-result-count]');
    if (count) count.textContent = `${list.length} of ${leads.length} opportunities`;
    wrap.innerHTML = list.length
      ? list
          .map((l) => {
            const active = l.id === selectedId ? ' active' : '';
            const due =
              l.follow_up_at &&
              new Date(l.follow_up_at) <= new Date() &&
              !['Completed', 'Closed'].includes(String(l.status));
            return `<button type="button" class="crm-lead-card${active}" data-crm-open="${l.id}">
        <div class="crm-card-top"><span class="priority priority-${esc(String(l.priority || 'Normal').toLowerCase())}">${esc(l.priority || 'Normal')}</span><span>${esc(leadAge(l.created_at))}</span></div>
        <h4>${esc(l.full_name || l.name || 'Website Lead')}</h4>
        <p>${esc(l.service_type || l.service || 'General electrical')} · ${esc(l.city || 'Location not provided')}</p>
        <div class="crm-card-bottom"><span class="status-chip">${esc(l.status || 'New')}</span><span class="follow-chip${due ? ' overdue' : ''}">${l.follow_up_at ? (due ? 'Follow-up overdue' : fmtDate(l.follow_up_at)) : 'No follow-up'}</span></div>
      </button>`;
          })
          .join('')
      : '<div class="crm-empty-list"><b>No leads match these filters.</b><p>Clear filters or submit a test estimate from the public website.</p></div>';
  }
  function renderCustomers() {
    const wrap = $('[data-customer-cards]');
    if (!wrap) return;
    const q = ($('[data-customer-search]')?.value || '').toLowerCase();
    const list = customers.filter(
      (c) =>
        !q ||
        [c.full_name, c.company, c.phone, c.email, c.city].join(' ').toLowerCase().includes(q),
    );
    wrap.innerHTML = list.length
      ? list
          .map((c) => {
            const pc = projects.filter((p) => p.customer_id === c.id).length;
            return `<article class="v6-card customer-directory-card"><div><h4>${esc(c.full_name || 'Customer')}</h4><p>${esc(c.company || '')}</p></div><p class="small"><a href="tel:${esc(c.phone || '')}">${esc(c.phone || 'No phone')}</a><br><a href="mailto:${esc(c.email || '')}">${esc(c.email || 'No email')}</a><br>${esc(c.city || '')}</p><span class="badge">${pc} project${pc === 1 ? '' : 's'}</span></article>`;
          })
          .join('')
      : '<p class="small">No customers match this search.</p>';
  }
  function current() {
    return leads.find((l) => l.id === selectedId);
  }
  function renderDetail() {
    const wrap = $('[data-crm-detail]');
    if (!wrap) return;
    const l = current();
    if (!l) {
      wrap.innerHTML =
        '<div class="crm-empty"><div class="crm-empty-icon">⚡</div><h3>Select a lead</h3><p class="small">Choose an opportunity to manage its next action and conversion.</p></div>';
      return;
    }
    const leadNotes = notes.filter((n) => n.lead_id === l.id);
    const due =
      l.follow_up_at &&
      new Date(l.follow_up_at) <= new Date() &&
      !['Completed', 'Closed'].includes(String(l.status));
    wrap.innerHTML = `
      <div class="crm-detail-head"><div><div class="eyebrow">${esc(l.service_type || l.service || 'Website Inquiry')}</div><h3>${esc(l.full_name || l.name || 'Lead')}</h3><p class="small">Received ${fmtDate(l.created_at)} · ${esc(l.source || 'website')}</p></div><span class="priority priority-${esc(String(l.priority || 'Normal').toLowerCase())}">${esc(l.priority || 'Normal')}</span></div>
      <div class="crm-contact-actions"><a class="btn yellow" href="tel:${esc(l.phone || '')}">Call Customer</a><a class="btn blue" href="mailto:${esc(l.email || '')}">Send Email</a></div>
      <div class="crm-contact-grid"><div><span>Phone</span><b>${esc(l.phone || 'Not provided')}</b></div><div><span>Email</span><b>${esc(l.email || 'Not provided')}</b></div><div><span>City</span><b>${esc(l.city || 'Not provided')}</b></div><div><span>Last Contact</span><b>${l.last_contact_at ? fmtDate(l.last_contact_at) : 'Not recorded'}</b></div></div>
      <div class="crm-message"><span>Customer Request</span><p>${esc(l.message || 'No project description was provided.')}</p></div>
      <form class="crm-update-form" data-lead-update>
        <label>Status<select name="status">${statuses.map((x) => `<option ${x === String(l.status || 'New') ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label>Priority<select name="priority">${priorities.map((x) => `<option ${x === String(l.priority || 'Normal') ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label>Assigned To<input name="assigned_to" value="${esc(l.assigned_to || '')}" placeholder="Jonathan, office, estimator"></label>
        <label>Next Follow-up<input type="datetime-local" name="follow_up_at" value="${isoLocal(l.follow_up_at)}"></label>
        <div class="crm-form-actions"><button class="btn blue" type="submit">Save Lead Changes</button><button class="btn dark" type="button" data-mark-contacted>Mark Contacted Now</button></div>
      </form>
      <div class="crm-convert-box"><div><b>${l.converted_project_id ? 'Converted Opportunity' : 'Ready to move forward?'}</b><p>${l.converted_project_id ? 'This lead is already connected to a project.' : 'Create a customer and project using the information already captured.'}</p></div><button class="btn yellow" type="button" data-convert-lead ${l.converted_project_id ? 'disabled' : ''}>${l.converted_project_id ? 'Converted' : 'Convert to Customer + Project'}</button></div>
      <div class="crm-notes"><h4>Internal Notes</h4><form data-lead-note><textarea name="note" required placeholder="Document call outcome, site visit details, pricing discussion, or next action"></textarea><button class="btn yellow" type="submit">Add Note</button></form><div class="crm-note-list">${leadNotes.length ? leadNotes.map((n) => `<article><p>${esc(n.note)}</p><small>${fmtDate(n.created_at)}</small></article>`).join('') : '<p class="small">No internal notes yet.</p>'}</div></div>`;
  }
  function renderAll() {
    renderKpis();
    renderLeadList();
    renderCustomers();
    renderDetail();
  }
  async function updateLead(patch, message = 'Lead updated.') {
    if (!selectedId) return;
    patch.updated_at = new Date().toISOString();
    const { error } = await client.from('leads').update(patch).eq('id', selectedId);
    if (error) {
      console.error(error);
      flash(error.message, false);
      return false;
    }
    flash(message);
    await load();
    return true;
  }
  async function convertLead() {
    const l = current();
    if (!l || l.converted_project_id) return;
    flash('Converting lead…');
    let customer = customers.find(
      (c) => (l.email && c.email === l.email) || (l.phone && c.phone === l.phone),
    );
    if (!customer) {
      const row = {
        full_name: l.full_name || l.name || 'Website Customer',
        phone: l.phone || null,
        email: l.email || null,
        city: l.city || null,
        notes: `Converted from website lead. ${l.message || ''}`.trim(),
      };
      const { data, error } = await client.from('customers').insert(row).select().single();
      if (error) {
        console.error(error);
        flash('Customer conversion failed: ' + error.message, false);
        return;
      }
      customer = data;
    }
    const projectRow = {
      customer_id: customer.id,
      project_name: `${l.service_type || l.service || 'Electrical'} - ${l.full_name || l.name || 'Customer'}`,
      service_type: l.service_type || l.service || 'Electrical',
      status: 'Planning',
      city: l.city || null,
      notes: l.message || null,
    };
    const { data: project, error: projectError } = await client
      .from('projects')
      .insert(projectRow)
      .select()
      .single();
    if (projectError) {
      console.error(projectError);
      flash('Project conversion failed: ' + projectError.message, false);
      return;
    }
    const { error: updateError } = await client
      .from('leads')
      .update({
        status: 'Approved',
        converted_customer_id: customer.id,
        converted_project_id: project.id,
        last_contact_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', l.id);
    if (updateError) {
      console.error(updateError);
      flash('Project created, but lead link failed: ' + updateError.message, false);
      return;
    }
    await client.from('lead_notes').insert({
      lead_id: l.id,
      note: `Converted to customer and project: ${project.project_name}`,
      created_by: session?.user?.id || null,
    });
    flash('Lead converted successfully. Open Projects to continue planning.');
    await load();
  }
  document.addEventListener('click', async (e) => {
    const open = e.target.closest('[data-crm-open]');
    if (open) {
      selectedId = open.dataset.crmOpen;
      renderLeadList();
      renderDetail();
      return;
    }
    if (e.target.closest('[data-crm-refresh]')) {
      await load();
      return;
    }
    if (e.target.closest('[data-mark-contacted]')) {
      await updateLead(
        { status: 'Contacted', last_contact_at: new Date().toISOString() },
        'Contact recorded.',
      );
      return;
    }
    if (e.target.closest('[data-convert-lead]')) {
      if (confirm('Create a customer and planning project from this lead?')) await convertLead();
      return;
    }
    if (e.target.closest('[data-crm-new-customer]')) {
      document.querySelector('[data-tab="quickadd"]')?.click();
      document.querySelector('[data-new-customer] input[name="full_name"]')?.focus();
    }
  });
  document.addEventListener('submit', async (e) => {
    if (e.target.matches('[data-lead-update]')) {
      e.preventDefault();
      const fd = new FormData(e.target);
      await updateLead({
        status: fd.get('status'),
        priority: fd.get('priority'),
        assigned_to: String(fd.get('assigned_to') || '').trim() || null,
        follow_up_at: fd.get('follow_up_at')
          ? new Date(fd.get('follow_up_at')).toISOString()
          : null,
      });
    }
    if (e.target.matches('[data-lead-note]')) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const note = String(fd.get('note') || '').trim();
      if (!note) return;
      const { error } = await client
        .from('lead_notes')
        .insert({ lead_id: selectedId, note, created_by: session?.user?.id || null });
      if (error) {
        console.error(error);
        flash(error.message, false);
      } else {
        e.target.reset();
        flash('Note added.');
        await load();
      }
    }
  });
  [
    '[data-lead-search]',
    '[data-lead-status-filter]',
    '[data-lead-priority-filter]',
    '[data-lead-followup-filter]',
  ].forEach((sel) =>
    document.addEventListener('input', (e) => {
      if (e.target.matches(sel)) renderLeadList();
    }),
  );
  document.addEventListener('input', (e) => {
    if (e.target.matches('[data-customer-search]')) renderCustomers();
  });
  client.auth.onAuthStateChange((_event, newSession) => {
    session = newSession;
    if (newSession) setTimeout(load, 200);
  });
  setTimeout(load, 700);
})();
