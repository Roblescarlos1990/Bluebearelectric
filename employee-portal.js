(function(){
  const form = document.querySelector('[data-lead-form]');
  const status = document.querySelector('[data-form-status]');
  if(!form || !window.supabase) return;
  const client = window.supabase.createClient(window.BLUE_BEAR_SUPABASE_URL, window.BLUE_BEAR_SUPABASE_KEY);
  const setStatus = (msg, ok=false) => { if(status){ status.textContent = msg; status.className = ok ? 'form-status ok' : 'form-status error'; } };
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
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
    if(!payload.full_name || !payload.phone || !payload.service_type){ setStatus('Please enter name, phone, and service needed.'); return; }
    const btn = form.querySelector('button[type="submit"]');
    if(btn){ btn.disabled = true; btn.textContent = 'Sending...'; }
    const { error } = await client.from('leads').insert(payload);
    if(error){ console.error(error); setStatus('Request could not be sent. Please call 760-234-8306.'); }
    else { form.reset(); setStatus('Request sent. Blue Bear Electric will follow up shortly.', true); }
    if(btn){ btn.disabled = false; btn.textContent = 'Submit Request'; }
  });
})();
