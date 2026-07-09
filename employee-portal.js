(function(){
  if(!window.supabase) return;
  const client = window.supabase.createClient(window.BLUE_BEAR_SUPABASE_URL, window.BLUE_BEAR_SUPABASE_KEY);
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = v => String(v ?? '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let state={employee:null,projects:[],schedule:[],time:[]};
  function msg(t,ok=true){const el=$('[data-employee-message]'); if(el){el.textContent=t; el.className='form-status '+(ok?'success':'error');}}
  function showLogin(t=''){ $('[data-employee-login]').style.display='block'; $('[data-employee-app]').style.display='none'; const s=$('[data-employee-login-status]'); if(s) s.textContent=t; }
  function showApp(){ $('[data-employee-login]').style.display='none'; $('[data-employee-app]').style.display='block'; loadPortal(); }
  function bindTabs(){ $$('[data-emp-tab]').forEach(btn=>btn.onclick=()=>{ $$('[data-emp-tab]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); $$('[data-emp-page]').forEach(p=>p.classList.remove('active')); $(`[data-emp-page="${btn.dataset.empTab}"]`)?.classList.add('active'); }); }
  async function loadPortal(){
    msg('Loading field portal...');
    const emp=await client.from('employee_users').select('*').limit(1).maybeSingle();
    if(emp.error){console.error(emp.error); msg('No employee profile mapped to this login yet.',false); return;}
    state.employee=emp.data; $('[data-employee-name]').textContent = emp.data ? `${emp.data.full_name} Field Dashboard` : 'Field Dashboard';
    const projects=await client.from('projects').select('*').order('created_at',{ascending:false});
    const schedule=await client.from('schedule_events').select('*').order('start_time',{ascending:true});
    const time=await client.from('time_entries').select('*').order('created_at',{ascending:false}).limit(20);
    [projects,schedule,time].forEach(r=>{if(r.error) console.error(r.error)});
    state.projects=projects.data||[]; state.schedule=schedule.data||[]; state.time=time.data||[];
    render(); msg('');
  }
  function render(){
    const sched=$('[data-employee-schedule]');
    if(sched) sched.innerHTML=state.schedule.length?state.schedule.map(e=>`<div class="mini-row"><b>${esc(e.title)}</b><span>${e.start_time?new Date(e.start_time).toLocaleString():'No time'} • ${esc(e.location||'')} • ${esc(e.event_type||'Event')}</span></div>`).join(''):'<p class="small">No schedule events yet.</p>';
    const proj=$('[data-employee-projects]');
    if(proj) proj.innerHTML=state.projects.length?state.projects.map(p=>`<article class="v6-card"><span class="badge">${esc(p.status||'Planning')}</span><h4>${esc(p.project_name)}</h4><p class="small">${esc(p.service_type||'Service')} • ${esc(p.city||'')}</p><p>${esc(p.notes||'')}</p></article>`).join(''):'<p class="small">No projects yet.</p>';
    const select=$('[data-time-project]');
    if(select) select.innerHTML='<option value="">Choose project</option>'+state.projects.map(p=>`<option value="${p.id}">${esc(p.project_name)} - ${esc(p.city||'')}</option>`).join('');
    const time=$('[data-time-entry-list]');
    if(time) time.innerHTML=state.time.length?state.time.map(t=>`<div class="mini-row"><b>${t.start_time?new Date(t.start_time).toLocaleString():'Time entry'}</b><span>${t.end_time?'End: '+new Date(t.end_time).toLocaleString():'Open'} • ${esc(t.notes||'')}</span></div>`).join(''):'<p class="small">No time entries yet.</p>';
  }
  $('[data-employee-login-form]')?.addEventListener('submit',async e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); $('[data-employee-login-status]').textContent='Signing in...'; const {error}=await client.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')}); if(error){$('[data-employee-login-status]').textContent='Login failed.'; return;} showApp();});
  $('[data-employee-logout]')?.addEventListener('click',async()=>{await client.auth.signOut(); showLogin('Signed out.');});
  $('[data-time-entry-form]')?.addEventListener('submit',async e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); const row={employee_user_id:state.employee?.user_id,project_id:fd.get('project_id')||null,start_time:fd.get('start_time')?new Date(fd.get('start_time')).toISOString():new Date().toISOString(),end_time:fd.get('end_time')?new Date(fd.get('end_time')).toISOString():null,notes:String(fd.get('notes')||'')}; const {error}=await client.from('time_entries').insert(row); if(error){console.error(error); msg('Could not save time entry.',false); return;} e.currentTarget.reset(); msg('Time entry saved.'); await loadPortal();});
  bindTabs();
  client.auth.getSession().then(({data})=> data.session ? showApp() : showLogin());
})();
