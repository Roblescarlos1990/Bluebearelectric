(function(){
  const cfg=window.VOLTFLOW_COMPANY||{};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.style.setProperty('--company-watermark-opacity',String(cfg.publicWatermarkOpacity||.06));
  document.body.classList.add('blue-bear-branded');
  const isHome=/\/$|\/index\.html$/i.test(location.pathname);
  const seen=sessionStorage.getItem('blueBearIntroSeen');
  if(isHome&&!seen){
    const splash=document.createElement('div');
    splash.className='bbe-site-intro bbe-classic-intro';
    splash.setAttribute('aria-live','polite');
    splash.innerHTML=`
      <div class="bbe-intro-grid"></div><div class="bbe-intro-energy"></div>
      <div class="bbe-intro-core">
        <img src="${cfg.introLogo||cfg.logoPrimary||'assets/branding/blue-bear/logo-transparent-hd.png'}" alt="${cfg.companyName||'Blue Bear Electric'}">
        <h1>${cfg.companyName||'Blue Bear Electric'}</h1>
        <p>${cfg.tagline||'Powering solutions. Delivering excellence.'}</p>
        <div class="bbe-intro-bar"><span data-bbe-intro-progress></span></div>
        <div class="bbe-intro-percent" data-bbe-intro-percent>0%</div>
      </div>`;
    document.body.prepend(splash); sessionStorage.setItem('blueBearIntroSeen','1');
    const bar=splash.querySelector('[data-bbe-intro-progress]'),pct=splash.querySelector('[data-bbe-intro-percent]');
    const start=performance.now(),duration=reduced?80:2200;
    function tick(now){const raw=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-raw,3),v=Math.round(eased*100);if(bar)bar.style.width=v+'%';if(pct)pct.textContent=v+'%';if(raw<1)requestAnimationFrame(tick)}
    requestAnimationFrame(tick);
    const hide=()=>setTimeout(()=>splash.classList.add('is-hidden'),reduced?60:2250);
    if(document.readyState==='complete')hide();else addEventListener('load',hide,{once:true});
    setTimeout(()=>splash.classList.add('is-hidden'),2900);setTimeout(()=>splash.remove(),3500);
  }
  document.querySelectorAll('img[alt*="Blue Bear" i], .brand img, .footer img').forEach(img=>{
    if(!img.closest('.vf-boot')&&!img.closest('.vf-login-brand')&&!img.closest('.bbe-site-intro'))img.src=cfg.logoPrimary||img.src;
  });
})();