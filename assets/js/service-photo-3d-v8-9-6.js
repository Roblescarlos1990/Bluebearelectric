(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.premium-service-layout img').forEach((img) => {
    if (
      img.closest('[data-bb3d-carousel]') ||
      img.closest('.brand') ||
      img.closest('footer') ||
      img.dataset.serviceEnhanced
    )
      return;
    img.dataset.serviceEnhanced = '1';
    const frame = img.parentElement;
    frame.classList.add('service-photo-3d');
    frame.tabIndex = 0;
    frame.addEventListener('pointermove', (e) => {
      if (reduced || innerWidth < 820) return;
      const r = frame.getBoundingClientRect(),
        x = (e.clientX - r.left) / r.width - 0.5,
        y = (e.clientY - r.top) / r.height - 0.5;
      img.style.setProperty('--photo-ry', `${x * 7}deg`);
      img.style.setProperty('--photo-rx', `${y * -5}deg`);
    });
    frame.addEventListener('pointerleave', () => {
      img.style.removeProperty('--photo-ry');
      img.style.removeProperty('--photo-rx');
    });
    const open = () => {
      const m = document.createElement('div');
      m.className = 'service-photo-lightbox';
      m.innerHTML = `<button type="button">×</button><img src="${img.currentSrc || img.src}" alt="${img.alt || 'Project photo'}" loading="eager" decoding="async">`;
      m.onclick = (e) => {
        if (e.target === m || e.target.tagName === 'BUTTON') m.remove();
      };
      document.body.appendChild(m);
    };
    frame.addEventListener('click', open);
    frame.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') open();
    });
  });
})();
