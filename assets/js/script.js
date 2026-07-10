const hamb=document.querySelector('.hamb');
const mobile=document.querySelector('.mobile');
if(hamb){hamb.addEventListener('click',()=>mobile.classList.toggle('open'))}

document.querySelectorAll('[data-scroll]').forEach(btn=>btn.addEventListener('click',e=>{
  e.preventDefault();
  document.querySelector(btn.getAttribute('href')).scrollIntoView({behavior:'smooth'});
}));

const year=document.querySelector('#year');
if(year)year.textContent=new Date().getFullYear();

// Sticky header polish
const topbar=document.querySelector('.topbar');
const setHeader=()=>topbar&&topbar.classList.toggle('scrolled',window.scrollY>18);
setHeader();
window.addEventListener('scroll',setHeader,{passive:true});

// Reveal-on-scroll animations
const revealTargets=[...document.querySelectorAll('.section,.about-copy,.about-strip img,.service-card,.project-card,.review-card,.step,.estimate,.map-grid > *')];
revealTargets.forEach((el,i)=>{
  if(el.matches('.about-strip img')) el.classList.add('reveal-left');
  else if(el.matches('.about-copy')) el.classList.add('reveal-right');
  else el.classList.add('reveal');
  el.style.transitionDelay=`${Math.min(i%6*70,350)}ms`;
});

const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  });
},{threshold:.13,rootMargin:'0px 0px -70px 0px'});
revealTargets.forEach(el=>observer.observe(el));

// Button ripple animation
function addRipple(e){
  const btn=e.currentTarget;
  const circle=document.createElement('span');
  const diameter=Math.max(btn.clientWidth,btn.clientHeight);
  const rect=btn.getBoundingClientRect();
  circle.style.width=circle.style.height=`${diameter}px`;
  circle.style.left=`${e.clientX-rect.left-diameter/2}px`;
  circle.style.top=`${e.clientY-rect.top-diameter/2}px`;
  circle.classList.add('ripple');
  btn.appendChild(circle);
  circle.addEventListener('animationend',()=>circle.remove());
}
document.querySelectorAll('.btn').forEach(btn=>btn.addEventListener('click',addRipple));

// Light parallax for hero card on desktop
const hero=document.querySelector('.hero');
const heroCard=document.querySelector('.hero-card');
if(hero&&heroCard&&window.matchMedia('(min-width:951px)').matches){
  hero.addEventListener('mousemove',e=>{
    const r=hero.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    const y=(e.clientY-r.top)/r.height-.5;
    heroCard.style.transform=`translate3d(${x*10}px,${y*10}px,0)`;
  });
  hero.addEventListener('mouseleave',()=>{heroCard.style.transform='translate3d(0,0,0)'});
}

// Mobile floating call button
if(!document.querySelector('.floating-call')){
  const call=document.createElement('a');
  call.href='tel:7602348306';
  call.className='floating-call';
  call.textContent='Call Now';
  document.body.appendChild(call);
}
