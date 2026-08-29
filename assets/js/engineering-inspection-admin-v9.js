(function () {
  if (!window.supabase) return;
  const client = window.supabase.createClient(
    window.BLUE_BEAR_SUPABASE_URL,
    window.BLUE_BEAR_SUPABASE_KEY,
  );
  const form = document.querySelector('[data-inspection-case-form]'),
    list = document.querySelector('[data-inspection-case-list]');
  if (!form || !list) return;
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  async function load() {
    const { data, error } = await client
      .from('inspection_case_studies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      list.innerHTML =
        '<p class="small">Run the V9.0 SQL migration to enable case-study management.</p>';
      return;
    }
    list.innerHTML =
      (data || [])
        .map(
          (x) =>
            `<article class="inspection-admin-row"><div><b>${esc(x.title)}</b><p>${esc(x.summary)}</p><small>${esc(x.asset_category)} · ${esc(x.classification)} · ${x.is_published ? 'Published' : 'Draft'}</small></div><button class="btn dark mini-btn" data-toggle="${x.id}" data-state="${x.is_published}">${x.is_published ? 'Unpublish' : 'Publish'}</button><button class="btn danger mini-btn" data-delete="${x.id}">Delete</button></article>`,
        )
        .join('') || '<div class="vf88-empty">No managed inspection case studies yet.</div>';
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const row = {
      title: f.title.value.trim(),
      asset_category: f.asset_category.value,
      summary: f.summary.value.trim(),
      classification: f.classification.value,
      is_published: false,
    };
    const { error } = await client.from('inspection_case_studies').insert(row);
    if (error) {
      window.voltflowToast?.('Could not save case study', error.message);
      return;
    }
    f.reset();
    load();
    window.voltflowToast?.('Case study saved', 'Saved as a private draft.');
  });
  list.addEventListener('click', async (e) => {
    if (e.target.dataset.toggle) {
      await client
        .from('inspection_case_studies')
        .update({
          is_published: e.target.dataset.state !== 'true',
          updated_at: new Date().toISOString(),
        })
        .eq('id', e.target.dataset.toggle);
      load();
    }
    if (e.target.dataset.delete && confirm('Delete this case study?')) {
      await client.from('inspection_case_studies').delete().eq('id', e.target.dataset.delete);
      load();
    }
  });
  load();
})();
