import { expect } from '@playwright/test';

export const publicRoutes = [
  '/',
  '/services.html',
  '/industrial.html',
  '/commercial.html',
  '/residential.html',
  '/solar-bess.html',
  '/service-repair.html',
  '/engineering-inspection.html',
  '/projects.html',
  '/about.html',
  '/contact.html',
];

export async function mockPublishedContent(page) {
  await page.route('https://xpnkybwbliiqulsgqgho.supabase.co/rest/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
        'content-range': '0-0/0',
      },
      body: '[]',
    });
  });
}

export function captureRuntimeErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/Failed to load resource/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

export async function openPage(page, pathname) {
  const response = await page.goto(pathname, { waitUntil: 'load' });
  expect(response?.ok(), `${pathname} should return a successful response`).toBeTruthy();
  await page.waitForTimeout(250);
}
