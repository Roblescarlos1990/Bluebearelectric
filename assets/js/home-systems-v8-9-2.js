(function(){
  const TENANT='blue-bear-electric', PAGE='residential', SECTION='home-systems';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const localManifest='assets/images/media/residential/home-systems/home-systems-manifest.json';
  let systems={}, current='panel', activeIndex=0, client=null;

  const stage=$('[data-home-system-stage]');
  if(!stage)return;

  async function load(){
    const fallback=await fetch(localManifest).then(r=>r.json()).catch(()=>({systems:{}}));
    systems=fallback.systems||{};
    if(window.supabase&&window.BLUE_BEAR_SUPABASE_URL&&window.BLUE_BEAR_SUPABASE_KEY){
      client=window.supabase.createClient(window.BLUE_BEAR_SUPABASE_URL,window.BLUE_BEAR_SUPABASE_KEY);
      const {data,error}=await client.from('website_carousel_items')
        .select('*').eq('tenant_key',TENANT).eq('page_key',PAGE).eq('section_key',SECTION)
        .eq('is_published',true).order('display_order',{ascending:true});
      if(!error&&data?.length){
        Object.keys(systems).forEach(key=>{
          const db=data.filter(x=>x.carousel_key===key);
          if(db.length)systems[key].items=db.map(x=>({src:x.public_url,title:x.title,alt:x.alt_text||x.title}));
        });
      }
    }
    bind(); show('panel',0);
  }

  function bind(){
    document.querySelectorAll('[data-home-system]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.homeSystem,0)));
    document.querySelectorAll('[data-open-home-system]').forEach(card=>{
      const open=()=>{show(card.dataset.openHomeSystem,0);$('#home-zones')?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'})};
      card.addEventListener('click',open);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')open()});
    });
    $('[data-home-prev]')?.addEventListener('click',()=>move(-1));
    $('[data-home-next]')?.addEventListener('click',()=>move(1));
    $('[data-home-fullscreen]')?.addEventListener('click',openLightbox);
    stage.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1)});
    let start=0;
    stage.addEventListener('pointerdown',e=>start=e.clientX);
    stage.addEventListener('pointerup',e=>{const d=e.clientX-start;if(Math.abs(d)>45)move(d<0?1:-1)});
    stage.addEventListener('pointermove',e=>{
      if(reduced||innerWidth<900)return;
      const r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      stage.style.setProperty('--viewer-ry',`${x*3.2}deg`);stage.style.setProperty('--viewer-rx',`${y*-2.3}deg`);
    });
    stage.addEventListener('pointerleave',()=>{stage.style.removeProperty('--viewer-ry');stage.style.removeProperty('--viewer-rx')});
  }

  function show(key,index=0){
    if(!systems[key])return;
    current=key;activeIndex=Math.max(0,Math.min(index,systems[key].items.length-1));
    document.querySelectorAll('[data-home-system]').forEach(b=>b.classList.toggle('active',b.dataset.homeSystem===key));
    const meta=systems[key];
    $('[data-home-system-title]').textContent=meta.title;
    $('[data-home-system-description]').textContent=meta.description;
    $('[data-home-system-features]').innerHTML=(meta.features||[]).map(x=>`<li>${esc(x)}</li>`).join('');
    renderDeck();renderThumbs();
  }
  function move(delta){
    const items=systems[current]?.items||[];if(!items.length)return;
    activeIndex=(activeIndex+delta+items.length)%items.length;renderDeck();renderThumbs();
  }
  function renderDeck(){
    const deck=$('[data-home-system-deck]'),items=systems[current]?.items||[];
    deck.innerHTML=items.map((item,i)=>{
      let d=i-activeIndex;if(d>items.length/2)d-=items.length;if(d<-items.length/2)d+=items.length;
      return `<button type="button" class="home-system-card ${d===0?'active':''}" style="--offset:${d};z-index:${50-Math.abs(d)}" data-card-index="${i}" aria-label="${esc(item.title)}"><img src="${esc(item.src)}" alt="${esc(item.alt||item.title)}"><span>${esc(item.title)}</span></button>`;
    }).join('');
    deck.querySelectorAll('[data-card-index]').forEach(card=>card.onclick=()=>{const i=Number(card.dataset.cardIndex);i===activeIndex?openLightbox():show(current,i)});
  }
  function renderThumbs(){
    const box=$('[data-home-thumbs]'),items=systems[current]?.items||[];
    box.innerHTML=items.map((x,i)=>`<button type="button" class="${i===activeIndex?'active':''}" data-thumb="${i}"><img src="${esc(x.src)}" alt=""><span>${i+1}</span></button>`).join('');
    box.querySelectorAll('[data-thumb]').forEach(b=>b.onclick=()=>show(current,Number(b.dataset.thumb)));
  }
  function openLightbox(){
    const item=systems[current]?.items?.[activeIndex];if(!item)return;
    const modal=document.createElement('div');modal.className='home-system-lightbox';
    modal.innerHTML=`<button type="button" aria-label="Close">×</button><img src="${esc(item.src)}" alt="${esc(item.alt||item.title)}"><h2>${esc(item.title)}</h2>`;
    modal.onclick=e=>{if(e.target===modal||e.target.tagName==='BUTTON')modal.remove()};
    document.body.appendChild(modal);
  }
  load();
})();