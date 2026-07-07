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
    const [leads, customers, projects, services, reviews] = await Promise.all(['leads','customers','projects','services','reviews'].map(count));
    stats.innerHTML = `<div><b>${leads}</b><span>Leads</span></div><div><b>${customers}</b><span>Customers</span></div><div><b>${projects}</b><span>Projects</span></div><div><b>${services}</b><span>Services</span></div><div><b>${reviews}</b><span>Reviews</span></div>`;
  }
  async function loadLeads(){
    const {data,error}=await client.from('leads').select('*').order('created_at',{ascending:false}).limit(50);
    if(error){ leadsWrap.innerHTML='<p class="form-status error">Could not load leads. Check admin access policies.</p>'; return; }
    leadsWrap.innerHTML = data.length ? data.map(l=>`<article class="admin-row" data-lead-id="${esc(l.id)}"><div><strong>${esc(l.full_name)}</strong><small>${esc(l.service_type)} • ${esc(l.city)} • ${new Date(l.created_at).toLocaleString()}</small><p>${esc(l.message)}</p><p><a href="tel:${esc(l.phone)}">${esc(l.phone)}</a> ${l.email?`• ${esc(l.email)}`:''}</p></div><div><select data-lead-status>${['New','Contacted','Estimate Scheduled','Quote Sent','Approved','In Progress','Completed','Closed'].map(s=>`<option ${l.status===s?'selected':''}>${s}</option>`).join('')}</select></div></article>`).join('') : '<p>No leads yet.</p>';
  }
  async function loadServices(){ const {data,error}=await client.from('services').select('*').order('created_at',{ascending:false}).limit(30); servicesWrap.innerHTML = error?'<p>Services could not load.</p>':(data||[]).map(s=>`<div class="mini-row"><b>${esc(s.title)}</b><span>${esc(s.category||'')}</span></div>`).join('') || '<p>No services.</p>'; }
  async function loadProjects(){ const {data,error}=await client.from('projects').select('*').order('created_at',{ascending:false}).limit(30); projectsWrap.innerHTML = error?'<p>Projects could not load.</p>':(data||[]).map(p=>`<div class="mini-row"><b>${esc(p.project_name)}</b><span>${esc(p.status||'Planning')} • ${esc(p.city||'')}</span></div>`).join('') || '<p>No projects.</p>'; }
  async function loadReviews(){ const {data,error}=await client.from('reviews').select('*').order('created_at',{ascending:false}).limit(30); reviewsWrap.innerHTML = error?'<p>Reviews could not load.</p>':(data||[]).map(r=>`<div class="mini-row"><b>${'★'.repeat(r.rating||5)} ${esc(r.customer_name)}</b><span>${r.approved?'Approved':'Draft'} • ${esc(r.city||'')}</span></div>`).join('') || '<p>No reviews.</p>'; }
  async function loadAll(){ await Promise.all([loadStats(), loadLeads(), loadServices(), loadProjects(), loadReviews()]); }
  loginForm?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(loginForm); loginStatus.textContent='Signing in...'; const {error}=await client.auth.signInWithPassword({email:fd.get('email'), password:fd.get('password')}); if(error){ loginStatus.textContent='Login failed. Check email/password and admin setup.'; return; } showDash(); });
  logoutBtn?.addEventListener('click', async()=>{ await client.auth.signOut(); showLogin('Signed out.'); });
  leadsWrap?.addEventListener('change', async e=>{ if(!e.target.matches('[data-lead-status]')) return; const id=e.target.closest('[data-lead-id]').dataset.leadId; const {error}=await client.from('leads').update({status:e.target.value, updated_at:new Date().toISOString()}).eq('id', id); if(error) notify('Could not update lead status.', false); else { notify('Lead updated.'); loadStats(); } });
  async function insertFromForm(form, table, fields){ const fd=new FormData(form); const row={}; fields.forEach(f=> row[f]=String(fd.get(f)||'').trim()); const {error}=await client.from(table).insert(row); if(error){ console.error(error); notify(`Could not add ${table}.`, false); } else { form.reset(); notify(`${table} added.`); loadAll(); } }
  customerForm?.addEventListener('submit', e=>{ e.preventDefault(); insertFromForm(customerForm,'customers',['full_name','company','phone','email','city','notes']); });
  projectForm?.addEventListener('submit', e=>{ e.preventDefault(); insertFromForm(projectForm,'projects',['project_name','service_type','status','city','notes']); });
  serviceForm?.addEventListener('submit', e=>{ e.preventDefault(); insertFromForm(serviceForm,'services',['title','category','description']); });
  reviewForm?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(reviewForm); const row={customer_name:String(fd.get('customer_name')||'').trim(), city:String(fd.get('city')||'').trim(), rating:Number(fd.get('rating')||5), review_text:String(fd.get('review_text')||'').trim(), approved:false}; const {error}=await client.from('reviews').insert(row); if(error) notify('Could not add review.', false); else { reviewForm.reset(); notify('Review saved as draft.'); loadAll(); } });
  client.auth.getSession().then(({data})=> data.session ? showDash() : showLogin());
})();
