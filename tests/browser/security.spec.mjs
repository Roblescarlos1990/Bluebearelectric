import { expect, test } from '@playwright/test';

import { captureRuntimeErrors, mockPublishedContent, openPage } from '../support/site.mjs';

test.beforeEach(async ({ page }) => {
  await mockPublishedContent(page);
  await page.addInitScript(() => {
    window.__blueBearCspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__blueBearCspViolations.push({
        blocked: event.blockedURI,
        directive: event.effectiveDirective,
      });
    });
  });
});

test('enforced CSP protects the public site without runtime violations', async ({ page }) => {
  const runtimeErrors = captureRuntimeErrors(page);
  const response = await page.goto('/', { waitUntil: 'networkidle' });
  const policy = response?.headers()['content-security-policy'] || '';

  expect(policy).toContain("script-src 'self'");
  expect(policy).toContain("script-src-attr 'none'");
  expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
  expect(response?.headers()['content-security-policy-report-only']).toBeUndefined();
  expect(await page.evaluate(() => window.__blueBearCspViolations)).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});

test('private entry points receive no-store and noindex protections', async ({ page }) => {
  for (const route of ['/admin.html', '/employee-portal.html', '/reset-password.html']) {
    const response = await page.goto(route, { waitUntil: 'load' });
    const headers = response?.headers() || {};
    expect(headers['cache-control'], `${route} must not be cached`).toContain('no-store');
    expect(headers['x-robots-tag'], `${route} must not be indexed`).toContain('noindex');
  }
});

test('system check uses external behavior under the enforced policy', async ({ page }) => {
  const runtimeErrors = captureRuntimeErrors(page);
  await openPage(page, '/system-check.html');
  await expect(page.locator('#js-check')).toHaveText('JavaScript loaded successfully');
  await expect(page.locator('#img-check')).toHaveText('Image loaded successfully');
  await expect(page.locator('#security-config-check')).toHaveText(
    'Security config API loaded successfully',
  );
  await expect(page.locator('#quote-api-check')).toHaveText(
    'Quote API method guard loaded successfully',
  );
  expect(await page.evaluate(() => window.__blueBearCspViolations)).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});
