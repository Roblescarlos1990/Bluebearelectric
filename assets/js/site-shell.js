const hamb = document.querySelector('.hamb');
const mobile = document.querySelector('.mobile');
if (hamb && mobile) {
  const setMenuState = (open) => {
    mobile.classList.toggle('open', open);
    hamb.setAttribute('aria-expanded', String(open));
    hamb.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    const label = hamb.querySelector('span');
    if (label) label.textContent = open ? 'Close' : 'Menu';
  };

  if (!mobile.id) mobile.id = 'mobile-navigation';
  hamb.type = 'button';
  hamb.setAttribute('aria-controls', mobile.id);
  setMenuState(false);

  hamb.addEventListener('click', () => setMenuState(!mobile.classList.contains('open')));
  mobile
    .querySelectorAll('a')
    .forEach((link) => link.addEventListener('click', () => setMenuState(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobile.classList.contains('open')) {
      setMenuState(false);
      hamb.focus();
    }
  });
  window.addEventListener(
    'resize',
    () => {
      if (window.innerWidth > 1120) setMenuState(false);
    },
    { passive: true },
  );
}

document.querySelectorAll('[data-scroll]').forEach((btn) =>
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector(btn.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
  }),
);

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

// Sticky header polish
const topbar = document.querySelector('.topbar');
const setHeader = () => topbar && topbar.classList.toggle('scrolled', window.scrollY > 18);
setHeader();
window.addEventListener('scroll', setHeader, { passive: true });

// Reveal-on-scroll animations
const revealTargets = [
  ...document.querySelectorAll(
    '.section,.about-copy,.about-strip img,.service-card,.project-card,.review-card,.step,.estimate,.map-grid > *',
  ),
];
revealTargets.forEach((el, i) => {
  if (el.matches('.about-strip img')) el.classList.add('reveal-left');
  else if (el.matches('.about-copy')) el.classList.add('reveal-right');
  else el.classList.add('reveal');
  el.style.transitionDelay = `${Math.min((i % 6) * 70, 350)}ms`;
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.13, rootMargin: '0px 0px -70px 0px' },
  );
  revealTargets.forEach((el) => observer.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('in'));
}

// Button ripple animation
function addRipple(e) {
  const btn = e.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const rect = btn.getBoundingClientRect();
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - rect.left - diameter / 2}px`;
  circle.style.top = `${e.clientY - rect.top - diameter / 2}px`;
  circle.classList.add('ripple');
  btn.appendChild(circle);
  circle.addEventListener('animationend', () => circle.remove());
}
document.querySelectorAll('.btn').forEach((btn) => btn.addEventListener('click', addRipple));

// Light parallax for hero card on desktop
const hero = document.querySelector('.hero');
const heroCard = document.querySelector('.hero-card');
if (hero && heroCard && window.matchMedia('(min-width:951px)').matches) {
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    heroCard.style.transform = `translate3d(${x * 10}px,${y * 10}px,0)`;
  });
  hero.addEventListener('mouseleave', () => {
    heroCard.style.transform = 'translate3d(0,0,0)';
  });
}

// Mobile floating call button
if (!document.querySelector('.floating-call')) {
  const call = document.createElement('a');
  call.href = 'tel:7602348306';
  call.className = 'floating-call';
  call.textContent = 'Call Now';
  document.body.appendChild(call);
  const estimateSection = document.querySelector('#estimate-form');
  const setFloatingCall = () => {
    const estimateBounds = estimateSection?.getBoundingClientRect();
    const estimateVisible = Boolean(
      estimateBounds && estimateBounds.top < window.innerHeight && estimateBounds.bottom > 0,
    );
    call.classList.toggle('is-visible', window.scrollY > 520 && !estimateVisible);
  };
  setFloatingCall();
  window.addEventListener('scroll', setFloatingCall, { passive: true });
  window.addEventListener('resize', setFloatingCall, { passive: true });
}

// VoltFlow V8.2 technical territory-map interaction
const territoryMap = document.querySelector('[data-territory-map]');
if (territoryMap && window.matchMedia('(pointer:fine) and (min-width:951px)').matches) {
  territoryMap.addEventListener('mousemove', (event) => {
    const rect = territoryMap.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    territoryMap.style.setProperty('--ry', `${px * 2.2}deg`);
    territoryMap.style.setProperty('--rx', `${py * -1.5}deg`);
  });
  territoryMap.addEventListener('mouseleave', () => {
    territoryMap.style.setProperty('--ry', '0deg');
    territoryMap.style.setProperty('--rx', '0deg');
  });
}
