function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function siteLink(config, key) {
  const link = config.links[key];
  if (!link) throw new Error('Unknown site link key: ' + key);
  return '<a href="' + escapeHtml(link.href) + '">' + escapeHtml(link.label) + '</a>';
}

function renderLinkList(config, keys, separator = '') {
  return keys.map((key) => siteLink(config, key)).join(separator);
}

function renderLogo({ mobileMark = false, footer = false, alt } = {}) {
  const logoAlt = alt || (footer ? 'Blue Bear Electric' : 'Blue Bear Electric logo');
  const standardLogo = [
    '<img',
    mobileMark ? '  class="brand-logo-desktop"' : '',
    '  src="assets/images/site/logo.jpg"',
    '  alt="' + escapeHtml(logoAlt) + '"',
    '  width="900"',
    '  height="620"',
    '  srcset="assets/images/optimized/site/logo-480.webp 480w, assets/images/optimized/site/logo-900.webp 900w"',
    '  sizes="' + (footer ? '180px' : '160px') + '"',
    '  decoding="async"',
    '  loading="' + (footer ? 'lazy' : 'eager') + '"',
    '/>',
  ]
    .filter(Boolean)
    .join('\n');

  if (!mobileMark) return standardLogo;

  return [
    standardLogo,
    '<img',
    '  class="brand-logo-mobile"',
    '  src="assets/branding/blue-bear/logo-mark-solid.png"',
    '  alt=""',
    '  aria-hidden="true"',
    '  width="1254"',
    '  height="1254"',
    '  srcset="assets/branding/blue-bear/optimized/logo-mark-solid-96.webp 96w, assets/branding/blue-bear/optimized/logo-mark-solid-192.webp 192w, assets/branding/blue-bear/optimized/logo-mark-solid-384.webp 384w"',
    '  sizes="160px"',
    '  decoding="async"',
    '  loading="eager"',
    '/>',
  ].join('\n');
}

const headerVariants = {
  compact: {
    ctaHref: 'contact.html',
    ctaLabel: 'Get Free Estimate',
  },
  'compact-request': {
    ctaHref: 'contact.html',
    ctaLabel: 'Request a Free Estimate',
  },
  full: {
    ctaHref: 'contact.html',
    ctaLabel: 'Get Free Estimate',
  },
  home: {
    ctaHref: 'contact.html',
    ctaLabel: 'Request a Free Estimate',
    menuIcon: true,
    mobileMark: true,
  },
  inspection: {
    ctaHref:
      'contact.html?service=Drone+%26+Thermal+Inspection&project=Aerial+Inspection+Request&source=typical-project#estimate-form',
    ctaLabel: 'Request Inspection',
  },
};

export function renderPublicHeader(config, variantName) {
  const variant = headerVariants[variantName];
  if (!variant) throw new Error('Unknown public header variant: ' + variantName);

  const business = config.business;
  const mobileLinks = renderLinkList(config, config.navigation.mobile);
  const callLink =
    '<a href="' +
    escapeHtml(business.phoneHref) +
    '">Call ' +
    escapeHtml(business.phoneDisplay) +
    '</a>';
  const menuIcon = variant.menuIcon ? '<i class="bi bi-list" aria-hidden="true"></i>' : '';

  return [
    '<header class="topbar">',
    '  <nav class="nav" aria-label="Primary navigation">',
    '    <a class="brand" href="index.html">',
    renderLogo({ mobileMark: variant.mobileMark }),
    '    </a>',
    '    <div class="links">',
    '      ' + renderLinkList(config, config.navigation.desktop),
    '    </div>',
    '    <a class="btn yellow" href="' +
      escapeHtml(variant.ctaHref) +
      '">' +
      escapeHtml(variant.ctaLabel) +
      '</a>',
    '    <button class="hamb" type="button" aria-expanded="false" aria-controls="mobile-navigation">',
    '      <span>Menu</span>' + menuIcon,
    '    </button>',
    '    <div class="mobile" id="mobile-navigation" aria-hidden="true" hidden>',
    '      ' + mobileLinks + callLink,
    '    </div>',
    '  </nav>',
    '</header>',
  ].join('\n');
}

function renderBrandColumn(config, copy) {
  return [
    '<div>',
    renderLogo({ footer: true }),
    '  <p class="small">' + escapeHtml(copy) + '</p>',
    '</div>',
  ].join('\n');
}

function renderLinkColumn(config, heading, keys) {
  return [
    '<div>',
    '  <h4>' + escapeHtml(heading) + '</h4>',
    '  <p class="small">' + renderLinkList(config, keys, '<br />') + '</p>',
    '</div>',
  ].join('\n');
}

function renderTextColumn(heading, lines) {
  return [
    '<div>',
    '  <h4>' + escapeHtml(heading) + '</h4>',
    '  <p class="small">' + lines.map(escapeHtml).join('<br />') + '</p>',
    '</div>',
  ].join('\n');
}

function contactLines(config, licensePrefix = 'CA License #') {
  return [
    config.business.phoneDisplay,
    config.business.serviceArea,
    licensePrefix + config.business.license,
  ];
}

function credentialLine(config) {
  return 'CA License #' + config.business.license + ' • ' + config.business.credentials.join(' • ');
}

function renderGridFooter(columns) {
  return [
    '<footer class="footer">',
    '  <div class="foot-grid">',
    columns.join('\n'),
    '  </div>',
    '</footer>',
  ].join('\n');
}

export function renderPublicFooter(config, variantName) {
  const business = config.business;
  const footer = config.footer;

  if (variantName === 'home') {
    return renderGridFooter([
      renderBrandColumn(config, business.summary),
      renderLinkColumn(config, 'Quick Links', footer.quickLinksHome),
      renderTextColumn('Services', footer.services),
      renderTextColumn('Contact', [...contactLines(config), 'Certificates available upon request']),
    ]);
  }

  if (variantName === 'standard') {
    return renderGridFooter([
      renderBrandColumn(config, credentialLine(config)),
      renderLinkColumn(config, 'Quick Links', footer.quickLinksCompact),
      renderTextColumn('Contact', [business.phoneDisplay, business.serviceArea]),
      renderTextColumn('Mission', [business.mission]),
    ]);
  }

  if (variantName === 'capabilities') {
    return renderGridFooter([
      renderBrandColumn(config, credentialLine(config)),
      renderLinkColumn(config, 'Quick Links', footer.quickLinksStandard),
      renderTextColumn('Capabilities', footer.capabilities),
      renderTextColumn('Contact', contactLines(config, 'License #')),
    ]);
  }

  if (variantName === 'inspection') {
    return [
      '<footer class="footer">',
      '  <div>',
      renderLogo({ footer: true, alt: 'Blue Bear Electric logo' }),
      '  </div>',
      '  <div>',
      '    <h4>Inspection Services</h4>',
      '    <a href="#capabilities">Capabilities</a>',
      '    <a href="#thermal-viewer">Thermal Viewer</a>',
      '    <a href="#sample-case-study">Case Study</a>',
      '  </div>',
      '  <div>',
      '    <h4>Contact</h4>',
      '    <p>' + contactLines(config).map(escapeHtml).join('<br />') + '</p>',
      '  </div>',
      '</footer>',
    ].join('\n');
  }

  throw new Error('Unknown public footer variant: ' + variantName);
}
