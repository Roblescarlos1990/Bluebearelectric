(function(){
  if(!window.supabase)return;
  const client=window.supabase.createClient(window.BLUE_BEAR_SUPABASE_URL,window.BLUE_BEAR_SUPABASE_KEY);
  const TENANT='blue-bear-electric', PAGE='residential', SECTION='home-systems';
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const select=$('[data-carousel-system]'),list=$('[data-carousel-manager-list]'),preview=$('[data-carousel-admin-preview]'),status=$('[data-carousel-manager-status]');
  if(!select||!list)return;
  let rows=[];
  function setStatus(t){status.textContent=t}
  function safe(n){return String(n||'image').toLowerCase().replace(/[^a-z0-9._-]+/g,'-')}
  async function load(){
    setStatus('Loading...');
    const {data,error}=await client.from('website_carousel_items').select('*').eq('tenant_key',TENANT).eq('page_key',PAGE).eq('section_key',SECTION).eq('carousel_key',select.value).order('display_order');
    if(error){list.innerHTML='<p class="small">Run the V8.9.2 SQL migration.</p>';setStatus('Database setup required');return}
    rows=data||[];render();setStatus(`${rows.length} photos`);
  }
  function render(){
    list.innerHTML=rows.length?rows.map((r,i)=>`<article class="carousel-manager-row" data-id="${r.id}">
      <img src="${esc(r.public_url)}" alt="${esc(r.alt_text||r.title)}">
      <div><b>${esc(r.title)}</b><small>${r.is_published?'Published':'Hidden'} · position ${r.display_order}</small><input value="${esc(r.alt_text||'')}" data-alt="${r.id}" aria-label="Alt text"></div>
      <div class="carousel-row-actions"><button class="btn dark mini-btn" data-move="${r.id}" data-direction="-1">Up</button><button class="btn dark mini-btn" data-move="${r.id}" data-direction="1">Down</button><button class="btn dark mini-btn" data-publish="${r.id}">${r.is_published?'Hide':'Publish'}</button><button class="btn danger mini-btn" data-delete="${r.id}">Delete</button></div>
    </article>`).join(''):'<div class="vf88-empty">No database photos yet. The public page is using local fallback images.</div>';
    preview.innerHTML=rows.filter(x=>x.is_published).map((r,i)=>`<img src="${esc(r.public_url)}" alt="${esc(r.alt_text||r.title)}" style="--i:${i}">`).join('')||'<p class="small">Publish photos to preview them.</p>';
  }
  select.addEventListener('change',load);
  $('[data-carousel-upload-form]')?.addEventListener('submit',async e=>{
    e.preventDefault();const f=e.currentTarget,file=f.file.files[0],btn=f.querySelector('button');if(!file)return;
    btn.disabled=true;btn.textContent='Uploading...';
    try{
      const path=`${TENANT}/carousels/${PAGE}/${select.value}/${Date.now()}-${safe(file.name)}`;
      const up=await client.storage.from('site-media').upload(path,file,{cacheControl:'3600',upsert:false});if(up.error)throw up.error;
      const url=client.storage.from('site-media').getPublicUrl(path).data.publicUrl;
      const next=(rows.at(-1)?.display_order||0)+10;
      const {error}=await client.from('website_carousel_items').insert({tenant_key:TENANT,page_key:PAGE,section_key:SECTION,carousel_key:select.value,title:f.title.value.trim(),alt_text:f.alt_text.value.trim(),storage_path:path,public_url:url,display_order:next,is_published:true});
      if(error)throw error;f.reset();await load();window.voltflowToast?.('Carousel photo added','The residential page will use the new published image.');
    }catch(err){console.error(err);setStatus(err.message||'Upload failed')}finally{btn.disabled=false;btn.textContent='Upload & Add Photo'}
  });
  list.addEventListener('change',async e=>{
    if(!e.target.matches('[data-alt]'))return;
    await client.from('website_carousel_items').update({alt_text:e.target.value.trim(),updated_at:new Date().toISOString()}).eq('id',e.target.dataset.alt);
    setStatus('Description saved');
  });
  list.addEventListener('click',async e=>{
    const row=rows.find(x=>x.id===(e.target.dataset.move||e.target.dataset.publish||e.target.dataset.delete));if(!row)return;
    if(e.target.dataset.move){
      const idx=rows.findIndex(x=>x.id===row.id),other=rows[idx+Number(e.target.dataset.direction)];if(!other)return;
      await Promise.all([client.from('website_carousel_items').update({display_order:other.display_order}).eq('id',row.id),client.from('website_carousel_items').update({display_order:row.display_order}).eq('id',other.id)]);await load();
    }
    if(e.target.dataset.publish){await client.from('website_carousel_items').update({is_published:!row.is_published,updated_at:new Date().toISOString()}).eq('id',row.id);await load()}
    if(e.target.dataset.delete&&confirm('Delete this carousel photo permanently?')){
      await client.storage.from('site-media').remove([row.storage_path]);
      await client.from('website_carousel_items').delete().eq('id',row.id);await load();
    }
  });
  const page=$('[data-tab-page="website"]');if(page)load();
})();