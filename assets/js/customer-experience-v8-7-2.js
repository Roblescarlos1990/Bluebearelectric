(function () {
  if (!window.supabase) return;
  const client = window.supabase.createClient(
    window.BLUE_BEAR_SUPABASE_URL,
    window.BLUE_BEAR_SUPABASE_KEY,
  );
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>\"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' })[c],
    );
  let channel = null;
  async function enhance(projectId) {
    const host = document.querySelector('[data-customer-project-detail]');
    if (!host || !projectId) return;
    const [ms, sch] = await Promise.all([
      client
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order', { ascending: true }),
      client
        .from('schedule_events')
        .select('*')
        .eq('project_id', projectId)
        .order('start_time', { ascending: true }),
    ]);
    const milestones = ms.data || [],
      done = milestones.filter((x) =>
        ['done', 'completed'].includes(String(x.status).toLowerCase()),
      ).length,
      progress = milestones.length ? Math.round((done / milestones.length) * 100) : 0;
    const upcoming = (sch.data || [])
      .filter((x) => !x.start_time || new Date(x.start_time) >= new Date())
      .slice(0, 3);
    const block = document.createElement('section');
    block.className = 'customer-experience-v872';
    block.innerHTML = `<div class="customer-progress-v872"><div><span>Project progress</span><strong>${progress}%</strong></div><div class="customer-progress-track-v872"><i style="width:${progress}%"></i></div></div><div class="customer-experience-grid-v872"><div><h3>Project Timeline</h3>${milestones.map((m) => `<div class="customer-milestone-v872 ${String(m.status).toLowerCase()}"><i></i><div><b>${esc(m.label || m.title || 'Milestone')}</b><small>${esc(m.status || 'Pending')}</small></div></div>`).join('') || '<p class="small">Timeline updates will appear here.</p>'}</div><div><h3>Upcoming Visits</h3>${upcoming.map((e) => `<div class="mini-row"><b>${esc(e.title || 'Scheduled visit')}</b><span>${e.start_time ? new Date(e.start_time).toLocaleString() : 'Date pending'} • ${esc(e.location || '')}</span></div>`).join('') || '<p class="small">No upcoming visits are currently scheduled.</p>'}</div></div>`;
    host.prepend(block);
    if (channel) client.removeChannel(channel);
    channel = client
      .channel(`customer-gallery-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gallery', filter: `project_id=eq.${projectId}` },
        () => location.reload(),
      )
      .subscribe();
  }
  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-customer-project]');
    if (card) setTimeout(() => enhance(card.dataset.customerProject), 250);
  });
})();
