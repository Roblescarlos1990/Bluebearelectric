(function () {
  if (!window.supabase) return;
  const client = window.supabase.createClient(
    window.BLUE_BEAR_SUPABASE_URL,
    window.BLUE_BEAR_SUPABASE_KEY,
  );
  const $ = (s) => document.querySelector(s);
  const editor = $('[data-document-editor]'),
    title = $('[data-doc-title]'),
    projectSel = $('[data-doc-project]'),
    versions = $('[data-document-versions]'),
    state = $('[data-doc-save-state]');
  if (!editor) return;
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  async function loadProjects() {
    const { data } = await client
      .from('projects')
      .select('id,project_name,city')
      .order('created_at', { ascending: false });
    projectSel.innerHTML =
      '<option value="">No project selected</option>' +
      (data || [])
        .map(
          (p) =>
            `<option value="${p.id}">${esc(p.project_name)}${p.city ? ' — ' + esc(p.city) : ''}</option>`,
        )
        .join('');
  }
  async function loadVersions() {
    if (!projectSel.value) {
      versions.innerHTML = '<p class="small">Select a project to view versions.</p>';
      return;
    }
    const { data, error } = await client
      .from('document_versions')
      .select('*')
      .eq('project_id', projectSel.value)
      .order('version_number', { ascending: false });
    if (error) {
      versions.innerHTML =
        '<p class="small">Run the V8.8.1 SQL migration to enable version history.</p>';
      return;
    }
    versions.innerHTML =
      (data || [])
        .map(
          (v) =>
            `<div class="doc-version"><b>Version ${v.version_number}</b><div class="small">${new Date(v.created_at).toLocaleString()}</div><button class="btn dark" type="button" data-restore-doc="${v.id}">Restore</button></div>`,
        )
        .join('') || '<p class="small">No versions saved.</p>';
  }
  $('[data-doc-load-preview]')?.addEventListener('click', () => {
    const preview = $('[data-doc-preview]');
    editor.innerHTML = preview?.innerHTML || '<h1>New Document</h1><p>Begin editing here.</p>';
    if (!title.value) title.value = 'Project Document';
    state.textContent = 'Loaded for editing';
  });
  $('[data-doc-save-version]')?.addEventListener('click', async () => {
    if (!projectSel.value) {
      voltflowToast('Project required', 'Select a project before saving a version.');
      return;
    }
    if (!editor.innerText.trim()) {
      voltflowToast('Document is empty', 'Load or enter document content first.');
      return;
    }
    state.textContent = 'Saving...';
    const { data: last } = await client
      .from('document_versions')
      .select('version_number')
      .eq('project_id', projectSel.value)
      .order('version_number', { ascending: false })
      .limit(1);
    const row = {
      project_id: projectSel.value,
      title: title.value.trim() || 'Project Document',
      document_type: 'Editable',
      content_html: editor.innerHTML,
      version_number: Number(last?.[0]?.version_number || 0) + 1,
    };
    const { error } = await client.from('document_versions').insert(row);
    if (error) {
      console.error(error);
      state.textContent = 'Save failed';
      voltflowToast('Could not save document', error.message);
      return;
    }
    state.textContent = `Version ${row.version_number} saved`;
    voltflowToast('Document version saved', `${row.title} — version ${row.version_number}`);
    loadVersions();
  });
  $('[data-doc-export-editable]')?.addEventListener('click', () => {
    if (!editor.innerText.trim()) return;
    const w = window.BlueBearDocuments?.open(title.value || 'Document', editor.innerHTML, {
      status: 'CUSTOMER COPY',
    });
    if (w) setTimeout(() => w.print(), 250);
  });
  projectSel?.addEventListener('change', loadVersions);
  versions?.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-restore-doc]');
    if (!b) return;
    const { data, error } = await client
      .from('document_versions')
      .select('*')
      .eq('id', b.dataset.restoreDoc)
      .single();
    if (error || !data) return;
    editor.innerHTML = data.content_html || '';
    title.value = data.title || '';
    state.textContent = `Restored version ${data.version_number}`;
    voltflowToast('Version restored', 'Review and save a new version to preserve changes.');
  });
  client.auth.getSession().then(({ data }) => {
    if (data.session) loadProjects();
  });
})();
