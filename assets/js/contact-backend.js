(function () {
  const forms = [...document.querySelectorAll('[data-lead-form]')];
  if (!forms.length) return;

  let securityConfig = { turnstileEnabled: false, turnstileSiteKey: null, geoMode: 'monitor' };
  let turnstileLoadPromise = null;

  async function loadSecurityConfig() {
    try {
      const response = await fetch('/api/security-config', {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) securityConfig = await response.json();
    } catch (error) {
      console.warn('Security configuration unavailable:', error);
    }
    return securityConfig;
  }

  function loadTurnstileScript() {
    if (window.turnstile) return Promise.resolve();
    if (turnstileLoadPromise) return turnstileLoadPromise;
    turnstileLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-voltflow-turnstile]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.voltflowTurnstile = '';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return turnstileLoadPromise;
  }

  function enhanceForm(form) {
    if (!form.querySelector('[name="company_website"]')) {
      const trap = document.createElement('div');
      trap.className = 'form-honeypot';
      trap.setAttribute('aria-hidden', 'true');
      trap.innerHTML =
        '<label>Company website<input name="company_website" tabindex="-1" autocomplete="off"></label>';
      form.prepend(trap);
    }
    let started = form.querySelector('[name="form_started_at"]');
    if (!started) {
      started = document.createElement('input');
      started.type = 'hidden';
      started.name = 'form_started_at';
      form.appendChild(started);
    }
    started.value = String(Date.now());
    if (!form.querySelector('[data-turnstile-slot]')) {
      const slot = document.createElement('div');
      slot.className = 'turnstile-slot';
      slot.dataset.turnstileSlot = '';
      const button = form.querySelector('button[type="submit"]');
      button?.before(slot);
    }
  }

  function showSuccessModal(name, reference) {
    document.querySelector('[data-estimate-success-modal]')?.remove();
    const modal = document.createElement('div');
    modal.className = 'estimate-success-modal';
    modal.dataset.estimateSuccessModal = '';
    modal.innerHTML = `<div class="estimate-success-card" role="dialog" aria-modal="true" aria-labelledby="estimate-success-title"><button class="success-close" type="button" aria-label="Close confirmation">×</button><div class="success-check" aria-hidden="true">✓</div><div class="eyebrow">Request Delivered</div><h2 id="estimate-success-title">Thank You${name ? `, ${name.split(' ')[0]}` : ''}!</h2><p>Your free estimate request has been securely received by Blue Bear Electric.</p>${reference ? `<p class="request-reference">Reference: <strong>${reference}</strong></p>` : ''}<p class="small">A team member will review the details and contact you to discuss the next step. For urgent service, call <a href="tel:7602348306">760-234-8306</a>.</p><div class="success-actions"><button class="btn yellow success-done" type="button">Done</button><a class="btn dark" href="tel:7602348306">Call Blue Bear Electric</a></div></div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));
    const close = () => {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 220);
    };
    modal.querySelector('.success-close').addEventListener('click', close);
    modal.querySelector('.success-done').addEventListener('click', close);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });
    document.addEventListener('keydown', function esc(event) {
      if (event.key === 'Escape') {
        close();
        document.removeEventListener('keydown', esc);
      }
    });
    modal.querySelector('.success-done').focus();
  }

  async function prepareTurnstile(form) {
    if (!securityConfig.turnstileEnabled || !securityConfig.turnstileSiteKey) return;
    const slot = form.querySelector('[data-turnstile-slot]');
    if (!slot || slot.dataset.widgetId) return;
    try {
      await loadTurnstileScript();
      const widgetId = window.turnstile.render(slot, {
        sitekey: securityConfig.turnstileSiteKey,
        theme: 'dark',
        size: 'flexible',
        'response-field': false,
      });
      slot.dataset.widgetId = String(widgetId);
    } catch (error) {
      console.error('Turnstile failed to load:', error);
      slot.innerHTML =
        '<p class="form-status error">Security verification could not load. Please refresh or call 760-234-8306.</p>';
    }
  }

  loadSecurityConfig().then(() => forms.forEach(prepareTurnstile));

  forms.forEach((form) => {
    enhanceForm(form);
    const status =
      form.querySelector('[data-form-status]') || document.querySelector('[data-form-status]');
    const button = form.querySelector('button[type="submit"]');
    const label = button?.querySelector('.btn-label');
    const originalLabel = label?.textContent || button?.textContent || 'Send My Estimate Request';
    const setStatus = (message, type = '') => {
      if (status) {
        status.textContent = message;
        status.className = `form-status ${type}`.trim();
      }
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus('');
      const fd = new FormData(form);
      const slot = form.querySelector('[data-turnstile-slot]');
      const widgetId = slot?.dataset.widgetId;
      const turnstileToken =
        securityConfig.turnstileEnabled && window.turnstile && widgetId !== undefined
          ? window.turnstile.getResponse(widgetId)
          : '';
      if (securityConfig.turnstileEnabled && !turnstileToken) {
        setStatus('Please complete the security verification.', 'error');
        return;
      }
      const payload = {
        full_name: String(fd.get('full_name') || '').trim(),
        phone: String(fd.get('phone') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        city: String(fd.get('city') || '').trim(),
        service_type: String(fd.get('service_type') || '').trim(),
        urgency: String(fd.get('urgency') || 'Normal').trim(),
        message: String(fd.get('message') || '').trim(),
        company_website: String(fd.get('company_website') || ''),
        form_started_at: Number(fd.get('form_started_at') || 0),
        turnstile_token: turnstileToken,
      };
      if (!payload.full_name || !payload.phone || !payload.service_type) {
        setStatus('Please complete your name, phone number, and service needed.', 'error');
        form
          .querySelector(
            '[name="full_name"]:invalid,[name="phone"]:invalid,[name="service_type"]:invalid',
          )
          ?.focus();
        return;
      }
      if (button) {
        button.disabled = true;
        button.classList.add('is-loading');
        if (label) label.textContent = 'Securely Sending';
        else button.textContent = 'Securely Sending...';
      }
      try {
        const response = await fetch('/api/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response
          .json()
          .catch(() => ({ ok: false, message: 'Unexpected response.' }));
        if (!response.ok || !result.ok)
          throw Object.assign(new Error(result.message || 'Request failed.'), {
            status: response.status,
          });
        form.reset();
        form.querySelector('[name="form_started_at"]').value = String(Date.now());
        if (window.turnstile && widgetId !== undefined) window.turnstile.reset(widgetId);
        setStatus('✓ Request delivered securely. We will contact you shortly.', 'ok');
        showSuccessModal(payload.full_name, result.reference);
      } catch (error) {
        console.error('Secure estimate request error:', error);
        const message =
          error.status === 429
            ? 'We received several recent requests. Please wait a few minutes or call 760-234-8306.'
            : error.message || 'We could not send the request. Please call 760-234-8306.';
        setStatus(message, 'error');
        if (window.turnstile && widgetId !== undefined) window.turnstile.reset(widgetId);
      } finally {
        if (button) {
          button.disabled = false;
          button.classList.remove('is-loading');
          if (label) label.textContent = originalLabel;
          else button.textContent = originalLabel;
        }
      }
    });
  });
})();
