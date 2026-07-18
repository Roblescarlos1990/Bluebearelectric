(function(){
  const params=new URLSearchParams(location.search);
  const source=params.get('source');
  const project=params.get('project');
  const service=params.get('service');
  const details=params.get('details');
  if(source!=='typical-project'||!project)return;

  function apply(){
    const form=document.querySelector('[data-lead-form]');
    if(!form)return;

    const serviceSelect=form.querySelector('[name="service_type"]');
    const message=form.querySelector('[name="message"]');
    const estimate=document.querySelector('#estimate-form');

    if(serviceSelect&&service){
      const match=[...serviceSelect.options].find(o=>o.value===service||o.textContent.trim()===service);
      if(match)serviceSelect.value=match.value;
    }

    if(message){
      message.value=details||`I am interested in the ${project} typical project. Please contact me to discuss the scope and next steps.`;
      message.dispatchEvent(new Event('input',{bubbles:true}));
    }

    let banner=document.querySelector('[data-project-prefill-banner]');
    if(!banner){
      banner=document.createElement('div');
      banner.className='project-prefill-banner';
      banner.dataset.projectPrefillBanner='';
      form.prepend(banner);
    }
    banner.innerHTML=`
      <div>
        <span>Typical project selected</span>
        <strong>${escapeHTML(project)}</strong>
        <small>The service and project description have been added to your request. Add your contact information and any site-specific details.</small>
      </div>
      <button type="button" aria-label="Clear selected project">Clear</button>`;

    banner.querySelector('button').onclick=()=>{
      banner.remove();
      if(serviceSelect)serviceSelect.value='';
      if(message)message.value='';
      history.replaceState({},'',location.pathname+'#estimate-form');
    };

    document.title=`${project} Estimate Request | Blue Bear Electric`;
    requestAnimationFrame(()=>estimate?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));
    setTimeout(()=>form.querySelector('[name="full_name"]')?.focus({preventScroll:true}),650);
  }

  function escapeHTML(value){
    return String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);
  else apply();
})();