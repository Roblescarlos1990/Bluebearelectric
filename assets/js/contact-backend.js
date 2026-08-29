(function () {
  const forms = [...document.querySelectorAll('[data-lead-form]')];
  if (!forms.length) return;

  let securityConfig = { turnstileEnabled: false, turnstileSiteKey: null, geoMode: 'monitor' };
  let turnstileLoadPromise = null;
  const fieldLabels = {
    full_name: 'Full name',
    phone: 'Phone number',
    email: 'Email address',
    city: 'City or service area',
    service_type: 'Service needed',
    urgency: 'Preferred timeframe',
    message: 'Project details',
  };

  function escapeHtml(value) {
    return String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
    );
  }

  function getFieldError(field) {
    if (field.validity.valueMissing) {
      return field.name === 'service_type'
        ? 'Choose the service you need.'
        : `Enter your ${fieldLabels[field.name].toLowerCase()}.`;
    }
    if (field.validity.typeMismatch && field.name === 'email') {
      return 'Enter an email address in the format name@example.com.';
    }
    return '';
  }

  function setFieldError(form, field, message) {
    const error = form.querySelector(`[data-field-error="${field.name}"]`);
    field.toggleAttribute('aria-invalid', Boolean(message));
    if (message) field.setAttribute('aria-invalid', 'true');
    if (error) error.textContent = message;
  }

  function hideErrorSummary(form) {
    const summary = form.querySelector('[data-form-error-summary]');
    if (summary) summary.hidden = true;
  }

  function showErrorSummary(form, errors) {
    const summary = form.querySelector('[data-form-error-summary]');
    const list = summary?.querySelector('[data-form-error-list]');
    if (!summary || !list) return;
    list.replaceChildren();
    errors.forEach(({ field, message }) => {
      const item = document.createElement('li');
      if (field?.id) {
        const link = document.createElement('a');
        link.href = `#${field.id}`;
        link.textContent = message;
        link.addEventListener('click', (event) => {
          event.preventDefault();
          field.focus();
        });
        item.appendChild(link);
      } else {
        item.textContent = message;
      }
      list.appendChild(item);
    });
    summary.hidden = false;
    summary.focus();
  }

  function validateForm(form) {
    const fields = [
      ...form.querySelectorAll(
        'input:not([type="hidden"]):not([name="company_website"]), select, textarea',
      ),
    ];
    const errors = [];
    fields.forEach((field) => {
      const message = getFieldError(field);
      setFieldError(form, field, message);
      if (message) errors.push({ field, message });
    });
    return errors;
  }

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

  function showSuccessModal(name, reference, returnFocusTo) {
    document.querySelector('[data-estimate-success-modal]')?.remove();
    const trigger = returnFocusTo || document.activeElement;
    const firstName = escapeHtml(name ? name.split(' ')[0] : '');
    const safeReference = escapeHtml(reference || '');
    const modal = document.createElement('div');
    modal.className = 'estimate-success-modal';
    modal.dataset.estimateSuccessModal = '';
    modal.innerHTML = `<div class="estimate-success-card" role="dialog" aria-modal="true" aria-labelledby="estimate-success-title" aria-describedby="estimate-success-description"><button class="success-close" type="button" aria-label="Close confirmation">×</button><div class="success-check" aria-hidden="true">✓</div><div class="eyebrow">Request Delivered</div><h2 id="estimate-success-title">Thank You${firstName ? `, ${firstName}` : ''}!</h2><p id="estimate-success-description">Your free estimate request has been securely received by Blue Bear Electric.</p>${safeReference ? `<p class="request-reference">Reference: <strong>${safeReference}</strong></p>` : ''}<p class="small">A team member will review the details and contact you to discuss the next step. For urgent service, call <a href="tel:7602348306">760-234-8306</a>.</p><div class="success-actions"><button class="btn yellow success-done" type="button">Done</button><a class="btn dark" href="tel:7602348306">Call Blue Bear Electric</a></div></div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => {
      modal.classList.add('open');
      modal.querySelector('.success-done').focus();
    });
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      modal.classList.remove('open');
      document.removeEventListener('keydown', handleModalKeydown);
      setTimeout(() => {
        modal.remove();
        if (trigger instanceof HTMLElement) trigger.focus();
      }, 220);
    };
    const handleModalKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [
        ...modal.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    modal.querySelector('.success-close').addEventListener('click', close);
    modal.querySelector('.success-done').addEventListener('click', close);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });
    document.addEventListener('keydown', handleModalKeydown);
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
        status.setAttribute('role', type === 'error' ? 'alert' : 'status');
        status.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
      }
    };
    let nativeValidationSummaryPending = false;
    form.addEventListener(
      'invalid',
      (event) => {
        event.preventDefault();
        if (nativeValidationSummaryPending) return;
        nativeValidationSummaryPending = true;
        queueMicrotask(() => {
          nativeValidationSummaryPending = false;
          const validationErrors = validateForm(form);
          if (!validationErrors.length) return;
          setStatus('Review the highlighted fields and try again.', 'error');
          showErrorSummary(form, validationErrors);
        });
      },
      true,
    );

    form
      .querySelectorAll(
        'input:not([type="hidden"]):not([name="company_website"]), select, textarea',
      )
      .forEach((field) => {
        const reviewField = () => {
          const message = getFieldError(field);
          setFieldError(form, field, message);
        };
        field.addEventListener('blur', reviewField);
        field.addEventListener(field.matches('select') ? 'change' : 'input', () => {
          if (field.hasAttribute('aria-invalid')) reviewField();
          hideErrorSummary(form);
        });
      });

    form.addEventListener(
      'pointerdown',
      (event) => {
        const submitter = event.target.closest('button[type="submit"]');
        if (!submitter || !form.contains(submitter)) return;
        const validationErrors = validateForm(form);
        if (!validationErrors.length) return;
        event.preventDefault();
        setStatus('Review the highlighted fields and try again.', 'error');
        showErrorSummary(form, validationErrors);
      },
      { capture: true },
    );
    form.addEventListener(
      'click',
      (event) => {
        const submitter = event.target.closest('button[type="submit"]');
        if (!submitter || !form.contains(submitter)) return;
        event.preventDefault();
        form.dispatchEvent(
          new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter }),
        );
      },
      { capture: true },
    );
    form.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || !event.target.matches('input:not([type="hidden"])')) return;
      event.preventDefault();
      button?.click();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus('');
      hideErrorSummary(form);
      const validationErrors = validateForm(form);
      if (validationErrors.length) {
        setStatus('Review the highlighted fields and try again.', 'error');
        showErrorSummary(form, validationErrors);
        return;
      }
      const fd = new FormData(form);
      const slot = form.querySelector('[data-turnstile-slot]');
      const widgetId = slot?.dataset.widgetId;
      const turnstileToken =
        securityConfig.turnstileEnabled && window.turnstile && widgetId !== undefined
          ? window.turnstile.getResponse(widgetId)
          : '';
      if (securityConfig.turnstileEnabled && !turnstileToken) {
        setStatus('Please complete the security verification.', 'error');
        showErrorSummary(form, [{ message: 'Complete the security verification.' }]);
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
      if (button) {
        button.disabled = true;
        button.classList.add('is-loading');
        if (label) label.textContent = 'Securely Sending';
        else button.textContent = 'Securely Sending...';
      }
      form.setAttribute('aria-busy', 'true');
      setStatus('Sending your request securely.');
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
        showSuccessModal(payload.full_name, result.reference, button);
      } catch (error) {
        console.error('Secure estimate request error:', error);
        const message =
          error.status === 429
            ? 'We received several recent requests. Please wait a few minutes or call 760-234-8306.'
            : error.message || 'We could not send the request. Please call 760-234-8306.';
        setStatus(message, 'error');
        showErrorSummary(form, [{ message }]);
        if (window.turnstile && widgetId !== undefined) window.turnstile.reset(widgetId);
      } finally {
        form.setAttribute('aria-busy', 'false');
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
