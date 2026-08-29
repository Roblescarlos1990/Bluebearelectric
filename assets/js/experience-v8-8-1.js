(function () {
  const $ = (s) => document.querySelector(s),
    $$ = (s) => Array.from(document.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const boot = $('[data-vf-boot]'),
    status = $('[data-vf-boot-status]'),
    progress = $('[data-vf-boot-progress]');
  const steps = [
    ['Securing workspace', 28],
    ['Connecting company data', 54],
    ['Loading operations intelligence', 78],
    ['Workspace ready', 100],
  ];
  let i = 0;
  function advance() {
    if (!boot) return;
    const step = steps[i++];
    if (step) {
      if (status) status.textContent = step[0];
      if (progress) progress.style.width = step[1] + '%';
      setTimeout(advance, reduced ? 60 : 210);
    } else setTimeout(() => boot.classList.add('is-hidden'), reduced ? 30 : 260);
  }
  addEventListener('DOMContentLoaded', () => setTimeout(advance, 100));
  setTimeout(() => boot?.classList.add('is-hidden'), 3200);

  // Always return to the workspace top when changing primary tabs.
  document.addEventListener(
    'click',
    (e) => {
      const tab = e.target.closest('.tab-btn[data-tab]');
      if (!tab) return;
      requestAnimationFrame(() =>
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }),
      );
    },
    true,
  );

  // Polished toast API.
  const stack = document.createElement('div');
  stack.className = 'vf-toast-stack';
  document.body.appendChild(stack);
  window.voltflowToast = function (title, message = '', duration = 4500) {
    const el = document.createElement('div');
    el.className = 'vf-toast';
    el.innerHTML = `<div><b>${title}</b>${message ? `<p>${message}</p>` : ''}</div><button type="button" aria-label="Dismiss">×</button>`;
    el.querySelector('button').onclick = () => el.remove();
    stack.appendChild(el);
    if (duration) setTimeout(() => el.remove(), duration);
  };

  // Welcome reveal only after the dashboard becomes visible.
  const dash = $('[data-admin-dashboard]');
  if (dash) {
    new MutationObserver(() => {
      if (getComputedStyle(dash).display !== 'none' && !dash.dataset.welcomed) {
        dash.dataset.welcomed = '1';
        window.scrollTo({ top: 0 });
        voltflowToast('Welcome to VoltFlow', 'Blue Bear Electric workspace is ready.');
      }
    }).observe(dash, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  // Compact review rotation.
  const reviews = $$('.review-compact'),
    dots = $('[data-review-dots]');
  if (reviews.length && dots) {
    let current = 0;
    reviews.forEach((_, n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Show review ${n + 1}`);
      b.onclick = () => show(n);
      dots.appendChild(b);
    });
    const dotButtons = Array.from(dots.children);
    function show(n) {
      current = n;
      reviews.forEach((r, j) => r.classList.toggle('active', j === n));
      dotButtons.forEach((b, j) => b.classList.toggle('active', j === n));
    }
    show(0);
    if (!reduced) setInterval(() => show((current + 1) % reviews.length), 6500);
  }

  // iOS-like restrained perspective on service imagery.
  const photos = $$(
    'body:not(.admin-only) .service-card img, .service-page img, .service-experience img, .about-strip img, .project-card img',
  );
  photos.forEach((img) => {
    img.classList.add('depth-photo');
    const host = img.closest('.service-card,.project-card,.photo-frame,.service-visual') || img;
    host.addEventListener('pointermove', (e) => {
      if (reduced || innerWidth < 850) return;
      const r = host.getBoundingClientRect(),
        x = (e.clientX - r.left) / r.width - 0.5,
        y = (e.clientY - r.top) / r.height - 0.5;
      img.style.setProperty('--ry', `${x * 5}deg`);
      img.style.setProperty('--rx', `${y * -4}deg`);
      img.style.setProperty('--tx', `${x * 3}px`);
      img.style.setProperty('--ty', `${y * 3}px`);
    });
    host.addEventListener('pointerleave', () =>
      ['--ry', '--rx', '--tx', '--ty'].forEach((v) => img.style.removeProperty(v)),
    );
  });
})();
