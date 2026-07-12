(function(){
  const forms = [...document.querySelectorAll('[data-lead-form]')];
  if(!forms.length) return;

  const getClient = () => {
    if(!window.supabase || !window.BLUE_BEAR_SUPABASE_URL || !window.BLUE_BEAR_SUPABASE_KEY) return null;
    return window.supabase.createClient(window.BLUE_BEAR_SUPABASE_URL, window.BLUE_BEAR_SUPABASE_KEY);
  };

  const showSuccessModal = (name) => {
    document.querySelector('[data-estimate-success-modal]')?.remove();
    const modal = document.createElement('div');
    modal.className = 'estimate-success-modal';
    modal.setAttribute('data-estimate-success-modal','');
    modal.innerHTML = `
      <div class="estimate-success-card" role="dialog" aria-modal="true" aria-labelledby="estimate-success-title">
        <button class="success-close" type="button" aria-label="Close confirmation">×</button>
        <div class="success-check" aria-hidden="true">✓</div>
        <div class="eyebrow">Request Delivered</div>
        <h2 id="estimate-success-title">Thank You${name ? `, ${name.split(' ')[0]}` : ''}!</h2>
        <p>Your free estimate request has been received by Blue Bear Electric.</p>
        <p class="small">A team member will review the details and contact you to discuss the next step. For urgent service, call <a href="tel:7602348306">760-234-8306</a>.</p>
        <div class="success-actions">
          <button class="btn yellow success-done" type="button">Done</button>
          <a class="btn dark" href="tel:7602348306">Call Blue Bear Electric</a>
        </div>
      </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(()=>modal.classList.add('open'));
    const close=()=>{modal.classList.remove('open');setTimeout(()=>modal.remove(),220)};
    modal.querySelector('.success-close').addEventListener('click',close);
    modal.querySelector('.success-done').addEventListener('click',close);
    modal.addEventListener('click',e=>{if(e.target===modal)close()});
    document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',esc)}});
    modal.querySelector('.success-done').focus();
  };

  forms.forEach(form => {
    const status = form.querySelector('[data-form-status]') || document.querySelector('[data-form-status]');
    const button = form.querySelector('button[type="submit"]');
    const label = button?.querySelector('.btn-label');
    const originalLabel = label?.textContent || button?.textContent || 'Send My Estimate Request';

    const setStatus=(message,type='')=>{
      if(!status) return;
      status.textContent=message;
      status.className=`form-status ${type}`.trim();
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      setStatus('');

      const fd = new FormData(form);
      const payload = {
        full_name: String(fd.get('full_name') || '').trim(),
        phone: String(fd.get('phone') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        city: String(fd.get('city') || '').trim(),
        service_type: String(fd.get('service_type') || '').trim(),
        urgency: String(fd.get('urgency') || 'Normal').trim(),
        message: String(fd.get('message') || '').trim(),
        source: 'website',
        status: 'New'
      };

      if(!payload.full_name || !payload.phone || !payload.service_type){
        setStatus('Please complete your name, phone number, and service needed.','error');
        form.querySelector('[name="full_name"]:invalid, [name="phone"]:invalid, [name="service_type"]:invalid')?.focus();
        return;
      }

      const client = getClient();
      if(!client){
        setStatus('The request system is temporarily unavailable. Please call 760-234-8306.','error');
        return;
      }

      if(button){
        button.disabled=true;
        button.classList.add('is-loading');
        if(label) label.textContent='Sending Request'; else button.textContent='Sending Request...';
      }

      try{
        const { error } = await client.from('leads').insert(payload);
        if(error) throw error;
        form.reset();
        setStatus('✓ Request delivered successfully. We will contact you shortly.','ok');
        showSuccessModal(payload.full_name);
      }catch(error){
        console.error('Estimate request error:',error);
        setStatus('We could not send the request. Please call 760-234-8306 and we will help you directly.','error');
      }finally{
        if(button){
          button.disabled=false;
          button.classList.remove('is-loading');
          if(label) label.textContent=originalLabel; else button.textContent=originalLabel;
        }
      }
    });
  });
})();
