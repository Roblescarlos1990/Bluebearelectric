import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = JSON.parse(fs.readFileSync(path.join(root, 'PROJECT-MANIFEST.json'), 'utf8'));
const imageMetadata = JSON.parse(
  fs.readFileSync(path.join(root, 'assets/data/image-variants.json'), 'utf8'),
).images;
const runtimeFiles = [
  ...project.runtime.public_pages,
  ...project.runtime.portal_pages,
  ...project.runtime.admin_pages,
];
const heroImages = {
  'about.html': 'assets/images/site/truck.jpg',
  'commercial.html': 'assets/images/site/fuse-panel.jpg',
  'contact.html': 'assets/images/site/truck.jpg',
  'index.html': 'assets/images/site/switchgear.jpg',
  'industrial.html': 'assets/images/site/switchgear.jpg',
  'projects.html': 'assets/images/site/solar-field.jpg',
  'residential.html': 'assets/images/site/instagram.jpg',
  'service-repair.html': 'assets/images/site/megger.jpg',
  'services.html': 'assets/images/site/truck.jpg',
  'solar-bess.html': 'assets/images/site/solar-field.jpg',
};

function hasAttribute(tag, name) {
  return new RegExp(`\\s${name}(?:\\s*=|\\s|>)`, 'i').test(tag);
}

function addAttribute(tag, name, value) {
  if (hasAttribute(tag, name)) return tag;
  if (/\s*\/>$/.test(tag)) return tag.replace(/\s*\/>$/, ` ${name}="${value}" />`);
  return tag.replace(/\s*>$/, ` ${name}="${value}">`);
}

function setAttribute(tag, name, value) {
  const attribute = new RegExp(`\\s${name}=(['"])[^'"]*\\1`, 'i');
  if (attribute.test(tag)) return tag.replace(attribute, ` ${name}="${value}"`);
  return addAttribute(tag, name, value);
}

function sizesFor(context, source) {
  if (context === 'header') return '160px';
  if (context === 'footer') return '180px';
  if (/logo|icon/.test(source)) return '160px';
  return '(max-width: 720px) calc(100vw - 40px), min(50vw, 960px)';
}

function enhanceMarkup(html, filename) {
  return html.replace(/<img\b[^>]*>/gi, (tag, offset) => {
    const source = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1];
    if (!source) return tag;
    const before = html.slice(0, offset);
    const inHeader = before.lastIndexOf('<header') > before.lastIndexOf('</header>');
    const inFooter = before.lastIndexOf('<footer') > before.lastIndexOf('</footer>');
    const priority =
      filename === 'engineering-inspection.html' &&
      source === 'assets/images/engineering-inspection/case-study/engineering-inspection-hero.webp';
    const details = imageMetadata[source];
    let result = tag;
    if (details) {
      result = setAttribute(result, 'width', details.width);
      result = setAttribute(result, 'height', details.height);
      const webp = details.variants.filter((variant) => variant.format === 'webp');
      if (webp.length) {
        result = setAttribute(
          result,
          'srcset',
          webp.map((variant) => `${variant.path} ${variant.width}w`).join(', '),
        );
        result = setAttribute(
          result,
          'sizes',
          sizesFor(inHeader ? 'header' : inFooter ? 'footer' : 'content', source),
        );
      }
    }
    result = setAttribute(result, 'decoding', 'async');
    result = setAttribute(result, 'loading', priority || inHeader ? 'eager' : 'lazy');
    if (priority) {
      result = addAttribute(result, 'fetchpriority', 'high');
      result = addAttribute(result, 'data-image-priority', 'high');
    }
    return result;
  });
}

function iconMarkup(html) {
  const withoutOldIcons = html.replace(
    /\s*<link\s+rel=["'](?:icon|apple-touch-icon)["'][^>]*>/gi,
    '',
  );
  const icons = `
    <link rel="icon" href="favicon.ico" sizes="any" />
    <link rel="icon" href="assets/branding/blue-bear/favicon-32.png" type="image/png" sizes="32x32" />
    <link rel="apple-touch-icon" href="assets/branding/blue-bear/apple-touch-icon.png" sizes="180x180" />`;
  if (withoutOldIcons.includes('<link rel="manifest"')) {
    return withoutOldIcons.replace(/\s*(<link rel="manifest"[^>]*>)/i, `${icons}\n    $1`);
  }
  return withoutOldIcons.replace('</head>', `${icons}\n  </head>`);
}

function preloadMarkup(html, filename) {
  html = html.replace(/\s*<link\b(?=[^>]*data-primary-image-preload)[^>]*>/gi, '');
  const source = heroImages[filename];
  if (!source) return html;
  const details = imageMetadata[source];
  if (!details) return html;
  const avif = details.variants.filter((variant) => variant.format === 'avif');
  if (!avif.length) return html;
  const largest = avif.at(-1);
  const preload = `
    <link
      rel="preload"
      as="image"
      href="${largest.path}"
      imagesrcset="${avif.map((variant) => `${variant.path} ${variant.width}w`).join(', ')}"
      imagesizes="100vw"
      type="image/avif"
      fetchpriority="high"
      data-primary-image-preload
    />`;
  return html.replace('</head>', `${preload}\n  </head>`);
}

function scriptMarkup(html) {
  if (html.includes('assets/js/image-performance.js')) return html;
  const script = '    <script src="assets/js/image-performance.js"></script>\n';
  const firstAssetScript = html.match(/\s*<script\s+src=["']assets\/js\//i);
  if (firstAssetScript) {
    return (
      html.slice(0, firstAssetScript.index) + `\n${script}` + html.slice(firstAssetScript.index)
    );
  }
  return html.replace('</body>', `${script}  </body>`);
}

for (const filename of runtimeFiles) {
  const file = path.join(root, filename);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/\s+\/\s+width="\d+"/g, '');
  html = iconMarkup(html);
  html = preloadMarkup(html, filename);
  html = enhanceMarkup(html, filename);
  html = scriptMarkup(html);
  fs.writeFileSync(file, html);
}

console.log(`Updated image markup in ${runtimeFiles.length} runtime pages.`);
