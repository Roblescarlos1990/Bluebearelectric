import { expect, test } from '@playwright/test';

import { mockPublishedContent, openPage, publicRoutes } from '../support/site.mjs';

const siteUrl = 'https://bluebearelectric.com';
const privateRoutes = [
  '/admin.html',
  '/admin-portal.html',
  '/customer-portal.html',
  '/employee-portal.html',
  '/reset-password.html',
  '/customize.html',
  '/system-check.html',
];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await mockPublishedContent(page);
});

test('public pages expose unique search, social, and Electrician metadata', async ({ page }) => {
  const descriptions = new Set();
  const canonicals = new Set();

  for (const route of publicRoutes) {
    await openPage(page, route);

    const title = await page.title();
    const description = page.locator('meta[name="description"]');
    const canonical = page.locator('link[rel="canonical"]');
    await expect(description).toHaveCount(1);
    await expect(canonical).toHaveCount(1);

    const descriptionText = await description.getAttribute('content');
    const canonicalUrl = await canonical.getAttribute('href');
    expect(descriptionText?.length, `${route}: description should be useful`).toBeGreaterThan(70);
    expect(descriptionText?.length, `${route}: description should remain concise`).toBeLessThan(
      170,
    );
    expect(descriptions.has(descriptionText), `${route}: description should be unique`).toBe(false);
    expect(canonicals.has(canonicalUrl), `${route}: canonical should be unique`).toBe(false);
    descriptions.add(descriptionText);
    canonicals.add(canonicalUrl);

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      descriptionText,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonicalUrl);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      `${siteUrl}/assets/branding/blue-bear/logo-cinematic-wide.png`,
    );
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      'content',
      /Blue Bear Electric/i,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      'content',
      `${siteUrl}/assets/branding/blue-bear/logo-cinematic-wide.png`,
    );

    const structuredData = await page
      .locator('script[type="application/ld+json"][data-blue-bear-business]')
      .textContent();
    const business = JSON.parse(structuredData);
    expect(business).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Electrician',
      '@id': `${siteUrl}/#business`,
      name: 'Blue Bear Electric',
      url: `${siteUrl}/`,
      telephone: '+1-760-234-8306',
      areaServed: {
        '@type': 'AdministrativeArea',
        name: 'Imperial County, California',
      },
      identifier: {
        propertyID: 'California contractor license',
        value: '1141313',
      },
    });
  }
});

test('sitemap lists only indexable public clean routes', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.ok()).toBeTruthy();
  const sitemap = await response.text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(urls).toEqual([
    `${siteUrl}/about`,
    `${siteUrl}/commercial`,
    `${siteUrl}/contact`,
    `${siteUrl}/engineering-inspection`,
    `${siteUrl}/`,
    `${siteUrl}/industrial`,
    `${siteUrl}/projects`,
    `${siteUrl}/residential`,
    `${siteUrl}/service-repair`,
    `${siteUrl}/services`,
    `${siteUrl}/solar-bess`,
  ]);
  expect(sitemap).not.toContain('security-policy');
  for (const route of privateRoutes) expect(sitemap).not.toContain(route.replace(/\.html$/, ''));
});

test('robots and page directives exclude every private route', async ({ page, request }) => {
  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.ok()).toBeTruthy();
  const robots = await robotsResponse.text();
  expect(robots).toContain(`Sitemap: ${siteUrl}/sitemap.xml`);

  for (const route of privateRoutes) {
    const cleanRoute = route.replace(/\.html$/, '');
    expect(robots).toContain(`Disallow: ${route}`);
    expect(robots).toContain(`Disallow: ${cleanRoute}`);

    await openPage(page, route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  }

  await openPage(page, '/security-policy.html');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
});

test('public availability claims and generic estimate calls to action stay consistent', async ({
  page,
}) => {
  for (const route of publicRoutes.filter((path) => path !== '/security-policy.html')) {
    await openPage(page, route);
    await expect(page.locator('body')).not.toContainText('24/7');

    const headerCta = page.locator('header.topbar > nav > a.btn.yellow');
    if (route === '/engineering-inspection.html') {
      await expect(headerCta).toHaveText('Request Inspection');
    } else {
      await expect(headerCta).toHaveText('Request a Free Estimate');
    }
  }
});
