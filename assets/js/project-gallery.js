(function () {
  const gallery = document.querySelector('[data-project-gallery]');
  if (!gallery) return;
  const lightbox = document.querySelector('[data-project-lightbox]');
  const title = lightbox?.querySelector('[data-lightbox-title]');
  const service = lightbox?.querySelector('[data-lightbox-service]');
  const location = lightbox?.querySelector('[data-lightbox-location]');
  const description = lightbox?.querySelector('[data-lightbox-description]');
  const image = lightbox?.querySelector('[data-lightbox-image]');
  const capabilities = lightbox?.querySelector('[data-lightbox-capabilities]');
  let lastTrigger = null;

  const cards = () => [...gallery.querySelectorAll('.premium-project-card')];
  const filters = () => [...gallery.querySelectorAll('[data-filter]')];
  const applyFilter = (value) =>
    cards().forEach((card, index) => {
      const categories = (card.dataset.category || '').split(/\s+/);
      const show = value === 'all' || categories.includes(value);
      card.classList.toggle('is-hidden', !show);
      if (show) {
        card.style.setProperty('--gallery-delay', `${Math.min(index * 45, 360)}ms`);
        requestAnimationFrame(() => card.classList.add('gallery-visible'));
      } else card.classList.remove('gallery-visible');
    });
  gallery.addEventListener('click', (event) => {
    const filter = event.target.closest('[data-filter]');
    if (filter) {
      filters().forEach((item) => item.classList.toggle('active', item === filter));
      applyFilter(filter.dataset.filter);
      return;
    }
    const trigger = event.target.closest('.project-open');
    if (trigger) {
      const card = trigger.closest('.premium-project-card');
      if (card) openLightbox(card, trigger);
    }
  });
  function openLightbox(card, trigger) {
    if (!lightbox) return;
    lastTrigger = trigger;
    title.textContent = card.dataset.title || card.querySelector('h3')?.textContent || '';
    service.textContent = card.dataset.service || card.dataset.category || '';
    location.textContent = card.dataset.location || '';
    description.textContent =
      card.dataset.description || card.querySelector('.project-meta p')?.textContent || '';
    image.src = card.dataset.image || card.querySelector('img')?.src || '';
    image.alt = title.textContent || 'Project image';
    capabilities.innerHTML = '';
    (card.dataset.capabilities || '')
      .split('|')
      .filter(Boolean)
      .forEach((item) => {
        const span = document.createElement('span');
        span.textContent = `✓ ${item}`;
        capabilities.appendChild(span);
      });
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    requestAnimationFrame(() => lightbox.classList.add('open'));
    lightbox.querySelector('.lightbox-close')?.focus();
  }
  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    setTimeout(() => {
      lightbox.hidden = true;
      lastTrigger?.focus();
    }, 220);
  }
  lightbox
    ?.querySelectorAll('[data-lightbox-close]')
    .forEach((btn) => btn.addEventListener('click', closeLightbox));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });
  applyFilter('all');
  new MutationObserver(() =>
    applyFilter(gallery.querySelector('[data-filter].active')?.dataset.filter || 'all'),
  ).observe(gallery, { childList: true, subtree: true });
})();
