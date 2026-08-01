(() => {
  const config = window.VOLTFLOW_COMPANY || {};
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.style.setProperty(
    '--company-watermark-opacity',
    String(config.publicWatermarkOpacity || 0.06)
  );
  document.body.classList.add('blue-bear-branded');

  const isHomePage = /\/$|\/index\.html$/i.test(window.location.pathname);
  const introKey = 'blueBearIntroSeenV2';

  if (isHomePage && !reducedMotion && !sessionStorage.getItem(introKey)) {
    const intro = document.createElement('div');
    intro.className = 'bbe-site-intro bbe-cinematic-3d-intro';
    intro.setAttribute('aria-hidden', 'true');
    intro.setAttribute('role', 'presentation');
    intro.innerHTML = `
      <div class="bbe-cinema-bg" aria-hidden="true">
        <div class="bbe-grid-plane"></div>
        <div class="bbe-energy-vignette"></div>
        <div class="bbe-electric-ring ring-a"></div>
        <div class="bbe-electric-ring ring-b"></div>
        <div class="bbe-scene-sweep"></div>
      </div>
      <div class="bbe-logo-stage">
        <div class="bbe-logo-backlight"></div>
        <div class="bbe-logo-floor-glow"></div>
        <img
          src="${config.logoMark || 'assets/branding/blue-bear/logo-mark-solid.png'}"
          alt=""
          width="470"
          height="360"
          decoding="sync"
          fetchpriority="high"
        >
      </div>`;

    document.documentElement.classList.add('bbe-intro-active');
    document.body.prepend(intro);
    sessionStorage.setItem(introKey, '1');

    requestAnimationFrame(() => intro.classList.add('is-visible'));

    const dismiss = () => {
      if (intro.classList.contains('is-hidden')) return;
      intro.classList.add('is-hidden');
      document.documentElement.classList.remove('bbe-intro-active');
      window.setTimeout(() => intro.remove(), 600);
    };

    window.setTimeout(dismiss, 1900);
    window.setTimeout(() => {
      document.documentElement.classList.remove('bbe-intro-active');
      intro.remove();
    }, 2800);
  }

  document.querySelectorAll('img[alt*="Blue Bear" i], .brand img, .footer img').forEach((image) => {
    if (image.closest('.vf-boot, .vf-login-brand, .bbe-site-intro')) return;
    image.src = config.logoPrimary || image.src;
    image.decoding = 'async';
  });
})();
