import { expect, test } from '@playwright/test';

import { captureRuntimeErrors, mockPublishedContent, openPage } from '../support/site.mjs';

const viewports = [
  { name: 'mobile 320', width: 320, height: 568 },
  { name: 'mobile 375', width: 375, height: 667 },
  { name: 'mobile 390', width: 390, height: 844 },
  { name: 'tablet 768', width: 768, height: 1024 },
  { name: 'landscape 844', width: 844, height: 390 },
  { name: 'desktop 1024', width: 1024, height: 768 },
  { name: 'desktop 1280', width: 1280, height: 800 },
  { name: 'desktop 1440', width: 1440, height: 900 },
];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await mockPublishedContent(page);
});

for (const viewport of viewports) {
  test(`homepage fits ${viewport.name} without header overlap`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const runtimeErrors = captureRuntimeErrors(page);
    await openPage(page, '/');

    const layout = await page.evaluate(() => {
      const header = document.querySelector('.topbar');
      const main = document.querySelector('#main-content');
      const headerBox = header?.getBoundingClientRect();
      const mainBox = main?.getBoundingClientRect();
      return {
        clientWidth: document.documentElement.clientWidth,
        headerBottom: headerBox?.bottom,
        mainTop: mainBox?.top,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(layout.scrollWidth, `${viewport.name} should not overflow`).toBeLessThanOrEqual(
      layout.clientWidth,
    );
    expect(layout.mainTop, `${viewport.name} main should follow the header`).toBeGreaterThanOrEqual(
      layout.headerBottom,
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(runtimeErrors).toEqual([]);
  });
}

test('representative public, portal, and admin pages remain responsive', async ({ page }) => {
  const routes = [
    '/services.html',
    '/projects.html',
    '/contact.html',
    '/employee-portal.html',
    '/admin.html',
  ];

  for (const viewport of [viewports[0], viewports[4], viewports.at(-1)]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of routes) {
      const runtimeErrors = captureRuntimeErrors(page);
      await openPage(page, route);
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth, `${route} should fit ${viewport.name}`).toBeLessThanOrEqual(
        dimensions.clientWidth,
      );
      expect(runtimeErrors, `${route} should not log errors at ${viewport.name}`).toEqual([]);
    }
  }
});
