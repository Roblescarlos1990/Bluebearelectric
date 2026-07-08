(function(){
  if(!window.supabase) return;
  const client = window.supabase.createClient(window.BLUE_BEAR_SUPABASE_URL, window.BLUE_BEAR_SUPABASE_KEY);
  const loginBox = document.querySelector('[data-admin-login]');
  const dashboard = document.querySelector('[data-admin-dashboard]');
  const loginForm = document.querySelector('[data-login-form]');
  const loginStatus = document.querySelector('[data-login-status]');
  const logoutBtn = document.querySelector('[data-logout]');
  const stats = document.querySelector('[data-admin-stats]');
  const leadsWrap = document.querySelector('[data-leads-list]');
  const servicesWrap = document.querySelector('[data-services-list]');
  const projectsWrap = document.querySelector('[data-projects-list]');
  const reviewsWrap = document.querySelector('[data-reviews-list]');
  const photoForm = document.querySelector('[data-photo-upload]');
  const projectSelect = document.querySelector('[data-project-select]');
  const galleryWrap = document.querySelector('[data-gallery-list]');
  const customerForm = document.querySelector('[data-new-customer]');
  const projectForm = document.querySelector('[data-new-project]');
  const serviceForm = document.querySelector('[data-new-service]');
  const reviewForm = document.querySelector('[data-new-review]');
  const msg = document.querySelector('[data-admin-message]');
  const esc = (v)=>String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const notify = (text, ok=true)=>{ if(msg){ msg.textContent=text; msg.className=ok?'form-status ok':'form-status error'; setTimeout(()=>msg.textContent='',4000); } };
  function showLogin(text=''){ loginBox.style.display='block'; dashboard.style.display='none'; if(loginStatus) loginStatus.textContent=text; }
  function showDash(){ loginBox.style.display='none'; dashboard.style.display='block'; loadAll(); }
  async function count(table){ const { count } = await client.from(table).select('*', { count:'exact', head:true }); return count || 0; }
  async function loadStats(){
    const [leads, customers, projects, services, reviews, gallery] = await Promise.all(['leads','customers','projects','services','reviews','gallery'].map(count));
    stats.innerHTML = `<div><b>${leads}</b><span>Leads</span></div><div><b>${customers}</b><span>Customers</span></div><div><b>${projects}</b><span>Projects</span></div><div><b>${gallery}</b><span>Files</span></div><div><b>${reviews}</b><span>Reviews</span></div>`;
  }
  async function loadLeads(){
    const {data,error}=await client.from('leads').select('*').order('created_at',{ascending:false}).limit(50);
    if(error){ leadsWrap.innerHTML='<p class="form-status error">Could not load leads. Check admin access policies.</p>'; return; }
    leadsWrap.innerHTML = data.length ? data.map(l=>`<article class="admin-row" data-lead-id="${esc(l.id)}"><div><strong>${esc(l.full_name)}</strong><small>${esc(l.service_type)} • ${esc(l.city)} • ${new Date(l.created_at).toLocaleString()}</small><p>${esc(l.message)}</p><p><a href="tel:${esc(l.phone)}">${esc(l.phone)}</a> ${l.email?`• ${esc(l.email)}`:''}</p></div><div><select data-lead-status>${['New','Contacted','Estimate Scheduled','Quote Sent','Approved','In Progress','Completed','Closed'].map(s=>`<option ${l.status===s?'selected':''}>${s}</option>`).join('')}</select></div></article>`).join('') : '<p>No leads yet.</p>';
  }
  async function loadServices(){ const {data,error}=await client.from('services').select('*').order('created_at',{ascending:false}).limit(30); servicesWrap.innerHTML = error?'<p>Services could not load.</p>':(data||[]).map(s=>`<div class="mini-row"><b>${esc(s.title)}</b><span>${esc(s.category||'')}</span></div>`).join('') || '<p>No services.</p>'; }
  async function loadProjects(){ const {data,error}=await client.from('projects').select('*').order('created_at',{ascending:false}).limit(50); if(error){ projectsWrap.innerHTML='<p>Projects could not load.</p>'; return; } const projects=data||[]; projectsWrap.innerHTML = projects.map(p=>`<div class="mini-row"><b>${esc(p.project_name)}</b><span>${esc(p.status||'Planning')} • ${esc(p.city||'')}</span></div>`).join('') || '<p>No projects.</p>'; if(projectSelect){ projectSelect.innerHTML='<option value="">Choose project</option>'+projects.map(p=>`<option value="${esc(p.id)}">${esc(p.project_name)}${p.city?' - '+esc(p.city):''}</option>`).join(''); } }
  async function signedUrl(path){ if(!path) return ''; const {data,error}=await client.storage.from('project-photos').createSignedUrl(path, 60*60); return error?'':data.signedUrl; }
  function isImagePath(path){ return /\.(png|jpe?g|gif|webp|avif)$/i.test(path||''); }
  async function loadGallery(){ if(!galleryWrap) return; const {data,error}=await client.from('gallery').select('*, projects(project_name, city)').order('created_at',{ascending:false}).limit(24); if(error){ galleryWrap.innerHTML='<p class="form-status error">Gallery could not load. Check gallery policies.</p>'; return; } const items=data||[]; if(!items.length){ galleryWrap.innerHTML='<p class="small">No project photos uploaded yet.</p>'; return; } const cards = await Promise.all(items.map(async g=>{ const url=await signedUrl(g.image_url); const project=g.projects?.project_name || 'Unassigned'; const city=g.projects?.city ? ' • '+g.projects.city : ''; const preview=isImagePath(g.image_url) && url ? `<img src="${url}" alt="${esc(g.title||g.category||'Project upload')}">` : `<div class="file-tile">📄</div>`; const open=url?`<a class="learn" href="${url}" target="_blank" rel="noopener">Open file →</a>`:''; return `<article class="media-card">${preview}<div><b>${esc(g.title||'Project upload')}</b><small>${esc(g.category||'General')} • ${esc(project)}${esc(city)}</small><p>${esc(g.description||'')}</p>${open}</div></article>`; })); galleryWrap.innerHTML=cards.join(''); }
  async function loadReviews(){ const {data,error}=await client.from('reviews').select('*').order('created_at',{ascending:false}).limit(30); reviewsWrap.innerHTML = error?'<p>Reviews could not load.</p>':(data||[]).map(r=>`<div class="mini-row"><b>${'★'.repeat(r.rating||5)} ${esc(r.customer_name)}</b><span>${r.approved?'Approved':'Draft'} • ${esc(r.city||'')}</span></div>`).join('') || '<p>No reviews.</p>'; }
  async function loadAll(){ await Promise.all([loadStats(), loadLeads(), loadServices(), loadProjects(), loadReviews(), loadGallery()]); }
  loginForm?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(loginForm); loginStatus.textContent='Signing in...'; const {error}=await client.auth.signInWithPassword({email:fd.get('email'), password:fd.get('password')}); if(error){ loginStatus.textContent='Login failed. Check email/password and admin setup.'; return; } showDash(); });
  logoutBtn?.addEventListener('click', async()=>{ await client.auth.signOut(); showLogin('Signed out.'); });
  leadsWrap?.addEventListener('change', async e=>{ if(!e.target.matches('[data-lead-status]')) return; const id=e.target.closest('[data-lead-id]').dataset.leadId; const {error}=await client.from('leads').update({status:e.target.value, updated_at:new Date().toISOString()}).eq('id', id); if(error) notify('Could not update lead status.', false); else { notify('Lead updated.'); loadStats(); } });
  async function insertFromForm(form, table, fields){ const fd=new FormData(form); const row={}; fields.forEach(f=> row[f]=String(fd.get(f)||'').trim()); const {error}=await client.from(table).insert(row); if(error){ console.error(error); notify(`Could not add ${table}.`, false); } else { form.reset(); notify(`${table} added.`); loadAll(); } }
  customerForm?.addEventListener('submit', e=>{ e.preventDefault(); insertFromForm(customerForm,'customers',['full_name','company','phone','email','city','notes']); });
  projectForm?.addEventListener('submit', e=>{ e.preventDefault(); insertFromForm(projectForm,'projects',['project_name','service_type','status','city','notes']); });
  serviceForm?.addEventListener('submit', e=>{ e.preventDefault(); insertFromForm(serviceForm,'services',['title','category','description']); });
  reviewForm?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(reviewForm); const row={customer_name:String(fd.get('customer_name')||'').trim(), city:String(fd.get('city')||'').trim(), rating:Number(fd.get('rating')||5), review_text:String(fd.get('review_text')||'').trim(), approved:false}; const {error}=await client.from('reviews').insert(row); if(error) notify('Could not add review.', false); else { reviewForm.reset(); notify('Review saved as draft.'); loadAll(); } });
  photoForm?.addEventListener('submit', async e=>{
    e.preventDefault();
    const fd=new FormData(photoForm);
    const file=fd.get('file');
    if(!file || !file.name){ notify('Choose a photo or document first.', false); return; }
    const projectId=String(fd.get('project_id')||'').trim();
    const category=String(fd.get('category')||'General').trim();
    const safeName=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-').replace(/^-+|-+$/g,'');
    const folder=projectId || 'unassigned';
    const path=`${folder}/${category.toLowerCase()}/${Date.now()}-${safeName}`;
    notify('Uploading file...');
    const {error:uploadError}=await client.storage.from('project-photos').upload(path, file, {cacheControl:'3600', upsert:false});
    if(uploadError){ console.error(uploadError); notify('Upload failed. Check Storage bucket and policies.', false); return; }
    const row={ project_id: projectId || null, title:String(fd.get('title')||file.name).trim(), category, image_url:path, description:String(fd.get('description')||'').trim() };
    const {error:dbError}=await client.from('gallery').insert(row);
    if(dbError){ console.error(dbError); notify('File uploaded, but gallery record failed.', false); return; }
    photoForm.reset();
    notify('Project file uploaded.');
    loadAll();
  });
  client.auth.getSession().then(({data})=> data.session ? showDash() : showLogin());
})();
