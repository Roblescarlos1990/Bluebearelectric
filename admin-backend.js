(function(){
  if(!window.supabase) return;
  const client = window.supabase.createClient(window.BLUE_BEAR_SUPABASE_URL, window.BLUE_BEAR_SUPABASE_KEY);
  const $ = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));
  const loginBox = $('[data-admin-login]');
  const dashboard = $('[data-admin-dashboard]');
  const loginForm = $('[data-login-form]');
  const loginStatus = $('[data-login-status]');
  const logoutBtn = $('[data-logout]');
  const stats = $('[data-admin-stats]');
  const msg = $('[data-admin-message]');
  const esc = (v)=>String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = (n)=>Number(n||0).toLocaleString(undefined,{style:'currency',currency:'USD'});
  const notify = (text, ok=true)=>{ if(msg){ msg.textContent=text; msg.className=ok?'form-status ok':'form-status error'; setTimeout(()=>{ if(msg.textContent===text) msg.textContent=''; },5000); } };
  let projects = [];
  let selectedProjectId = '';
  let selectedProject = null;

  function showLogin(text=''){ loginBox.style.display='block'; dashboard.style.display='none'; if(loginStatus) loginStatus.textContent=text; }
  function showDash(){ loginBox.style.display='none'; dashboard.style.display='block'; loadAll(); }
  async function count(table){ const { count } = await client.from(table).select('*', { count:'exact', head:true }); return count || 0; }

  function switchMainTab(name){
    $$('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
    $$('.tab-page').forEach(p=>p.classList.toggle('active', p.dataset.tabPage===name));
  }
  function switchWsTab(name){
    $$('.ws-tab').forEach(b=>b.classList.toggle('active', b.dataset.wsTab===name));
    $$('.ws-page').forEach(p=>p.classList.toggle('active', p.dataset.wsPage===name));
  }
  $$('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>switchMainTab(btn.dataset.tab)));
  $$('.ws-tab').forEach(btn=>btn.addEventListener('click',()=>switchWsTab(btn.dataset.wsTab)));

  async function loadStats(){
    const tables = ['leads','customers','projects','gallery','reviews'];
    const [leads, customers, projectCount, gallery, reviews] = await Promise.all(tables.map(count));
    stats.innerHTML = `<div><b>${leads}</b><span>Leads</span></div><div><b>${customers}</b><span>Customers</span></div><div><b>${projectCount}</b><span>Projects</span></div><div><b>${gallery}</b><span>Files</span></div><div><b>${reviews}</b><span>Reviews</span></div>`;
  }

  async function loadLeads(){
    const wrap = $('[data-leads-list]'); if(!wrap) return;
    const {data,error}=await client.from('leads').select('*').order('created_at',{ascending:false}).limit(50);
    if(error){ wrap.innerHTML='<p class="form-status error">Could not load leads. Check policies.</p>'; return; }
    wrap.innerHTML = (data||[]).length ? data.map(l=>`<article class="admin-row" data-lead-id="${esc(l.id)}"><div><strong>${esc(l.full_name)}</strong><small>${esc(l.service_type)} • ${esc(l.city)} • ${new Date(l.created_at).toLocaleString()}</small><p>${esc(l.message)}</p><p><a href="tel:${esc(l.phone)}">${esc(l.phone)}</a> ${l.email?`• ${esc(l.email)}`:''}</p></div><div><select data-lead-status>${['New','Contacted','Estimate Scheduled','Quote Sent','Approved','In Progress','Completed','Closed'].map(s=>`<option ${l.status===s?'selected':''}>${s}</option>`).join('')}</select></div></article>`).join('') : '<p>No leads yet.</p>';
  }

  async function loadServices(){
    const wrap = $('[data-services-list]'); if(!wrap) return;
    const {data,error}=await client.from('services').select('*').order('created_at',{ascending:false}).limit(30);
    wrap.innerHTML = error?'<p>Services could not load.</p>':(data||[]).map(s=>`<div class="mini-row"><b>${esc(s.title)}</b><span>${esc(s.category||'')}</span></div>`).join('') || '<p>No services.</p>';
  }

  async function loadReviews(){
    const wrap = $('[data-reviews-list]'); if(!wrap) return;
    const {data,error}=await client.from('reviews').select('*').order('created_at',{ascending:false}).limit(30);
    wrap.innerHTML = error?'<p>Reviews could not load.</p>':(data||[]).map(r=>`<div class="mini-row"><b>${'★'.repeat(r.rating||5)} ${esc(r.customer_name)}</b><span>${r.approved?'Approved':'Draft'} • ${esc(r.city||'')}</span></div>`).join('') || '<p>No reviews.</p>';
  }

  async function loadProjects(){
    const {data,error}=await client.from('projects').select('*').order('created_at',{ascending:false}).limit(100);
    if(error){ console.error(error); notify('Projects could not load.', false); return; }
    projects = data || [];
    const board = $('[data-project-board]');
    if(board){
      board.innerHTML = projects.length ? projects.map(p=>`<button class="project-card" data-open-project="${esc(p.id)}"><strong>${esc(p.project_name)}</strong><span>${esc(p.service_type||'Service')} • ${esc(p.city||'')}</span><em>${esc(p.status||'Planning')}</em></button>`).join('') : '<p>No projects yet. Add one in Quick Add.</p>';
    }
    const selects = $$('[data-workspace-project]');
    selects.forEach(sel=>{ sel.innerHTML='<option value="">Choose project</option>'+projects.map(p=>`<option value="${esc(p.id)}" ${p.id===selectedProjectId?'selected':''}>${esc(p.project_name)}${p.city?' - '+esc(p.city):''}</option>`).join(''); });
    if(selectedProjectId){
      selectedProject = projects.find(p=>p.id===selectedProjectId) || null;
      renderWorkspaceHeader();
    }
  }

  document.addEventListener('click', e=>{
    const btn = e.target.closest('[data-open-project]');
    if(!btn) return;
    selectedProjectId = btn.dataset.openProject;
    switchMainTab('workspace');
    selectWorkspaceProject(selectedProjectId);
  });
  $$('[data-workspace-project]').forEach(sel=>sel.addEventListener('change',()=>selectWorkspaceProject(sel.value)));
  $('[data-ws-refresh]')?.addEventListener('click',()=>loadWorkspace());

  async function selectWorkspaceProject(id){
    selectedProjectId = id;
    selectedProject = projects.find(p=>p.id===id) || null;
    $$('[data-workspace-project]').forEach(s=>s.value=id);
    $$('[data-photo-project-id]').forEach(i=>i.value=id);
    $('[data-workspace-empty]').style.display = id ? 'none' : 'block';
    $('[data-workspace-body]').style.display = id ? 'block' : 'none';
    if(id){ renderWorkspaceHeader(); await loadWorkspace(); }
  }

  function renderWorkspaceHeader(){
    if(!selectedProject) return;
    $('[data-ws-title]').textContent = selectedProject.project_name || 'Project';
    $('[data-ws-status]').textContent = selectedProject.status || 'Planning';
    $('[data-ws-meta]').textContent = `${selectedProject.service_type || 'Service'} • ${selectedProject.city || 'No city'} • Created ${selectedProject.created_at ? new Date(selectedProject.created_at).toLocaleDateString() : ''}`;
    $('[data-ws-notes]').textContent = selectedProject.notes || '';
    $$('[data-photo-project-id]').forEach(i=>i.value=selectedProjectId);
  }

  async function signedUrl(path){ if(!path) return ''; const {data,error}=await client.storage.from('project-photos').createSignedUrl(path, 60*60); return error?'':data.signedUrl; }
  function isImagePath(path){ return /\.(png|jpe?g|gif|webp|avif)$/i.test(path||''); }
  async function loadRecentGallery(){
    const wrap = $('[data-gallery-list]'); if(!wrap) return;
    const {data,error}=await client.from('gallery').select('*, projects(project_name, city)').order('created_at',{ascending:false}).limit(12);
    if(error){ wrap.innerHTML='<p class="form-status error">Gallery could not load.</p>'; return; }
    wrap.innerHTML = await renderMediaCards(data||[]);
  }
  async function renderMediaCards(items){
    if(!items.length) return '<p class="small">No project photos uploaded yet.</p>';
    const cards = await Promise.all(items.map(async g=>{
      const path = g.file_path || g.image_url;
      const url = await signedUrl(path);
      const project = g.projects?.project_name || 'Project';
      const preview = isImagePath(path) && url ? `<img src="${url}" alt="${esc(g.title||g.category||'Project upload')}">` : `<div class="file-tile">📄</div>`;
      return `<article class="media-card">${preview}<div><b>${esc(g.title||'Project upload')}</b><small>${esc(g.photo_stage||g.category||'General')} • ${esc(project)}</small><p>${esc(g.description||'')}</p>${url?`<a class="learn" href="${url}" target="_blank" rel="noopener">Open file →</a>`:''}</div></article>`;
    }));
    return cards.join('');
  }
  async function loadProjectGallery(){
    const wrap = $('[data-project-gallery]'); if(!wrap || !selectedProjectId) return;
    const {data,error}=await client.from('gallery').select('*').eq('project_id', selectedProjectId).order('created_at',{ascending:false});
    if(error){ wrap.innerHTML='<p class="form-status error">Could not load project gallery.</p>'; return; }
    const items = data || [];
    const stages = ['Before','During','After','Thermal','Drone','Reports','Warranty','General'];
    let html = '';
    for(const stage of stages){
      const stageItems = items.filter(i=>(i.photo_stage||i.category||'General').toLowerCase()===stage.toLowerCase());
      if(stageItems.length){ html += `<div class="stage-block"><h4>${stage}</h4><div class="media-grid">${await renderMediaCards(stageItems)}</div></div>`; }
    }
    wrap.innerHTML = html || '<p class="small">No files uploaded for this project yet.</p>';
  }

  async function loadEstimate(){
    const list = $('[data-estimate-list]'); const totalBox = $('[data-estimate-total]'); if(!list || !selectedProjectId) return;
    const {data,error}=await client.from('estimate_items').select('*').eq('project_id', selectedProjectId).order('created_at',{ascending:true});
    if(error){ list.innerHTML='<p class="form-status error">Could not load estimate items. Run V5.2 policies.</p>'; return; }
    const rows = data || [];
    list.innerHTML = rows.length ? `<div class="line-table">${rows.map(r=>`<div><span>${esc(r.description)}</span><span>${r.quantity}</span><span>${money(r.unit_price)}</span><b>${money(r.total)}</b></div>`).join('')}</div>` : '<p class="small">No estimate items yet.</p>';
    const subtotal = rows.reduce((s,r)=>s+Number(r.total||0),0);
    totalBox.innerHTML = `<b>Estimate Subtotal: ${money(subtotal)}</b>`;
  }

  async function loadInvoices(){
    const list = $('[data-invoice-list]'); if(!list || !selectedProjectId) return;
    const {data,error}=await client.from('invoices').select('*').eq('project_id', selectedProjectId).order('created_at',{ascending:false});
    if(error){ list.innerHTML='<p class="form-status error">Could not load invoices. Run V5.2 policies.</p>'; return; }
    list.innerHTML = (data||[]).length ? (data||[]).map(i=>`<div class="mini-row"><b>${esc(i.invoice_number||'Invoice')}</b><span>${esc(i.status||'Unpaid')} • ${money(i.total)} • Due ${i.due_date||'Not set'}</span></div>`).join('') : '<p class="small">No invoices yet.</p>';
  }

  async function loadSchedule(){
    const list = $('[data-schedule-list]'); if(!list || !selectedProjectId) return;
    const {data,error}=await client.from('schedule_events').select('*').eq('project_id', selectedProjectId).order('start_time',{ascending:true});
    if(error){ list.innerHTML='<p class="form-status error">Could not load schedule. Run V5.2 policies.</p>'; return; }
    list.innerHTML = (data||[]).length ? (data||[]).map(ev=>`<div class="mini-row"><b>${esc(ev.title)}</b><span>${esc(ev.event_type||'Event')} • ${ev.start_time?new Date(ev.start_time).toLocaleString():'No time'} • ${esc(ev.location||'')}</span></div>`).join('') : '<p class="small">No scheduled events yet.</p>';
  }

  async function loadWorkspace(){
    if(!selectedProjectId) return;
    await Promise.all([loadProjectGallery(), loadEstimate(), loadInvoices(), loadSchedule()]);
  }

  async function loadAll(){ await Promise.all([loadStats(), loadLeads(), loadServices(), loadProjects(), loadReviews(), loadRecentGallery()]); if(selectedProjectId) await loadWorkspace(); }

  $('[data-login-form]')?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(loginForm); loginStatus.textContent='Signing in...'; const {error}=await client.auth.signInWithPassword({email:fd.get('email'), password:fd.get('password')}); if(error){ loginStatus.textContent='Login failed. Check email/password and admin setup.'; return; } showDash(); });
  logoutBtn?.addEventListener('click', async()=>{ await client.auth.signOut(); showLogin('Signed out.'); });

  $('[data-leads-list]')?.addEventListener('change', async e=>{ if(!e.target.matches('[data-lead-status]')) return; const id=e.target.closest('[data-lead-id]').dataset.leadId; const {error}=await client.from('leads').update({status:e.target.value, updated_at:new Date().toISOString()}).eq('id', id); if(error) notify('Could not update lead status.', false); else { notify('Lead updated.'); loadStats(); } });

  async function insertFromForm(form, table, fields){ const fd=new FormData(form); const row={}; fields.forEach(f=> row[f]=String(fd.get(f)||'').trim()); const {error}=await client.from(table).insert(row); if(error){ console.error(error); notify(`Could not add ${table}.`, false); } else { form.reset(); notify(`${table} added.`); loadAll(); } }
  $('[data-new-customer]')?.addEventListener('submit', e=>{ e.preventDefault(); insertFromForm(e.currentTarget,'customers',['full_name','company','phone','email','city','notes']); });
  $('[data-new-project]')?.addEventListener('submit', e=>{ e.preventDefault(); insertFromForm(e.currentTarget,'projects',['project_name','service_type','status','city','notes']); });
  $('[data-new-service]')?.addEventListener('submit', e=>{ e.preventDefault(); insertFromForm(e.currentTarget,'services',['title','category','description']); });
  $('[data-new-review]')?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(e.currentTarget); const row={customer_name:String(fd.get('customer_name')||'').trim(), city:String(fd.get('city')||'').trim(), rating:Number(fd.get('rating')||5), review_text:String(fd.get('review_text')||'').trim(), approved:false}; const {error}=await client.from('reviews').insert(row); if(error) notify('Could not add review.', false); else { e.currentTarget.reset(); notify('Review saved as draft.'); loadAll(); } });

  $('[data-photo-upload]')?.addEventListener('submit', async e=>{
    e.preventDefault();
    if(!selectedProjectId){ notify('Select a project first.', false); return; }
    const fd=new FormData(e.currentTarget);
    const file=fd.get('file');
    if(!file || !file.name){ notify('Choose a photo or document first.', false); return; }
    const category=String(fd.get('category')||'General').trim();
    const safeName=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-').replace(/^-+|-+$/g,'');
    const path=`${selectedProjectId}/${category.toLowerCase()}/${Date.now()}-${safeName}`;
    notify('Uploading file...');
    const {error:uploadError}=await client.storage.from('project-photos').upload(path, file, {cacheControl:'3600', upsert:false});
    if(uploadError){ console.error(uploadError); notify('Upload failed. Check Storage bucket and policies.', false); return; }
    const row={ project_id:selectedProjectId, title:String(fd.get('title')||file.name).trim(), category, photo_stage:category, image_url:path, file_path:path, file_type:file.type || 'file', description:String(fd.get('description')||'').trim() };
    const {error:dbError}=await client.from('gallery').insert(row);
    if(dbError){ console.error(dbError); notify('File uploaded, but gallery record failed.', false); return; }
    e.currentTarget.reset();
    notify('Project file uploaded.');
    await Promise.all([loadStats(), loadProjectGallery(), loadRecentGallery()]);
  });

  $('[data-estimate-item]')?.addEventListener('submit', async e=>{
    e.preventDefault(); if(!selectedProjectId){ notify('Select a project first.', false); return; }
    const fd=new FormData(e.currentTarget);
    const row={ project_id:selectedProjectId, description:String(fd.get('description')||'').trim(), quantity:Number(fd.get('quantity')||1), unit_price:Number(fd.get('unit_price')||0) };
    const {error}=await client.from('estimate_items').insert(row);
    if(error){ console.error(error); notify('Could not add estimate item. Check policies.', false); } else { e.currentTarget.reset(); notify('Estimate item added.'); loadEstimate(); }
  });

  $('[data-create-invoice]')?.addEventListener('submit', async e=>{
    e.preventDefault(); if(!selectedProjectId){ notify('Select a project first.', false); return; }
    const items = await client.from('estimate_items').select('total').eq('project_id', selectedProjectId);
    const subtotal = (items.data||[]).reduce((s,r)=>s+Number(r.total||0),0);
    const fd=new FormData(e.currentTarget);
    const row={ project_id:selectedProjectId, invoice_number:String(fd.get('invoice_number')||`BB-${Date.now()}`).trim(), due_date:fd.get('due_date') || null, subtotal, tax:0, total:subtotal, status:'Unpaid' };
    const {error}=await client.from('invoices').insert(row);
    if(error){ console.error(error); notify('Could not create invoice. Check policies.', false); } else { e.currentTarget.reset(); notify('Invoice created.'); loadInvoices(); }
  });

  $('[data-schedule-event]')?.addEventListener('submit', async e=>{
    e.preventDefault(); if(!selectedProjectId){ notify('Select a project first.', false); return; }
    const fd=new FormData(e.currentTarget);
    const row={ project_id:selectedProjectId, title:String(fd.get('title')||'').trim(), event_type:String(fd.get('event_type')||'').trim(), start_time:fd.get('start_time') ? new Date(fd.get('start_time')).toISOString() : null, end_time:fd.get('end_time') ? new Date(fd.get('end_time')).toISOString() : null, location:String(fd.get('location')||'').trim(), notes:String(fd.get('notes')||'').trim() };
    const {error}=await client.from('schedule_events').insert(row);
    if(error){ console.error(error); notify('Could not add schedule event. Check policies.', false); } else { e.currentTarget.reset(); notify('Schedule event added.'); loadSchedule(); }
  });

  client.auth.getSession().then(({data})=> data.session ? showDash() : showLogin());
})();
