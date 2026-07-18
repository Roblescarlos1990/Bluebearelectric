(function(){
  const cfg=window.VOLTFLOW_COMPANY||{};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=s=>document.querySelector(s);

  document.documentElement.style.setProperty('--company-watermark-opacity',String(cfg.publicWatermarkOpacity||.06));
  document.body.classList.add('blue-bear-branded');

  // Public loading experience only on the homepage and only once per session.
  const isHome=/\/$|\/index\.html$/i.test(location.pathname);
  const seen=sessionStorage.getItem('blueBearIntroSeen');
  if(isHome&&!seen){
    const splash=document.createElement('div');
    splash.className='bbe-site-intro';
    splash.setAttribute('aria-live','polite');
    splash.innerHTML=`
      <div class="bbe-cinematic-scene" aria-hidden="true"></div>
      <div class="bbe-cinematic-overlay"></div>
      <div class="bbe-cinematic-loader">
        <div class="bbe-loader-label">Initializing Blue Bear Electric</div>
        <div class="bbe-intro-bar"><span data-bbe-intro-progress></span></div>
        <div class="bbe-loader-percent" data-bbe-intro-percent>0%</div>
      </div>`;
    document.body.prepend(splash);
    sessionStorage.setItem('blueBearIntroSeen','1');
    const progressBar=splash.querySelector('[data-bbe-intro-progress]');
    const progressText=splash.querySelector('[data-bbe-intro-percent]');
    const started=performance.now();
    const duration=reduced?80:2350;
    function animateProgress(now){
      const elapsed=now-started;
      const raw=Math.min(1,elapsed/duration);
      const eased=1-Math.pow(1-raw,3);
      const value=Math.round(eased*100);
      if(progressBar)progressBar.style.width=value+'%';
      if(progressText)progressText.textContent=value+'%';
      if(raw<1)requestAnimationFrame(animateProgress);
    }
    requestAnimationFrame(animateProgress);
    
    const ready=()=>setTimeout(()=>splash.classList.add('is-hidden'),reduced?60:2450);
    if(document.readyState==='complete')ready();else addEventListener('load',ready,{once:true});
    setTimeout(()=>splash.classList.add('is-hidden'),3100);
    setTimeout(()=>splash.remove(),3800);
  }

  // Replace any legacy site logo with the current company mark.
  document.querySelectorAll('img[alt*="Blue Bear" i], .brand img, .footer img').forEach(img=>{
    if(!img.closest('.vf-boot')&&!img.closest('.vf-login-brand')){
      img.src=cfg.logoPrimary||img.src;
      img.loading=img.loading||'eager';
    }
  });
})();