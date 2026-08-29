(function () {
  if (!window.supabase || !document.querySelector('[data-admin-dashboard]')) return;
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
  async function read(table) {
    const r = await client
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (r.error) {
      console.warn(table, r.error);
      return [];
    }
    return r.data || [];
  }
  function rows(sel, data, map) {
    const el = $(sel);
    if (!el) return;
    el.innerHTML = data.length ? data.map(map).join('') : '<p class="small">No records yet.</p>';
  }
  async function loadFieldOps() {
    const [daily, jsa, veh, mat, comp] = await Promise.all([
      read('field_daily_reports'),
      read('safety_jsa_forms'),
      read('vehicle_inspections'),
      read('material_requests'),
      read('job_completion_checklists'),
    ]);
    rows(
      '[data-admin-daily-reports]',
      daily,
      (r) =>
        `<div class="mini-row"><b>${esc(r.work_date || 'Daily Report')}</b><span>${esc(r.work_performed || '')} ${r.issues ? '• Issues: ' + esc(r.issues) : ''}</span></div>`,
    );
    rows(
      '[data-admin-jsa-forms]',
      jsa,
      (r) =>
        `<div class="mini-row"><b>${esc(r.task || 'JSA')}</b><span>PPE: ${r.ppe_confirmed ? 'Yes' : 'No'} • LOTO: ${r.loto_required ? 'Yes' : 'No'} • ${esc(r.signature || '')}</span></div>`,
    );
    rows(
      '[data-admin-vehicle-inspections]',
      veh,
      (r) =>
        `<div class="mini-row"><b>${esc(r.vehicle || 'Vehicle')} • ${esc(r.mileage || '')} mi</b><span>Damage: ${r.damage_found ? 'Yes' : 'No'} • ${esc(r.notes || '')}</span></div>`,
    );
    rows(
      '[data-admin-material-requests]',
      mat,
      (r) =>
        `<div class="mini-row"><b>${esc(r.urgency || 'Normal')} • ${esc(r.status || 'Requested')}</b><span>${esc(r.items || '')} ${r.notes ? '• ' + esc(r.notes) : ''}</span></div>`,
    );
    rows(
      '[data-admin-completion-checklists]',
      comp,
      (r) =>
        `<div class="mini-row"><b>Completion Checklist</b><span>Complete: ${r.work_complete ? 'Yes' : 'No'} • Photos: ${r.photos_uploaded ? 'Yes' : 'No'} • Walkthrough: ${r.customer_walkthrough ? 'Yes' : 'No'}</span></div>`,
    );
  }
  document.addEventListener('click', (e) => {
    if (e.target?.matches('[data-refresh-fieldops]')) loadFieldOps();
    if (e.target?.closest('[data-tab="fieldops"]')) setTimeout(loadFieldOps, 150);
  });
  setTimeout(loadFieldOps, 1200);
})();
