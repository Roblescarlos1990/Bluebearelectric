(function () {
  if (!window.supabase) return;
  const client = window.supabase.createClient(
    window.BLUE_BEAR_SUPABASE_URL,
    window.BLUE_BEAR_SUPABASE_KEY,
  );
  const $ = (s) => document.querySelector(s),
    $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>\"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' })[c],
    );
  const money = (n) =>
    Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  const uid = () => client.auth.getUser().then((r) => r.data.user?.id || null);
  let S = {
    projects: [],
    customers: [],
    estimates: [],
    items: [],
    invoices: [],
    invoiceItems: [],
    payments: [],
    templates: [],
    templateItems: [],
    projectId: null,
    estimate: null,
    invoice: null,
  };
  const selectedProject = () => S.projects.find((p) => p.id === S.projectId) || null;
  const notify = (text, ok = true) => {
    const el = $('[data-admin-message]');
    if (el) {
      el.textContent = text;
      el.className = 'form-status ' + (ok ? 'success' : 'error');
    }
  };
  async function log(type, title, details = '', referenceTable = null, referenceId = null) {
    try {
      const p = selectedProject();
      await client.from('activity_log').insert({
        project_id: S.projectId || null,
        customer_id: p?.customer_id || null,
        activity_type: type,
        title,
        details,
        reference_table: referenceTable,
        reference_id: referenceId,
        created_by: await uid(),
      });
    } catch (e) {
      console.warn('Activity log skipped', e);
    }
  }
  function totals() {
    const rows = S.items || [];
    const subtotal = rows.reduce(
      (a, r) => a + Number(r.quantity || 0) * Number(r.unit_price || 0),
      0,
    );
    const cost = rows.reduce((a, r) => a + Number(r.quantity || 0) * Number(r.cost || 0), 0);
    const markup = (subtotal * Number(S.estimate?.markup_percent || 0)) / 100;
    const discount = Number(S.estimate?.discount_amount || 0);
    const taxable = Math.max(0, subtotal + markup - discount);
    const tax = (taxable * Number(S.estimate?.tax_percent || 0)) / 100;
    const total = Math.max(0, taxable + tax);
    const deposit = (total * Number(S.estimate?.deposit_percent || 0)) / 100;
    const margin = total ? ((total - cost) / total) * 100 : 0;
    return { subtotal, cost, markup, discount, tax, total, deposit, margin };
  }
  async function loadBase() {
    const [p, c, e, i, ii, pay, t, ti] = await Promise.all([
      client.from('projects').select('*').order('created_at', { ascending: false }),
      client.from('customers').select('*'),
      client.from('estimates').select('*').order('created_at', { ascending: false }),
      client.from('invoices').select('*').order('created_at', { ascending: false }),
      client.from('invoice_items').select('*'),
      client.from('payments').select('*').order('payment_date', { ascending: false }),
      client.from('estimate_templates').select('*').eq('active', true).order('name'),
      client.from('estimate_template_items').select('*').order('sort_order'),
    ]);
    S.projects = p.data || [];
    S.customers = c.data || [];
    S.estimates = e.data || [];
    S.invoices = i.data || [];
    S.invoiceItems = ii.data || [];
    S.payments = pay.data || [];
    S.templates = t.data || [];
    S.templateItems = ti.data || [];
    [p, c, e, i, ii, pay, t, ti].forEach((r) => r.error && console.warn(r.error));
    renderBillingDashboard();
    renderTemplateOptions();
  }
  async function loadProject() {
    S.projectId = $('[data-workspace-project]')?.value || S.projectId;
    if (!S.projectId) return;
    let e = await client
      .from('estimates')
      .select('*')
      .eq('project_id', S.projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    S.estimate = e.data || null;
    if (S.estimate) {
      const it = await client
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', S.estimate.id)
        .order('sort_order');
      S.items = it.data || [];
    } else {
      const legacy = await client
        .from('estimate_items')
        .select('*')
        .eq('project_id', S.projectId)
        .is('estimate_id', null)
        .order('created_at');
      S.items = legacy.data || [];
    }
    const inv = await client
      .from('invoices')
      .select('*')
      .eq('project_id', S.projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    S.invoice = inv.data || null;
    renderEstimate();
    renderInvoice();
  }
  function renderTemplateOptions() {
    const sel = $('[data-v86-template-select]');
    if (sel)
      sel.innerHTML =
        '<option value="">Start blank</option>' +
        S.templates.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
    const grid = $('[data-v86-template-grid]');
    if (grid)
      grid.innerHTML =
        S.templates
          .map(
            (t) =>
              `<article class="template-card" data-v86-template-card="${t.id}"><span class="status-chip">${esc(t.category || 'Template')}</span><h4>${esc(t.name)}</h4><p class="small">${esc(t.description || 'Reusable estimate starting point')}</p><b>${(S.templateItems || []).filter((i) => i.template_id === t.id).length} preset items</b></article>`,
          )
          .join('') || '<p class="small">Run the V8.6 SQL migration to load templates.</p>';
  }
  function renderBillingDashboard() {
    const est = S.estimates,
      inv = S.invoices,
      pay = S.payments;
    const outstanding = inv.reduce(
      (a, x) => a + Math.max(0, Number(x.total || 0) - Number(x.amount_paid || 0)),
      0,
    );
    const forecast = est
      .filter((x) => !['Declined', 'Expired'].includes(x.status))
      .reduce((a, x) => a + Number(x.total || 0), 0);
    const accepted = est.filter((x) => x.status === 'Accepted').length;
    const sent = est.filter((x) => ['Sent', 'Accepted', 'Declined'].includes(x.status)).length;
    const win = sent ? (accepted / sent) * 100 : 0;
    const collected = pay.reduce((a, x) => a + Number(x.amount || 0), 0);
    const k = $('[data-v86-billing-kpis]');
    if (k)
      k.innerHTML = [
        ['Revenue Forecast', money(forecast)],
        ['Outstanding', money(outstanding)],
        ['Collected', money(collected)],
        ['Accepted Estimates', accepted],
        ['Win Rate', win.toFixed(0) + '%'],
      ]
        .map(
          ([l, v]) =>
            `<div class="billing-kpi"><div class="amount">${v}</div><small>${l}</small></div>`,
        )
        .join('');
    renderPipelines();
  }
  function renderPipelines() {
    const filter = $('[data-v86-estimate-filter]')?.value || '';
    const ep = $('[data-v86-estimate-pipeline]');
    if (ep) {
      const rows = S.estimates.filter((x) => !filter || x.status === filter);
      ep.innerHTML =
        rows
          .map((x) => {
            const p = S.projects.find((p) => p.id === x.project_id);
            return `<div class="billing-row"><div><div class="title">${esc(x.estimate_number || 'Draft Estimate')}</div><small>${esc(p?.project_name || 'Project')}</small></div><span class="status-chip ${String(x.status || '').toLowerCase()}">${esc(x.status || 'Draft')}</span><b>${money(x.total)}</b><button class="btn dark" data-v86-open-estimate="${x.project_id}">Open</button></div>`;
          })
          .join('') || '<p class="small">No estimates match this view.</p>';
    }
    const ip = $('[data-v86-invoice-pipeline]');
    if (ip)
      ip.innerHTML =
        S.invoices
          .slice(0, 12)
          .map((x) => {
            const bal = Math.max(0, Number(x.total || 0) - Number(x.amount_paid || 0));
            return `<div class="billing-row"><div><div class="title">${esc(x.invoice_number || 'Invoice')}</div><small>Due ${esc(x.due_date || 'Not set')}</small></div><span class="status-chip ${String(
              x.status || '',
            )
              .toLowerCase()
              .replaceAll(
                ' ',
                '-',
              )}">${esc(x.status || 'Draft')}</span><b>${money(bal)}</b><span></span></div>`;
          })
          .join('') || '<p class="small">No invoices yet.</p>';
    const pp = $('[data-v86-payment-list]');
    if (pp)
      pp.innerHTML =
        S.payments
          .slice(0, 10)
          .map(
            (x) =>
              `<div class="billing-row"><div><div class="title">${money(x.amount)}</div><small>${esc(x.method || 'Payment')}</small></div><span>${esc(x.payment_date || '')}</span><span>${esc(x.reference || '')}</span><span></span></div>`,
          )
          .join('') || '<p class="small">No payments recorded.</p>';
  }
  function fillHeader() {
    const f = $('[data-v86-estimate-header]');
    if (!f) return;
    const e = S.estimate || {};
    [
      'estimate_number',
      'status',
      'valid_until',
      'markup_percent',
      'tax_percent',
      'discount_amount',
      'deposit_percent',
      'scope_of_work',
      'exclusions',
      'warranty_text',
      'terms_text',
    ].forEach((n) => {
      if (f.elements[n])
        f.elements[n].value =
          n === 'valid_until' ? isoDate(e[n]) : (e[n] ?? (n === 'status' ? 'Draft' : ''));
    });
    const b = $('[data-v86-estimate-status-badge]');
    if (b) b.textContent = e.status || 'Draft';
  }
  function renderEstimate() {
    fillHeader();
    const list = $('[data-v86-estimate-list]');
    if (list)
      list.innerHTML = S.items.length
        ? `<div class="estimate-table"><div class="estimate-table-head"><span>Category</span><span>Description</span><span>Qty</span><span>Unit</span><span>Sell</span><span>Cost</span><span>Total</span><span></span></div>${S.items.map((r) => `<div class="estimate-table-row"><span>${esc(r.category || 'Item')}</span><span>${esc(r.description)}</span><span>${Number(r.quantity || 0)}</span><span>${esc(r.unit || 'ea')}</span><span>${money(r.unit_price)}</span><span>${money(r.cost)}</span><b>${money(Number(r.quantity || 0) * Number(r.unit_price || 0))}</b><button class="icon-btn" title="Delete line item" data-v86-delete-item="${r.id}">×</button></div>`).join('')}</div>`
        : '<p class="small">No line items yet. Add an item or apply a template.</p>';
    const t = totals();
    const sum = $('[data-v86-estimate-summary]');
    if (sum)
      sum.innerHTML = `<div class="margin-panel"><h4>Internal Cost & Margin</h4><div class="summary-line"><span>Estimated cost</span><b>${money(t.cost)}</b></div><div class="summary-line"><span>Gross profit</span><b>${money(t.total - t.cost)}</b></div><div class="summary-line"><span>Estimated margin</span><b class="${t.margin >= 25 ? 'margin-positive' : 'margin-warning'}">${t.margin.toFixed(1)}%</b></div><p class="small">Internal costs are not included in customer exports.</p></div><div class="total-panel"><div class="summary-line"><span>Subtotal</span><b>${money(t.subtotal)}</b></div><div class="summary-line"><span>Markup</span><b>${money(t.markup)}</b></div><div class="summary-line"><span>Discount</span><b>-${money(t.discount)}</b></div><div class="summary-line"><span>Tax</span><b>${money(t.tax)}</b></div><div class="summary-line grand"><span>Total</span><b>${money(t.total)}</b></div><div class="summary-line"><span>Suggested deposit</span><b>${money(t.deposit)}</b></div></div>`;
  }
  function renderInvoice() {
    const wrap = $('[data-v86-invoice-detail]');
    const f = $('[data-v86-invoice-settings]');
    if (f) {
      const i = S.invoice || {};
      ['invoice_number', 'due_date', 'status', 'customer_po', 'notes'].forEach((n) => {
        if (f.elements[n])
          f.elements[n].value =
            n === 'due_date' ? isoDate(i[n]) : (i[n] ?? (n === 'status' ? 'Draft' : ''));
      });
    }
    if (wrap) {
      if (!S.invoice) {
        wrap.innerHTML =
          '<p class="small">No invoice exists for this project. Save an estimate, then create an invoice.</p>';
      } else {
        const paid = Number(S.invoice.amount_paid || 0),
          total = Number(S.invoice.total || 0),
          bal = Math.max(0, total - paid);
        wrap.innerHTML = `<article class="invoice-card"><div class="invoice-card-head"><div><span class="status-chip ${String(
          S.invoice.status || '',
        )
          .toLowerCase()
          .replaceAll(
            ' ',
            '-',
          )}">${esc(S.invoice.status || 'Draft')}</span><h4>${esc(S.invoice.invoice_number || 'Invoice')}</h4><p class="small">Due ${esc(S.invoice.due_date || 'Not set')} ${S.invoice.customer_po ? '• PO ' + esc(S.invoice.customer_po) : ''}</p></div><div><small>Balance Due</small><div class="invoice-balance">${money(bal)}</div></div></div><div class="summary-line"><span>Invoice total</span><b>${money(total)}</b></div><div class="summary-line"><span>Payments received</span><b>${money(paid)}</b></div></article>`;
      }
    }
    const ph = $('[data-v86-project-payments]');
    if (ph) {
      const rows = S.payments.filter((p) => p.project_id === S.projectId);
      ph.innerHTML =
        rows
          .map(
            (p) =>
              `<div class="payment-row"><b>${money(p.amount)}</b><span>${esc(p.payment_date)}</span><span>${esc(p.method)}</span><span>${esc(p.reference || p.notes || '')}</span></div>`,
          )
          .join('') || '<p class="small">No payments recorded for this project.</p>';
    }
  }
  async function ensureEstimate(formData = null) {
    if (S.estimate) return S.estimate;
    const p = selectedProject();
    const row = {
      project_id: S.projectId,
      customer_id: p?.customer_id || null,
      estimate_number: `VF-EST-${Date.now().toString().slice(-6)}`,
      status: 'Draft',
      subtotal: 0,
      tax: 0,
      total: 0,
    };
    const r = await client.from('estimates').insert(row).select().single();
    if (r.error) throw r.error;
    S.estimate = r.data;
    await log('estimate', 'Estimate created', r.data.estimate_number, 'estimates', r.data.id);
    return r.data;
  }
  async function saveEstimate(fd) {
    const e = await ensureEstimate();
    const t = totals();
    const row = {
      estimate_number: String(fd.get('estimate_number') || e.estimate_number).trim(),
      status: String(fd.get('status') || 'Draft'),
      valid_until: fd.get('valid_until') || null,
      scope_of_work: String(fd.get('scope_of_work') || ''),
      exclusions: String(fd.get('exclusions') || ''),
      warranty_text: String(fd.get('warranty_text') || ''),
      terms_text: String(fd.get('terms_text') || ''),
      markup_percent: Number(fd.get('markup_percent') || 0),
      tax_percent: Number(fd.get('tax_percent') || 0),
      discount_amount: Number(fd.get('discount_amount') || 0),
      deposit_percent: Number(fd.get('deposit_percent') || 0),
      subtotal: t.subtotal,
      cost_total: t.cost,
      markup_amount: t.markup,
      tax_amount: t.tax,
      total: t.total,
      updated_at: new Date().toISOString(),
    };
    const r = await client.from('estimates').update(row).eq('id', e.id).select().single();
    if (r.error) throw r.error;
    S.estimate = r.data;
    await log(
      'estimate',
      'Estimate updated',
      `${r.data.estimate_number} • ${money(r.data.total)}`,
      'estimates',
      r.data.id,
    );
  }
  async function applyTemplate(id) {
    if (!id) return;
    const t = S.templates.find((x) => x.id === id);
    if (!t) return;
    const e = await ensureEstimate();
    const items = S.templateItems.filter((x) => x.template_id === id);
    const existing = await client.from('estimate_items').delete().eq('estimate_id', e.id);
    if (existing.error) throw existing.error;
    if (items.length) {
      const rows = items.map((x) => ({
        project_id: S.projectId,
        estimate_id: e.id,
        category: x.category,
        description: x.description,
        quantity: x.quantity,
        unit: x.unit,
        unit_price: x.unit_price,
        cost: x.cost,
        sort_order: x.sort_order,
      }));
      const r = await client.from('estimate_items').insert(rows);
      if (r.error) throw r.error;
    }
    const u = await client
      .from('estimates')
      .update({
        scope_of_work: t.scope_of_work,
        exclusions: t.exclusions,
        warranty_text: t.warranty_text,
        terms_text: t.terms_text,
        markup_percent: t.default_markup_percent,
        tax_percent: t.default_tax_percent,
        deposit_percent: t.default_deposit_percent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', e.id);
    if (u.error) throw u.error;
    await log('estimate', 'Template applied', t.name, 'estimate_templates', t.id);
    notify(`Template applied: ${t.name}`);
    await loadProject();
  }
  async function createInvoice() {
    const e = await ensureEstimate();
    await saveEstimate(new FormData($('[data-v86-estimate-header]')));
    const p = selectedProject();
    const t = totals();
    const row = {
      project_id: S.projectId,
      estimate_id: e.id,
      customer_id: p?.customer_id || null,
      invoice_number: `VF-INV-${Date.now().toString().slice(-6)}`,
      status: 'Draft',
      subtotal: t.subtotal,
      tax: t.tax,
      total: t.total,
      amount_paid: 0,
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    };
    const r = await client.from('invoices').insert(row).select().single();
    if (r.error) throw r.error;
    S.invoice = r.data;
    if (S.items.length) {
      const rows = S.items.map((x) => ({
        invoice_id: r.data.id,
        category: x.category,
        description: x.description,
        quantity: x.quantity,
        unit: x.unit,
        unit_price: x.unit_price,
        sort_order: x.sort_order || 0,
      }));
      const ii = await client.from('invoice_items').insert(rows);
      if (ii.error) throw ii.error;
    }
    await log(
      'invoice',
      'Invoice created',
      `${r.data.invoice_number} • ${money(r.data.total)}`,
      'invoices',
      r.data.id,
    );
    notify('Invoice created from estimate.');
    await loadBase();
    await loadProject();
  }
  function printEstimate() {
    if (!S.estimate) {
      notify('Save an estimate before exporting.', false);
      return;
    }
    const p = selectedProject() || {},
      c = S.customers.find((x) => x.id === p.customer_id) || {},
      t = totals();
    const rows = S.items
      .map(
        (x) =>
          `<tr><td>${esc(x.category || '')}</td><td>${esc(x.description)}</td><td>${x.quantity} ${esc(x.unit || '')}</td><td>${money(x.unit_price)}</td><td>${money(Number(x.quantity) * Number(x.unit_price))}</td></tr>`,
      )
      .join('');
    printWindow(
      'Estimate ' + S.estimate.estimate_number,
      `<div class="doc-head"><div><h1>BLUE BEAR ELECTRIC</h1><p>CA License #1141313 • 760-234-8306</p></div><div><h2>ESTIMATE</h2><b>${esc(S.estimate.estimate_number)}</b></div></div><div class="meta"><div><b>Prepared For</b><br>${esc(c.full_name || 'Customer')}<br>${esc(c.company || '')}<br>${esc(c.phone || '')}<br>${esc(c.email || '')}</div><div><b>Project</b><br>${esc(p.project_name || '')}<br>${esc(p.address || '')} ${esc(p.city || '')}<br>Valid until: ${esc(S.estimate.valid_until || '')}</div></div><h3>Scope of Work</h3><p>${esc(S.estimate.scope_of_work || p.notes || '').replaceAll('\n', '<br>')}</p><table><thead><tr><th>Category</th><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="doc-totals"><p>Subtotal <b>${money(t.subtotal)}</b></p><p>Markup <b>${money(t.markup)}</b></p><p>Discount <b>-${money(t.discount)}</b></p><p>Tax <b>${money(t.tax)}</b></p><h2>Total <b>${money(t.total)}</b></h2><p>Requested deposit <b>${money(t.deposit)}</b></p></div><h3>Exclusions</h3><p>${esc(S.estimate.exclusions || '').replaceAll('\n', '<br>')}</p><h3>Warranty</h3><p>${esc(S.estimate.warranty_text || '').replaceAll('\n', '<br>')}</p><h3>Terms</h3><p>${esc(S.estimate.terms_text || '').replaceAll('\n', '<br>')}</p><div class="sign"><span>Customer Acceptance / Date</span><span>Blue Bear Electric / Date</span></div>`,
    );
  }
  function printInvoice() {
    if (!S.invoice) {
      notify('Create an invoice before exporting.', false);
      return;
    }
    const p = selectedProject() || {},
      c = S.customers.find((x) => x.id === p.customer_id) || {};
    const paid = Number(S.invoice.amount_paid || 0),
      bal = Math.max(0, Number(S.invoice.total || 0) - paid);
    const rows =
      (S.invoiceItems || [])
        .filter((x) => x.invoice_id === S.invoice.id)
        .map(
          (x) =>
            `<tr><td>${esc(x.category || '')}</td><td>${esc(x.description)}</td><td>${x.quantity} ${esc(x.unit || '')}</td><td>${money(x.unit_price)}</td><td>${money(x.total)}</td></tr>`,
        )
        .join('') ||
      S.items
        .map(
          (x) =>
            `<tr><td>${esc(x.category || '')}</td><td>${esc(x.description)}</td><td>${x.quantity} ${esc(x.unit || '')}</td><td>${money(x.unit_price)}</td><td>${money(Number(x.quantity) * Number(x.unit_price))}</td></tr>`,
        )
        .join('');
    printWindow(
      'Invoice ' + S.invoice.invoice_number,
      `<div class="doc-head"><div><h1>BLUE BEAR ELECTRIC</h1><p>CA License #1141313 • 760-234-8306</p></div><div><h2>INVOICE</h2><b>${esc(S.invoice.invoice_number)}</b></div></div><div class="meta"><div><b>Bill To</b><br>${esc(c.full_name || 'Customer')}<br>${esc(c.company || '')}<br>${esc(c.phone || '')}<br>${esc(c.email || '')}</div><div><b>Project</b><br>${esc(p.project_name || '')}<br>Due: ${esc(S.invoice.due_date || '')}<br>PO: ${esc(S.invoice.customer_po || '')}</div></div><table><thead><tr><th>Category</th><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="doc-totals"><p>Invoice total <b>${money(S.invoice.total)}</b></p><p>Payments received <b>${money(paid)}</b></p><h2>Balance Due <b>${money(bal)}</b></h2></div><p>${esc(S.invoice.notes || '').replaceAll('\n', '<br>')}</p>`,
    );
  }
  function printWindow(title, body) {
    const w = window.BlueBearDocuments?.open(title, body, { status: 'CUSTOMER COPY' });
    if (w) setTimeout(() => w.print(), 250);
  }
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-workspace-project]')) setTimeout(loadProject, 250);
    if (e.target.matches('[data-v86-estimate-filter]')) renderPipelines();
  });
  document.addEventListener('click', async (e) => {
    try {
      const open = e.target.closest('[data-v86-open-estimate]');
      if (open) {
        document.querySelector('[data-tab="workspace"]')?.click();
        const sel = $('[data-workspace-project]');
        if (sel) {
          sel.value = open.dataset.v86OpenEstimate;
          sel.dispatchEvent(new Event('change'));
        }
        setTimeout(() => document.querySelector('[data-ws-tab="estimate"]')?.click(), 300);
      }
      const tc = e.target.closest('[data-v86-template-card]');
      if (tc) await applyTemplate(tc.dataset.v86TemplateCard);
      if (e.target.matches('[data-v86-apply-template]'))
        await applyTemplate($('[data-v86-template-select]')?.value);
      if (e.target.matches('[data-v86-create-invoice]')) await createInvoice();
      if (e.target.matches('[data-v86-print-estimate]')) printEstimate();
      if (e.target.matches('[data-v86-print-invoice]')) printInvoice();
      if (e.target.matches('[data-v86-mark-sent]')) {
        const est = await ensureEstimate();
        const r = await client
          .from('estimates')
          .update({
            status: 'Sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', est.id);
        if (r.error) throw r.error;
        notify('Estimate marked as sent.');
        await log('estimate', 'Estimate sent', est.estimate_number, 'estimates', est.id);
        await loadBase();
        await loadProject();
      }
      const del = e.target.closest('[data-v86-delete-item]');
      if (del) {
        if (confirm('Delete this estimate line item?')) {
          const r = await client
            .from('estimate_items')
            .delete()
            .eq('id', del.dataset.v86DeleteItem);
          if (r.error) throw r.error;
          notify('Line item removed.');
          await loadProject();
        }
      }
      if (e.target.matches('[data-v86-refresh]')) {
        await loadBase();
        if (S.projectId) await loadProject();
      }
      if (e.target.matches('[data-v86-open-project]'))
        document.querySelector('[data-tab="workspace"]')?.click();
    } catch (err) {
      console.error(err);
      notify(err.message || 'Action could not be completed.', false);
    }
  });
  $('[data-v86-estimate-header]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await saveEstimate(new FormData(e.currentTarget));
      notify('Estimate saved.');
      await loadBase();
      await loadProject();
    } catch (err) {
      console.error(err);
      notify(
        'Could not save estimate. Run the V8.6 SQL migration and confirm admin permissions.',
        false,
      );
    }
  });
  $('[data-v86-estimate-item]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      if (!S.projectId) throw new Error('Select a project first.');
      const est = await ensureEstimate();
      const fd = new FormData(e.currentTarget);
      const row = {
        project_id: S.projectId,
        estimate_id: est.id,
        category: String(fd.get('category') || 'Material'),
        description: String(fd.get('description') || '').trim(),
        quantity: Number(fd.get('quantity') || 1),
        unit: String(fd.get('unit') || 'ea').trim(),
        unit_price: Number(fd.get('unit_price') || 0),
        cost: Number(fd.get('cost') || 0),
        sort_order: S.items.length * 10,
      };
      const r = await client.from('estimate_items').insert(row);
      if (r.error) throw r.error;
      e.currentTarget.reset();
      notify('Estimate line item added.');
      await loadProject();
    } catch (err) {
      console.error(err);
      notify(err.message || 'Could not add line item.', false);
    }
  });
  $('[data-v86-invoice-settings]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      if (!S.invoice) throw new Error('Create an invoice first.');
      const fd = new FormData(e.currentTarget);
      const row = {
        invoice_number: String(fd.get('invoice_number') || S.invoice.invoice_number),
        due_date: fd.get('due_date') || null,
        status: String(fd.get('status') || 'Draft'),
        customer_po: String(fd.get('customer_po') || ''),
        notes: String(fd.get('notes') || ''),
        updated_at: new Date().toISOString(),
        sent_at:
          fd.get('status') === 'Sent'
            ? S.invoice.sent_at || new Date().toISOString()
            : S.invoice.sent_at,
      };
      const r = await client.from('invoices').update(row).eq('id', S.invoice.id).select().single();
      if (r.error) throw r.error;
      S.invoice = r.data;
      notify('Invoice updated.');
      await log('invoice', 'Invoice updated', r.data.invoice_number, 'invoices', r.data.id);
      await loadBase();
      renderInvoice();
    } catch (err) {
      console.error(err);
      notify(err.message || 'Could not update invoice.', false);
    }
  });
  $('[data-v86-payment-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      if (!S.invoice) throw new Error('Create an invoice first.');
      const fd = new FormData(e.currentTarget),
        amount = Number(fd.get('amount') || 0);
      if (amount <= 0) throw new Error('Enter a valid payment amount.');
      const row = {
        invoice_id: S.invoice.id,
        project_id: S.projectId,
        amount,
        payment_date: fd.get('payment_date') || new Date().toISOString().slice(0, 10),
        method: String(fd.get('method') || 'Check'),
        reference: String(fd.get('reference') || ''),
        notes: String(fd.get('notes') || ''),
        created_by: await uid(),
      };
      const p = await client.from('payments').insert(row).select().single();
      if (p.error) throw p.error;
      const newPaid = Number(S.invoice.amount_paid || 0) + amount,
        newStatus = newPaid >= Number(S.invoice.total || 0) ? 'Paid' : 'Partially Paid';
      const u = await client
        .from('invoices')
        .update({
          amount_paid: newPaid,
          status: newStatus,
          paid_at: newStatus === 'Paid' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', S.invoice.id);
      if (u.error) throw u.error;
      e.currentTarget.reset();
      notify('Payment recorded.');
      await log(
        'payment',
        'Payment recorded',
        `${money(amount)} • ${row.method}`,
        'payments',
        p.data.id,
      );
      await loadBase();
      await loadProject();
    } catch (err) {
      console.error(err);
      notify(err.message || 'Could not record payment.', false);
    }
  });
  client.auth.getSession().then(({ data }) => {
    if (data.session)
      setTimeout(async () => {
        await loadBase();
        const sel = $('[data-workspace-project]');
        if (sel?.value) {
          S.projectId = sel.value;
          await loadProject();
        }
      }, 700);
  });
})();
