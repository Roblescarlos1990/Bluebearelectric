import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { startSiteServer, stopSiteServer } from './serve-site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const label = process.argv[2];

if (!['before', 'after'].includes(label)) {
  console.error('Usage: npm run css:baseline -- before|after');
  process.exit(1);
}

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const outputDirectory = path.join(root, 'docs', 'baselines', 'phase-6', label);
const viewports = [
  { name: 'mobile-320', width: 320, height: 568 },
  { name: 'mobile-375', width: 375, height: 667 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'landscape-844', width: 844, height: 390 },
  { name: 'desktop-1024', width: 1024, height: 768 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

await fs.mkdir(outputDirectory, { recursive: true });
await startSiteServer();

const browser = await chromium.launch();
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    await page.route('https://xpnkybwbliiqulsgqgho.supabase.co/rest/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: '[]',
      });
    });
    await page.goto('http://127.0.0.1:43118/', { waitUntil: 'networkidle' });
    await page.screenshot({
      animations: 'disabled',
      path: path.join(outputDirectory, `${viewport.name}.jpg`),
      quality: 82,
      type: 'jpeg',
    });
    await context.close();
  }
} finally {
  await browser.close();
  await stopSiteServer();
}

console.log(`Captured ${viewports.length} Phase 6 ${label} screenshots.`);
