(function () {
  const $ = (s) => document.querySelector(s);
  const money = (n) =>
    Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m],
    );
  const client = window.BLUE_BEAR_SUPABASE_CLIENT;
  async function count(table) {
    const { count } = await client.from(table).select('*', { count: 'exact', head: true });
    return count || 0;
  }
  function bars(el, rows) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    el.innerHTML = rows.length
      ? rows
          .map(
            (r) =>
              `<div class="bar-row"><b>${esc(r.label)}</b><div class="bar-track"><span style="width:${Math.max(6, (r.value / max) * 100)}%"></span></div><span>${r.value}</span></div>`,
          )
          .join('')
      : '<p class="small">No data yet.</p>';
  }
  async function renderReports() {
    if (!client || !$('[data-report-grid]')) return;
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session) return;
    const [customers, projects, gallery, items, invoices, schedule] = await Promise.all(
      ['customers', 'projects', 'gallery', 'estimate_items', 'invoices', 'schedule_events'].map(
        count,
      ),
    );
    const invoiceRows = await client.from('invoices').select('total,status,created_at').limit(500);
    const projectRows = await client.from('projects').select('status,service_type').limit(500);
    const revenue = (invoiceRows.data || []).reduce((s, r) => s + Number(r.total || 0), 0);
    $('[data-report-grid]').innerHTML = `
      <div class="report-card"><b>${projects}</b><span>Total Projects</span></div>
      <div class="report-card"><b>${customers}</b><span>Customers</span></div>
      <div class="report-card"><b>${money(revenue)}</b><span>Invoice Value</span></div>
      <div class="report-card"><b>${gallery}</b><span>Project Files</span></div>
      <div class="report-card"><b>${items}</b><span>Estimate Lines</span></div>
      <div class="report-card"><b>${schedule}</b><span>Schedule Events</span></div>`;
    const byStatus = {};
    (projectRows.data || []).forEach((p) => {
      const k = p.status || 'Planning';
      byStatus[k] = (byStatus[k] || 0) + 1;
    });
    bars(
      $('[data-status-chart]'),
      Object.entries(byStatus).map(([label, value]) => ({ label, value })),
    );
    const byService = {};
    (projectRows.data || []).forEach((p) => {
      const k = p.service_type || 'General';
      byService[k] = (byService[k] || 0) + 1;
    });
    bars(
      $('[data-service-chart]'),
      Object.entries(byService).map(([label, value]) => ({ label, value })),
    );
  }
  function draftFromDOM() {
    const title = $('[data-ws-title]')?.textContent?.trim() || 'Selected Project';
    const meta = $('[data-ws-meta]')?.textContent?.trim() || 'Service / City';
    const notes = $('[data-ws-notes]')?.textContent?.trim() || 'No notes entered yet.';
    const rows = [...document.querySelectorAll('[data-estimate-list] .line-table > div')]
      .map((r) => r.textContent.trim())
      .filter(Boolean);
    return `BLUE BEAR ELECTRIC\nCA License #1141313 | OSHA Certified | Bonded & Insured | Union Contractor\n\nAI-STYLE PROPOSAL DRAFT\n\nProject: ${title}\nProject Info: ${meta}\n\nScope Summary:\nBlue Bear Electric will provide professional electrical services for this project, including planning, troubleshooting, installation, maintenance, documentation, and closeout support as required by site conditions.\n\nCustomer / Site Notes:\n${notes}\n\nEstimate Items:\n${rows.length ? rows.map((x) => '- ' + x).join('\n') : '- Add estimate items in the Workspace tab to populate this section.'}\n\nSafety + Quality:\nWork will be performed with safe electrical work practices, appropriate PPE, site coordination, quality checks, and documentation. Licensing and certificates are available upon request.\n\nRecommended Next Steps:\n1. Confirm site scope and access requirements.\n2. Schedule site walk or installation date.\n3. Finalize material and labor estimate.\n4. Complete work and upload before/during/after photos.\n5. Issue closeout package, invoice, and warranty notes.`;
  }
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-generate-proposal]')) {
      const global = $('[data-ai-global-output]');
      if (global) global.value = draftFromDOM();
    }
  });
  document.addEventListener('DOMContentLoaded', () => setTimeout(renderReports, 700));
  window.addEventListener('focus', () => setTimeout(renderReports, 300));
})();
