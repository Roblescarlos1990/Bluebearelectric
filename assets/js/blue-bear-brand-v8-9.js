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
      <div class="bbe-intro-grid"></div>
      <div class="bbe-intro-core">
        <img src="${cfg.logoPrimary||'assets/branding/blue-bear/logo-primary.png'}" alt="${cfg.companyName||'Blue Bear Electric'}">
        <h1>${cfg.companyName||'Blue Bear Electric'}</h1>
        <p>${cfg.tagline||'Powering solutions. Delivering excellence.'}</p>
        <div class="bbe-intro-bar"><span></span></div>
      </div>`;
    document.body.prepend(splash);
    sessionStorage.setItem('blueBearIntroSeen','1');
    const ready=()=>setTimeout(()=>splash.classList.add('is-hidden'),reduced?40:1650);
    if(document.readyState==='complete')ready();else addEventListener('load',ready,{once:true});
    setTimeout(()=>splash.classList.add('is-hidden'),2400);
    setTimeout(()=>splash.remove(),3100);
  }

  // Replace any legacy site logo with the current company mark.
  document.querySelectorAll('img[alt*="Blue Bear" i], .brand img, .footer img').forEach(img=>{
    if(!img.closest('.vf-boot')&&!img.closest('.vf-login-brand')){
      img.src=cfg.logoPrimary||img.src;
      img.loading=img.loading||'eager';
    }
  });
})();