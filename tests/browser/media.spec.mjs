import { expect, test } from '@playwright/test';

import { mockPublishedContent, openPage, publicRoutes } from '../support/site.mjs';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await mockPublishedContent(page);
});

test('homepage intro renders only the active bear-logo scene', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await page.addInitScript(() => sessionStorage.removeItem('blueBearIntroSeenV2'));
  await openPage(page, '/');

  const intro = page.locator('.bbe-cinematic-3d-intro');
  await expect(intro).toBeVisible();
  await expect(intro.locator('.bbe-logo-stage img')).toHaveAttribute(
    'src',
    /logo-mark-solid\.png$/,
  );
  await expect(intro.locator('h1, p, .bbe-intro-footer, .bbe-cinematic-loader')).toHaveCount(0);
  await expect(intro).toHaveText('');

  await expect(intro).toHaveCount(0, { timeout: 4_000 });
  await expect(page.locator('html')).not.toHaveClass(/bbe-intro-active/);
});

test('public-page images reserve space and use non-blocking loading metadata', async ({ page }) => {
  for (const route of publicRoutes) {
    await openPage(page, route);
    await page.evaluate(() => window.BLUE_BEAR_IMAGES?.ready);

    const findings = await page.locator('img').evaluateAll((images) =>
      images.map((image) => ({
        alt: image.getAttribute('alt'),
        decoding: image.getAttribute('decoding'),
        height: image.getAttribute('height'),
        loading: image.getAttribute('loading'),
        src: image.getAttribute('src'),
        width: image.getAttribute('width'),
      })),
    );

    for (const finding of findings) {
      expect(finding.alt, `${route}: ${finding.src} needs alt text`).not.toBeNull();
      expect(finding.width, `${route}: ${finding.src} needs an intrinsic width`).toMatch(/^\d+$/);
      expect(finding.height, `${route}: ${finding.src} needs an intrinsic height`).toMatch(/^\d+$/);
      expect(finding.loading, `${route}: ${finding.src} needs a loading policy`).toMatch(
        /^(?:eager|lazy)$/,
      );
      expect(finding.decoding, `${route}: ${finding.src} should decode asynchronously`).toBe(
        'async',
      );
    }

    const priorityImages = page.locator('img[fetchpriority="high"]');
    expect(
      await priorityImages.count(),
      `${route} should have no more than one highest-priority image`,
    ).toBeLessThanOrEqual(1);
    if ((await priorityImages.count()) === 1) {
      await expect(priorityImages).toHaveAttribute('loading', 'eager');
    }
  }
});

test('core public-page images load successfully from responsive sources', async ({ page }) => {
  test.setTimeout(90_000);
  const routes = [
    '/',
    '/services.html',
    '/residential.html',
    '/engineering-inspection.html',
    '/projects.html',
    '/about.html',
  ];

  for (const route of routes) {
    await openPage(page, route);
    await page.evaluate(() => window.BLUE_BEAR_IMAGES?.ready);
    const images = page.locator('img[src]');
    for (let index = 0; index < (await images.count()); index += 1) {
      const image = images.nth(index);
      if (await image.isVisible()) await image.scrollIntoViewIfNeeded();
    }
    await expect
      .poll(
        async () => {
          const items = await images.evaluateAll((imageElements) =>
            imageElements
              .filter(
                (image) =>
                  image.offsetParent !== null &&
                  (image.loading !== 'lazy' || image.getBoundingClientRect().top < innerHeight * 2),
              )
              .map((image) => ({
                complete: image.complete,
                currentSrc: image.currentSrc,
                naturalWidth: image.naturalWidth,
              })),
          );
          return items.every(
            (item) => item.complete && item.naturalWidth > 0 && Boolean(item.currentSrc),
          );
        },
        { message: `${route} should finish loading its visible images` },
      )
      .toBe(true);

    const localResponsiveImages = await images.evaluateAll((items) =>
      items
        .filter(
          (image) =>
            image.getAttribute('src')?.startsWith('assets/images/') && image.offsetParent !== null,
        )
        .map((image) => ({ currentSrc: image.currentSrc, srcset: image.srcset })),
    );
    for (const image of localResponsiveImages) {
      expect(
        image.srcset,
        `${route}: local content images should expose responsive variants`,
      ).toBeTruthy();
      expect(
        image.currentSrc,
        `${route}: the browser should select an optimized variant`,
      ).toContain('/optimized/');
    }
  }
});

test('mobile homepage selects a compact AVIF hero without material layout shift', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__phase4LayoutShift = 0;
    window.__phase4LayoutShiftEntries = [];
    new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__phase4LayoutShift += entry.value;
          window.__phase4LayoutShiftEntries.push({
            sources: entry.sources.map((source) => ({
              currentRect: source.currentRect,
              node: source.node?.id || source.node?.className || source.node?.tagName,
              previousRect: source.previousRect,
            })),
            value: entry.value,
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await openPage(page, '/');
  await page.evaluate(() => window.BLUE_BEAR_IMAGES?.ready);
  await page.waitForTimeout(750);

  const hero = page.locator('.hero').first();
  const background = await hero.evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(background).toContain('/assets/images/optimized/site/switchgear-');
  expect(background).toContain('.avif');

  const requestedHeroSources = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => /switchgear/i.test(name)),
  );
  expect(requestedHeroSources.some((source) => /switchgear-(?:480|960)\.avif$/i.test(source))).toBe(
    true,
  );
  expect(requestedHeroSources.some((source) => /\/site\/switchgear\.jpg$/i.test(source))).toBe(
    false,
  );

  const imagePayload = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter(
        (entry) =>
          entry.initiatorType === 'img' || /\.(?:avif|jpe?g|png|webp)(?:\?|$)/i.test(entry.name),
      )
      .reduce((total, entry) => total + entry.decodedBodySize, 0),
  );
  expect(imagePayload, 'mobile above-the-fold image payload should remain compact').toBeLessThan(
    900_000,
  );

  const layoutShift = await page.evaluate(() => window.__phase4LayoutShift);
  const layoutShiftEntries = await page.evaluate(() => window.__phase4LayoutShiftEntries);
  expect(
    layoutShift,
    `mobile homepage cumulative layout shift: ${JSON.stringify(layoutShiftEntries)}`,
  ).toBeLessThanOrEqual(0.1);
});

test('install manifest exposes complete any-purpose and maskable icon sets', async ({
  request,
}) => {
  const response = await request.get('/site.webmanifest');
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]),
  );

  for (const icon of manifest.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok(), `${icon.src} should load`).toBeTruthy();
    expect(iconResponse.headers()['content-type']).toContain('image/png');
  }
});
