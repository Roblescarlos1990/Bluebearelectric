
(function(){
  const cfg = window.VOLTFLOW_COMPANY || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.style.setProperty('--company-watermark-opacity', String(cfg.publicWatermarkOpacity || .06));
  document.body.classList.add('blue-bear-branded');

  const isHome = /\/$|\/index\.html$/i.test(location.pathname);
  const seen = sessionStorage.getItem('blueBearIntroSeen');

  function tryPlayIntroAudio(overlay){
    if (reduced) return;
    let started = false;
    const run = ()=>{
      if (started) return;
      started = true;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const master = ctx.createGain();
        master.gain.value = 0.045;
        master.connect(ctx.destination);

        const now = ctx.currentTime;

        function noiseBuffer(seconds=2.5){
          const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
          const buf = ctx.createBuffer(1, len, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i=0;i<len;i++) data[i] = Math.random() * 2 - 1;
          return buf;
        }

        // Thunder bed
        const thunderSrc = ctx.createBufferSource();
        thunderSrc.buffer = noiseBuffer(3.6);
        const thunderFilter = ctx.createBiquadFilter();
        thunderFilter.type = 'lowpass';
        thunderFilter.frequency.value = 180;
        const thunderGain = ctx.createGain();
        thunderGain.gain.setValueAtTime(0.0001, now);
        thunderGain.gain.exponentialRampToValueAtTime(0.09, now + 0.22);
        thunderGain.gain.exponentialRampToValueAtTime(0.03, now + 1.3);
        thunderGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.1);
        thunderSrc.connect(thunderFilter); thunderFilter.connect(thunderGain); thunderGain.connect(master); thunderSrc.start(now);

        // Electrical crackle accents
        for (let i=0;i<4;i++){
          const src = ctx.createBufferSource();
          src.buffer = noiseBuffer(.16);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 1400 + i * 350;
          const g = ctx.createGain();
          const t = now + .28 + i * .26;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.028, t + .012);
          g.gain.exponentialRampToValueAtTime(0.0001, t + .14);
          src.connect(bp); bp.connect(g); g.connect(master); src.start(t);
        }

        // Roar-like low sweep
        const roarOsc = ctx.createOscillator();
        roarOsc.type = 'sawtooth';
        const roarFilter = ctx.createBiquadFilter();
        roarFilter.type = 'lowpass';
        roarFilter.frequency.value = 280;
        const roarGain = ctx.createGain();
        roarOsc.frequency.setValueAtTime(118, now + .1);
        roarOsc.frequency.exponentialRampToValueAtTime(72, now + .75);
        roarGain.gain.setValueAtTime(0.0001, now + .05);
        roarGain.gain.exponentialRampToValueAtTime(0.026, now + .28);
        roarGain.gain.exponentialRampToValueAtTime(0.015, now + .7);
        roarGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
        roarOsc.connect(roarFilter); roarFilter.connect(roarGain); roarGain.connect(master); roarOsc.start(now + .06); roarOsc.stop(now + 1.1);

        setTimeout(()=>{ try { ctx.close(); } catch(e){} }, 3400);
      } catch (err) {}
    };

    // attempt autoplay, with graceful fallback to first interaction if blocked
    run();
    ['pointerdown','pointermove','keydown','touchstart'].forEach(evt=>{
      window.addEventListener(evt, run, {once:true, passive:true});
    });
  }

  if (isHome && !seen) {
    const splash = document.createElement('div');
    splash.className = 'bbe-site-intro bbe-cinematic-3d-intro';
    splash.setAttribute('aria-live', 'polite');
    splash.innerHTML = `
      <div class="bbe-cinema-bg">
        <div class="bbe-grid-plane"></div>
        <div class="bbe-energy-vignette"></div>
        <div class="bbe-transmission-field">
          <span class="bbe-tower tower-a"></span>
          <span class="bbe-tower tower-b"></span>
          <span class="bbe-wire wire-a"></span>
          <span class="bbe-wire wire-b"></span>
          <span class="bbe-wire wire-c"></span>
        </div>
        <div class="bbe-electric-ring ring-a"></div>
        <div class="bbe-electric-ring ring-b"></div>
        <div class="bbe-electric-strike strike-a"></div>
        <div class="bbe-electric-strike strike-b"></div>
        <div class="bbe-premium-flash flash-a"></div>
        <div class="bbe-premium-flash flash-b"></div>
        <div class="bbe-premium-flash flash-c"></div>
        <div class="bbe-voltage-streak streak-a"></div>
        <div class="bbe-voltage-streak streak-b"></div>
        <div class="bbe-particles" data-bbe-particles></div>
      </div>
      <div class="bbe-logo-stage" data-bbe-logo-stage>
        <div class="bbe-logo-backlight"></div>
        <div class="bbe-logo-floor-glow"></div>
        <img src="assets/branding/blue-bear/logo-cinematic-wide.png" alt="${cfg.companyName || 'Blue Bear Electric'}">
      </div>
      <div class="bbe-intro-footer">
        <div class="bbe-loader-label">Powering up Blue Bear Electric</div>
        <div class="bbe-intro-bar"><span data-bbe-intro-progress></span></div>
        <div class="bbe-loader-percent" data-bbe-intro-percent>0%</div>
      </div>`;
    document.body.prepend(splash);
    sessionStorage.setItem('blueBearIntroSeen', '1');

    const stage = splash.querySelector('[data-bbe-logo-stage]');
    const particles = splash.querySelector('[data-bbe-particles]');
    const bar = splash.querySelector('[data-bbe-intro-progress]');
    const pct = splash.querySelector('[data-bbe-intro-percent]');

    for (let i = 0; i < 42; i++) {
      const p = document.createElement('span');
      p.style.setProperty('--x', `${Math.random() * 100}%`);
      p.style.setProperty('--y', `${50 + Math.random() * 40}%`);
      p.style.setProperty('--d', `${2.2 + Math.random() * 3.2}s`);
      p.style.setProperty('--delay', `${Math.random() * 2.5}s`);
      p.style.setProperty('--size', `${1 + Math.random() * 3.4}px`);
      particles.appendChild(p);
    }

    const setPointer = (clientX, clientY) => {
      const r = splash.getBoundingClientRect();
      const x = (clientX - r.left) / r.width - 0.5;
      const y = (clientY - r.top) / r.height - 0.5;
      stage.style.setProperty('--intro-ry', `${x * 10}deg`);
      stage.style.setProperty('--intro-rx', `${y * -7}deg`);
      stage.style.setProperty('--intro-x', `${x * 18}px`);
      stage.style.setProperty('--intro-y', `${y * 14}px`);
      stage.style.setProperty('--intro-scale', `${1.01 + Math.abs(x) * .02}`);
      splash.style.setProperty('--light-x', `${(x + .5) * 100}%`);
      splash.style.setProperty('--light-y', `${(y + .5) * 100}%`);
    };

    splash.addEventListener('pointermove', e => {
      if (reduced || innerWidth < 760) return;
      setPointer(e.clientX, e.clientY);
    });
    splash.addEventListener('pointerleave', () => {
      ['--intro-ry','--intro-rx','--intro-x','--intro-y','--intro-scale'].forEach(v => stage.style.removeProperty(v));
    });

    tryPlayIntroAudio(splash);

    const start = performance.now();
    const duration = reduced ? 120 : 3500;
    function tick(now) {
      const raw = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - raw, 3);
      const value = Math.round(eased * 100);
      if (bar) bar.style.width = value + '%';
      if (pct) pct.textContent = value + '%';
      if (raw < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    const hide = () => setTimeout(() => splash.classList.add('is-hidden'), reduced ? 120 : 3500);
    if (document.readyState === 'complete') hide(); else addEventListener('load', hide, { once: true });
    setTimeout(() => splash.classList.add('is-hidden'), 4300);
    setTimeout(() => splash.remove(), 5100);
  }

  document.querySelectorAll('img[alt*="Blue Bear" i], .brand img, .footer img').forEach(img => {
    if (!img.closest('.vf-boot') && !img.closest('.vf-login-brand') && !img.closest('.bbe-site-intro')) {
      img.src = cfg.logoPrimary || img.src;
    }
  });
})();
