(function () {
  const techData = {
    megger: {
      img: 'assets/images/site/megger.jpg',
      mode: 'INSULATION RESISTANCE',
      note: 'Documented field measurement',
    },
    thermal: {
      img: 'assets/images/site/testing.jpg',
      mode: 'INFRARED INSPECTION',
      note: 'Thermal condition under operating load',
    },
    lowres: {
      img: 'assets/images/site/mv-close.jpg',
      mode: 'LOW-RESISTANCE TEST',
      note: 'Connections and conductive paths',
    },
    power: {
      img: 'assets/images/site/vfd.jpg',
      mode: 'POWER QUALITY REVIEW',
      note: 'Voltage, loading and operating conditions',
    },
  };
  document.querySelectorAll('[data-tech]').forEach((btn) =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tech]').forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
      const d = techData[btn.dataset.tech],
        box = document.querySelector('[data-tech-visual]');
      if (!d || !box) return;
      const img = box.querySelector('img'),
        strong = box.querySelector('strong'),
        small = box.querySelector('small');
      if (img) img.src = d.img;
      if (strong) strong.textContent = d.mode;
      if (small) small.textContent = d.note;
    }),
  );
  const homeData = {
    panel: [
      'Main Electrical Panel',
      'The panel distributes power through the home and is reviewed for condition, capacity, labeling and suitability for added loads.',
      [
        'Capacity and condition review',
        'Breaker and circuit organization',
        'Upgrade planning for added loads',
      ],
    ],
    ev: [
      'EV Charging',
      'Home charging requires a review of charger specifications, available capacity, routing and the proposed mounting location.',
      ['Charger and circuit requirements', 'Load and capacity review', 'Routing and mounting plan'],
    ],
    lighting: [
      'Lighting & Controls',
      'Lighting upgrades can improve function, comfort and exterior visibility while adding modern control options.',
      [
        'Interior and exterior lighting',
        'Switching and dimming',
        'Ceiling fans and specialty fixtures',
      ],
    ],
    garage: [
      'Garage & Shop Power',
      'Garages and workshops often need dedicated circuits, receptacles, lighting and equipment-specific power.',
      [
        'Dedicated equipment circuits',
        'Shop receptacles and lighting',
        'Future expansion planning',
      ],
    ],
  };
  document.querySelectorAll('[data-home]').forEach((btn) =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-home]').forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
      const d = homeData[btn.dataset.home],
        box = document.querySelector('[data-home-detail]');
      if (!d || !box) return;
      box.querySelector('h2').textContent = d[0];
      box.querySelector('p').textContent = d[1];
      box.querySelector('ul').innerHTML = d[2].map((x) => `<li>${x}</li>`).join('');
    }),
  );
  const flowData = {
    array: [
      '01',
      'PV Array & DC Field',
      'Modules and string circuits collect energy across the field. Work may include connector, wiring, insulation-resistance, continuity and physical-condition checks.',
      'assets/images/site/solar-field.jpg',
      ['String Circuits', 'Connectors', 'Homeruns', 'Field Inspection'],
    ],
    combiner: [
      '02',
      'Combiner Boxes',
      'Combiner equipment brings multiple source circuits together and provides overcurrent protection, monitoring interfaces and field terminations.',
      'assets/images/site/combiner.jpg',
      ['Fuses', 'Terminations', 'Monitoring', 'DC Collection'],
    ],
    inverter: [
      '03',
      'Inverter / PCS',
      'Power-conversion equipment regulates energy flow and interfaces DC systems with the AC collection system.',
      'assets/images/site/vfd.jpg',
      ['Power Conversion', 'Auxiliary Power', 'Controls', 'Troubleshooting'],
    ],
    transformer: [
      '04',
      'Transformer',
      'Transformers match system voltage for collection and delivery while requiring attention to terminations, protection and condition.',
      'assets/images/site/mv-cabinet.jpg',
      ['Terminations', 'Protection', 'Inspection', 'Maintenance'],
    ],
    substation: [
      '05',
      'Substation / Grid',
      'The collection system reaches switching, protection and metering equipment before delivering energy to the grid.',
      'assets/images/site/switchgear.jpg',
      ['Switching', 'Protection', 'Metering', 'Grid Interface'],
    ],
  };
  document.querySelectorAll('[data-flow]').forEach((btn) =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-flow]').forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
      const d = flowData[btn.dataset.flow],
        box = document.querySelector('[data-flow-detail]');
      if (!d || !box) return;
      box.querySelector('img').src = d[3];
      box.querySelector('.eyebrow').textContent = `Stage ${d[0]}`;
      box.querySelector('h3').textContent = d[1];
      box.querySelector('p').textContent = d[2];
      box.querySelector('.project-tags').innerHTML = d[4].map((x) => `<span>${x}</span>`).join('');
    }),
  );
  document.querySelectorAll('.service-jump a').forEach((a) =>
    a.addEventListener('click', (e) => {
      const el = document.querySelector(a.getAttribute('href'));
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }),
  );
})();
