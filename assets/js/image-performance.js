(function () {
  const manifestUrl = 'assets/data/image-variants.json';
  let metadata = null;

  function imageSizes(image) {
    if (image.dataset.imageSizes) return image.dataset.imageSizes;
    if (image.closest('.brand, .portal-brand, .brand-logo-mobile')) return '160px';
    if (image.closest('footer')) return '180px';
    if (image.closest('.project-card, .premium-project-card, .service-card')) {
      return '(max-width: 720px) calc(100vw - 40px), 25vw';
    }
    if (image.closest('[data-bb3d-thumbs], [data-home-thumbs]')) return '96px';
    return '(max-width: 720px) calc(100vw - 40px), min(50vw, 960px)';
  }

  function isPriority(image) {
    return image.dataset.imagePriority === 'high' || image.fetchPriority === 'high';
  }

  function enhanceImage(image) {
    if (!(image instanceof HTMLImageElement)) return;
    if (image.dataset.fallbackSrc && !image.dataset.fallbackReady) {
      image.dataset.fallbackReady = 'true';
      const loadFallback = () => {
        const fallback = image.dataset.fallbackSrc;
        if (!fallback || image.getAttribute('src') === fallback) return;
        image.removeAttribute('srcset');
        image.removeAttribute('sizes');
        image.src = fallback;
      };
      image.addEventListener('error', loadFallback);
      if (image.complete && !image.naturalWidth) loadFallback();
    }
    const source = image.getAttribute('src') || '';
    image.decoding = 'async';
    if (!source.startsWith('assets/')) {
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
      if (isPriority(image)) {
        image.loading = 'eager';
        image.fetchPriority = 'high';
      } else if (!image.hasAttribute('loading')) {
        image.loading = 'lazy';
      }
      return;
    }

    const details = metadata?.[source];
    if (details) {
      if (!image.hasAttribute('width')) image.width = details.width;
      if (!image.hasAttribute('height')) image.height = details.height;
      const webp = details.variants.filter((variant) => variant.format === 'webp');
      if (webp.length) {
        image.srcset = webp.map((variant) => `${variant.path} ${variant.width}w`).join(', ');
        image.sizes = imageSizes(image);
      }
    }

    if (isPriority(image)) {
      image.loading = 'eager';
      image.fetchPriority = 'high';
    } else if (!image.hasAttribute('loading')) {
      image.loading = image.closest('header') ? 'eager' : 'lazy';
    }
  }

  function enhance(root = document) {
    if (root instanceof HTMLImageElement) enhanceImage(root);
    root.querySelectorAll?.('img').forEach(enhanceImage);
  }

  const ready = fetch(manifestUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Image metadata returned ${response.status}.`);
      return response.json();
    })
    .then((manifest) => {
      metadata = manifest.images || {};
      enhance();
      return metadata;
    })
    .catch((error) => {
      console.warn('Responsive image metadata unavailable:', error);
      return {};
    });

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === 'attributes') enhanceImage(record.target);
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) enhance(node);
      });
    });
  });
  observer.observe(document.documentElement, {
    attributeFilter: ['src'],
    attributes: true,
    childList: true,
    subtree: true,
  });

  window.BLUE_BEAR_IMAGES = { enhance, ready };
})();
