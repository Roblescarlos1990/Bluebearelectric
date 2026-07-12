(function(){
  if(!window.supabase) return;
  const client = window.supabase.createClient(window.BLUE_BEAR_SUPABASE_URL, window.BLUE_BEAR_SUPABASE_KEY);
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = v => String(v ?? '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let state={employee:null,projects:[],schedule:[],time:[],daily:[],jsa:[],vehicle:[],materials:[],complete:[]};
  function msg(t,ok=true){const el=$('[data-employee-message]'); if(el){el.textContent=t; el.className='form-status '+(ok?'success':'error');}}
  function showLogin(t=''){ $('[data-employee-login]').style.display='block'; $('[data-employee-app]').style.display='none'; const s=$('[data-employee-login-status]'); if(s) s.textContent=t; }
  function showApp(){ $('[data-employee-login]').style.display='none'; $('[data-employee-app]').style.display='block'; loadPortal(); }
  function bindTabs(){ $$('[data-emp-tab]').forEach(btn=>btn.onclick=()=>{ $$('[data-emp-tab]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); $$('[data-emp-page]').forEach(p=>p.classList.remove('active')); $(`[data-emp-page="${btn.dataset.empTab}"]`)?.classList.add('active'); }); }
  function nowLocalDate(){ return new Date().toISOString().slice(0,10); }
  async function safeSelect(table, order='created_at'){
    const r = await client.from(table).select('*').order(order,{ascending:false}).limit(25);
    if(r.error) console.warn(table,r.error); return r.data||[];
  }
  async function loadPortal(){
    msg('Loading field portal...');
    const user = await client.auth.getUser();
    const emp=await client.from('employee_users').select('*').eq('user_id', user.data?.user?.id || '').maybeSingle();
    if(emp.error){console.error(emp.error); msg('No employee profile mapped to this login yet.',false); return;}
    state.employee=emp.data; $('[data-employee-name]').textContent = emp.data ? `${emp.data.full_name} Field Dashboard` : 'Field Dashboard';
    const projects=await client.from('projects').select('*').order('created_at',{ascending:false});
    const schedule=await client.from('schedule_events').select('*').order('start_time',{ascending:true});
    const time=await client.from('time_entries').select('*').order('created_at',{ascending:false}).limit(20);
    [projects,schedule,time].forEach(r=>{if(r.error) console.error(r.error)});
    state.projects=projects.data||[]; state.schedule=schedule.data||[]; state.time=time.data||[];
    state.daily=await safeSelect('field_daily_reports');
    state.jsa=await safeSelect('safety_jsa_forms');
    state.vehicle=await safeSelect('vehicle_inspections');
    state.materials=await safeSelect('material_requests');
    state.complete=await safeSelect('job_completion_checklists');
    render(); msg('');
  }
  function projectName(id){ return state.projects.find(p=>p.id===id)?.project_name || 'No project'; }
  function renderMiniRows(el, rows, mapper, empty='No records yet.'){
    const node=$(el); if(!node) return;
    node.innerHTML=rows.length?rows.map(mapper).join(''):`<p class="small">${empty}</p>`;
  }
  function render(){
    renderMiniRows('[data-employee-schedule]',state.schedule,e=>`<div class="mini-row"><b>${esc(e.title)}</b><span>${e.start_time?new Date(e.start_time).toLocaleString():'No time'} • ${esc(e.location||'')} • ${esc(e.event_type||'Event')}</span></div>`,'No schedule events yet.');
    const proj=$('[data-employee-projects]');
    if(proj) proj.innerHTML=state.projects.length?state.projects.map(p=>`<article class="v6-card"><span class="badge">${esc(p.status||'Planning')}</span><h4>${esc(p.project_name)}</h4><p class="small">${esc(p.service_type||'Service')} • ${esc(p.city||'')}</p><p>${esc(p.notes||'')}</p></article>`).join(''):'<p class="small">No projects yet.</p>';
    $$('[data-time-project],[data-daily-project],[data-jsa-project],[data-material-project],[data-completion-project]').forEach(select=>{ select.innerHTML='<option value="">Choose project</option>'+state.projects.map(p=>`<option value="${p.id}">${esc(p.project_name)} - ${esc(p.city||'')}</option>`).join(''); });
    renderMiniRows('[data-time-entry-list]',state.time,t=>`<div class="mini-row"><b>${t.start_time?new Date(t.start_time).toLocaleString():'Time entry'}</b><span>${t.end_time?'End: '+new Date(t.end_time).toLocaleString():'Open'} • ${esc(t.notes||'')}</span></div>`,'No time entries yet.');
    renderMiniRows('[data-daily-report-list]',state.daily,r=>`<div class="mini-row"><b>${esc(projectName(r.project_id))} • ${esc(r.work_date||'')}</b><span>${esc(r.work_performed||'')} ${r.issues?'• Issues: '+esc(r.issues):''}</span></div>`);
    renderMiniRows('[data-jsa-list]',state.jsa,r=>`<div class="mini-row"><b>${esc(r.task||'JSA')} • ${esc(projectName(r.project_id))}</b><span>PPE: ${r.ppe_confirmed?'Yes':'No'} • LOTO: ${r.loto_required?'Yes':'No'} • ${esc(r.signature||'')}</span></div>`);
    renderMiniRows('[data-vehicle-list]',state.vehicle,r=>`<div class="mini-row"><b>${esc(r.vehicle||'Vehicle')} • ${esc(r.mileage||'')} mi</b><span>Tires: ${r.tires_ok?'OK':'Check'} • Lights: ${r.lights_ok?'OK':'Check'} • Tools: ${r.tools_ok?'OK':'Check'} • ${esc(r.notes||'')}</span></div>`);
    renderMiniRows('[data-material-list]',state.materials,r=>`<div class="mini-row"><b>${esc(r.urgency||'Normal')} • ${esc(projectName(r.project_id))}</b><span>${esc(r.items||'')} ${r.notes?'• '+esc(r.notes):''}</span></div>`);
    renderMiniRows('[data-completion-list]',state.complete,r=>`<div class="mini-row"><b>${esc(projectName(r.project_id))}</b><span>Complete: ${r.work_complete?'Yes':'No'} • Photos: ${r.photos_uploaded?'Yes':'No'} • Customer walkthrough: ${r.customer_walkthrough?'Yes':'No'}</span></div>`);
    const activity=$('[data-field-activity]');
    if(activity){
      const items=[...state.daily.map(x=>['Daily Report',x.created_at,projectName(x.project_id)]),...state.jsa.map(x=>['Safety/JSA',x.created_at,x.task]),...state.materials.map(x=>['Material Request',x.created_at,x.items]),...state.complete.map(x=>['Completion',x.created_at,projectName(x.project_id)])].sort((a,b)=>new Date(b[1])-new Date(a[1])).slice(0,10);
      activity.innerHTML=items.length?items.map(i=>`<div class="mini-row"><b>${esc(i[0])}</b><span>${i[1]?new Date(i[1]).toLocaleString():''} • ${esc(i[2]||'')}</span></div>`).join(''):'<p class="small">No field activity yet.</p>';
    }
  }
  async function insert(table,row,success){ const {error}=await client.from(table).insert(row); if(error){console.error(error); msg(`Could not save ${table.replaceAll('_',' ')}. Check database permissions and field-operations setup.`,false); return;} msg(success); await loadPortal(); }
  $('[data-employee-login-form]')?.addEventListener('submit',async e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); $('[data-employee-login-status]').textContent='Signing in...'; const {error}=await client.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')}); if(error){$('[data-employee-login-status]').textContent='Login failed.'; return;} showApp();});
  $('[data-employee-logout]')?.addEventListener('click',async()=>{await client.auth.signOut(); showLogin('Signed out.');});
  $('[data-time-entry-form]')?.addEventListener('submit',async e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); await insert('time_entries',{employee_user_id:state.employee?.user_id,project_id:fd.get('project_id')||null,start_time:fd.get('start_time')?new Date(fd.get('start_time')).toISOString():new Date().toISOString(),end_time:fd.get('end_time')?new Date(fd.get('end_time')).toISOString():null,notes:String(fd.get('notes')||'')},'Time entry saved.'); e.currentTarget.reset();});
  $('[data-daily-report-form]')?.addEventListener('submit',async e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); await insert('field_daily_reports',{employee_user_id:state.employee?.user_id,project_id:fd.get('project_id')||null,work_date:fd.get('work_date')||nowLocalDate(),work_performed:fd.get('work_performed'),issues:fd.get('issues'),next_steps:fd.get('next_steps')},'Daily report submitted.'); e.currentTarget.reset();});
  $('[data-jsa-form]')?.addEventListener('submit',async e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); await insert('safety_jsa_forms',{employee_user_id:state.employee?.user_id,project_id:fd.get('project_id')||null,task:fd.get('task'),hazards:fd.get('hazards'),controls:fd.get('controls'),ppe_confirmed:fd.get('ppe_confirmed')==='on',loto_required:fd.get('loto_required')==='on',signature:fd.get('signature')},'Safety/JSA form saved.'); e.currentTarget.reset();});
  $('[data-vehicle-form]')?.addEventListener('submit',async e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); await insert('vehicle_inspections',{employee_user_id:state.employee?.user_id,vehicle:fd.get('vehicle'),mileage:fd.get('mileage')||null,tires_ok:fd.get('tires_ok')==='on',lights_ok:fd.get('lights_ok')==='on',tools_ok:fd.get('tools_ok')==='on',damage_found:fd.get('damage_found')==='on',notes:fd.get('notes')},'Vehicle inspection submitted.'); e.currentTarget.reset();});
  $('[data-material-form]')?.addEventListener('submit',async e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); await insert('material_requests',{employee_user_id:state.employee?.user_id,project_id:fd.get('project_id')||null,items:fd.get('items'),urgency:fd.get('urgency'),notes:fd.get('notes'),status:'Requested'},'Material request sent.'); e.currentTarget.reset();});
  $('[data-completion-form]')?.addEventListener('submit',async e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); await insert('job_completion_checklists',{employee_user_id:state.employee?.user_id,project_id:fd.get('project_id')||null,work_complete:fd.get('work_complete')==='on',area_clean:fd.get('area_clean')==='on',photos_uploaded:fd.get('photos_uploaded')==='on',customer_walkthrough:fd.get('customer_walkthrough')==='on',power_restored:fd.get('power_restored')==='on',notes:fd.get('notes')},'Completion checklist submitted.'); e.currentTarget.reset();});
  bindTabs();
  client.auth.getSession().then(({data})=> data.session ? showApp() : showLogin());
})();
