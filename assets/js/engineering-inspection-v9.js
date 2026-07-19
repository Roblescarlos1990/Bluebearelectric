(function(){
  const $=s=>document.querySelector(s);
  const modes={
    visual:{
      src:'assets/images/engineering-inspection/case-study/visual-overhead.webp',
      label:'Visible-Light Reference',
      title:'Asset condition and configuration',
      description:'High-resolution visual imagery documents equipment configuration, conductor routing, structures, contamination and visible physical condition.',
      points:['Equipment identification and orientation','Visible damage or contamination','Safe documentation of elevated assets']
    },
    thermal:{
      src:'assets/images/engineering-inspection/case-study/thermal-overhead-detail.webp',
      label:'Radiometric Thermal View',
      title:'Temperature patterns and component comparison',
      description:'Thermal imagery supports phase-to-phase and component-to-component comparison while operating condition and environmental effects are considered.',
      points:['Connection and terminal comparison','Abnormal gradient screening','Baseline condition documentation']
    },
    blend:{
      src:'assets/images/engineering-inspection/case-study/thermal-overhead-blended.webp',
      label:'Blended Inspection View',
      title:'Thermal context aligned with the physical asset',
      description:'Blended imagery helps connect thermal behavior with the exact physical component, surrounding equipment and site conditions.',
      points:['Clear component location','Customer-friendly interpretation','Visual and thermal context in one image']
    }
  };
  const image=$('[data-thermal-image]'),label=$('[data-thermal-label]'),title=$('[data-thermal-title]'),desc=$('[data-thermal-description]'),points=$('[data-thermal-points]');
  document.querySelectorAll('[data-thermal-mode]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.thermalMode,data=modes[key];if(!data)return;
    document.querySelectorAll('[data-thermal-mode]').forEach(b=>b.classList.toggle('active',b===button));
    image.classList.add('changing');
    setTimeout(()=>{
      image.src=data.src;image.alt=data.title;label.textContent=data.label;title.textContent=data.title;desc.textContent=data.description;
      points.innerHTML=data.points.map(x=>`<li>${x}</li>`).join('');
      image.classList.remove('changing');
    },180);
  }));
  document.querySelectorAll('.case-study-gallery img').forEach(img=>{
    img.addEventListener('click',()=>{
      const m=document.createElement('div');m.className='inspection-lightbox';
      m.innerHTML=`<button type="button" aria-label="Close">×</button><img src="${img.src}" alt="${img.alt}">`;
      m.onclick=e=>{if(e.target===m||e.target.tagName==='BUTTON')m.remove()};
      document.body.appendChild(m);
    });
  });
})();