(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const escapeHTML = (v) =>
    String(v ?? '').replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );

  async function createCarousel(root) {
    let items = [];
    try {
      items = JSON.parse(root.dataset.items || '[]');
    } catch (e) {
      console.error('Invalid carousel data', e);
    }
    const page = root.dataset.page,
      section = root.dataset.section || 'service-gallery',
      key = root.dataset.carouselKey || 'hero';
    if (page && window.supabase && window.BLUE_BEAR_SUPABASE_URL && window.BLUE_BEAR_SUPABASE_KEY) {
      try {
        const c = window.supabase.createClient(
          window.BLUE_BEAR_SUPABASE_URL,
          window.BLUE_BEAR_SUPABASE_KEY,
        );
        const r = await c
          .from('website_carousel_items')
          .select('*')
          .eq('tenant_key', 'blue-bear-electric')
          .eq('page_key', page)
          .eq('section_key', section)
          .eq('carousel_key', key)
          .eq('is_published', true)
          .order('display_order');
        if (!r.error && r.data?.length)
          items = r.data.map((x) => ({
            src: x.public_url,
            title: x.title,
            caption: x.caption || x.alt_text || '',
            alt: x.alt_text || x.title,
          }));
      } catch (e) {
        console.warn('Managed carousel fallback', e);
      }
    }
    if (!items.length) return;
    let active = 0,
      timer = null,
      startX = 0,
      dragging = false;
    root.innerHTML = `
      <div class="bb3d-stage" data-bb3d-stage></div>
      <button class="bb3d-arrow bb3d-prev" type="button" aria-label="Previous image">‹</button>
      <button class="bb3d-arrow bb3d-next" type="button" aria-label="Next image">›</button>
      <div class="bb3d-copy"><div class="eyebrow" data-bb3d-count></div><h2 data-bb3d-title></h2><p data-bb3d-caption></p></div>
      <div class="bb3d-thumbs" data-bb3d-thumbs></div>`;
    const stage = root.querySelector('[data-bb3d-stage]');
    const thumbs = root.querySelector('[data-bb3d-thumbs]');
    const title = root.querySelector('[data-bb3d-title]');
    const caption = root.querySelector('[data-bb3d-caption]');
    const count = root.querySelector('[data-bb3d-count]');

    items.forEach((item, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'bb3d-card';
      card.dataset.index = index;
      card.innerHTML = `<img src="${escapeHTML(item.src)}" alt="${escapeHTML(item.alt || item.title || 'Project image')}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async"${index === 0 ? ' fetchpriority="high" data-image-priority="high"' : ''}><span class="bb3d-shine"></span>`;
      card.onclick = () => {
        if (index === active) openLightbox(item);
        else go(index);
      };
      stage.appendChild(card);
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'bb3d-thumb';
      thumb.dataset.index = index;
      thumb.innerHTML = `<img src="${escapeHTML(item.src)}" alt="" loading="lazy" decoding="async" data-image-sizes="96px"><span>${index + 1}</span>`;
      thumb.onclick = () => go(index);
      thumbs.appendChild(thumb);
    });
    const cards = [...stage.children],
      thumbBtns = [...thumbs.children];

    function relativeIndex(i) {
      let d = i - active;
      if (d > items.length / 2) d -= items.length;
      if (d < -items.length / 2) d += items.length;
      return d;
    }
    function render() {
      cards.forEach((card, i) => {
        const d = relativeIndex(i);
        card.dataset.position = d;
        card.classList.toggle('is-active', d === 0);
        card.style.setProperty('--offset', d);
        card.style.zIndex = 100 - Math.abs(d);
        card.setAttribute('aria-hidden', Math.abs(d) > 2 ? 'true' : 'false');
      });
      thumbBtns.forEach((b, i) => b.classList.toggle('active', i === active));
      title.textContent = items[active].title || 'Project Image';
      caption.textContent = items[active].caption || '';
      count.textContent = `Image ${active + 1} of ${items.length}`;
      resetAuto();
    }
    function go(index) {
      active = (index + items.length) % items.length;
      render();
    }
    function next() {
      go(active + 1);
    }
    function prev() {
      go(active - 1);
    }
    root.querySelector('.bb3d-next').onclick = next;
    root.querySelector('.bb3d-prev').onclick = prev;

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Enter') openLightbox(items[active]);
    });
    root.tabIndex = 0;

    root.addEventListener('pointerdown', (e) => {
      dragging = true;
      startX = e.clientX;
      root.setPointerCapture?.(e.pointerId);
    });
    root.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 42) (dx < 0 ? next : prev)();
    });
    root.addEventListener('pointercancel', () => (dragging = false));
    root.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
          e.preventDefault();
          e.deltaX + e.deltaY > 0 ? next() : prev();
        }
      },
      { passive: false },
    );

    root.addEventListener('pointermove', (e) => {
      if (reduced || innerWidth < 860) return;
      const r = root.getBoundingClientRect();
      const x = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
      const y = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
      root.style.setProperty('--scene-ry', `${x * 3.5}deg`);
      root.style.setProperty('--scene-rx', `${y * -2.5}deg`);
      root.style.setProperty('--light-x', `${(x + 0.5) * 100}%`);
      root.style.setProperty('--light-y', `${(y + 0.5) * 100}%`);
    });
    root.addEventListener('pointerleave', () => {
      root.style.removeProperty('--scene-ry');
      root.style.removeProperty('--scene-rx');
    });
    function resetAuto() {
      clearInterval(timer);
      if (root.dataset.autoplay === 'true' && !reduced) timer = setInterval(next, 6500);
    }
    function openLightbox(item) {
      const modal = document.createElement('div');
      modal.className = 'bb3d-lightbox';
      modal.innerHTML = `<button type="button" aria-label="Close">×</button><img src="${escapeHTML(item.src)}" alt="${escapeHTML(item.alt || item.title || 'Project image')}" loading="eager" decoding="async"><div><h2>${escapeHTML(item.title)}</h2><p>${escapeHTML(item.caption || '')}</p></div>`;
      modal.onclick = (e) => {
        if (e.target === modal || e.target.tagName === 'BUTTON') modal.remove();
      };
      document.body.appendChild(modal);
    }
    render();
  }

  document.querySelectorAll('[data-bb3d-carousel]').forEach((root) => createCarousel(root));
})();
