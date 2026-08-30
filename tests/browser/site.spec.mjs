import { expect, test } from '@playwright/test';

import {
  captureRuntimeErrors,
  mockPublishedContent,
  openPage,
  publicRoutes,
} from '../support/site.mjs';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await mockPublishedContent(page);
});

test('homepage loads with its primary conversion content and no runtime errors', async ({
  page,
}) => {
  const runtimeErrors = captureRuntimeErrors(page);
  await openPage(page, '/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Imperial County/i);
  await expect(page.getByRole('link', { name: /Call Blue Bear Electric/i })).toHaveAttribute(
    'href',
    'tel:7602348306',
  );
  expect(runtimeErrors).toEqual([]);
});

test('desktop navigation and estimate call to action reach the expected pages', async ({
  page,
}) => {
  await openPage(page, '/');
  const desktopNavigation = page.locator('.links');
  await expect(desktopNavigation).toBeVisible();
  await desktopNavigation.getByRole('link', { name: 'Services', exact: true }).click();
  await expect(page).toHaveURL(/\/services\.html$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Services' })).toBeVisible();

  await openPage(page, '/');
  await page.getByRole('link', { name: 'Request My Estimate', exact: true }).click();
  await expect(page).toHaveURL(/\/contact\.html$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Contact' })).toBeVisible();
});

test('mobile navigation opens, closes, and retains the phone link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, '/');

  const menuButton = page.locator('button.hamb');
  const mobileNavigation = page.locator('#mobile-navigation');
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(mobileNavigation).toHaveAttribute('aria-hidden', 'true');
  await expect(mobileNavigation).toBeHidden();

  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(mobileNavigation).toHaveAttribute('aria-hidden', 'false');
  await expect(mobileNavigation).toHaveClass(/open/);
  await expect(mobileNavigation.getByRole('link').first()).toBeFocused();
  await expect(mobileNavigation.getByRole('link', { name: /Call 760-234-8306/i })).toHaveAttribute(
    'href',
    'tel:7602348306',
  );
  const touchTargets = [menuButton, mobileNavigation.getByRole('link').first()];
  for (const target of touchTargets) {
    const box = await target.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  await page.keyboard.press('Escape');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menuButton).toBeFocused();
  await expect(mobileNavigation).toHaveAttribute('aria-hidden', 'true');
  await expect(mobileNavigation).not.toHaveClass(/open/);
  await expect(mobileNavigation).toBeHidden();
});

test('public pages expose a skip link, one main landmark, and one accessible primary heading', async ({
  page,
}) => {
  for (const route of publicRoutes) {
    await openPage(page, route);
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  }
});

test('primary navigation has an accessible name and indicates the current page', async ({
  page,
}) => {
  const routes = ['/', '/services.html', '/industrial.html', '/projects.html', '/about.html'];
  for (const route of routes) {
    await openPage(page, route);
    const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(navigation).toHaveCount(1);
    await expect(navigation.locator('.links [aria-current="page"]')).toHaveCount(1);
  }
});

test('public html and clean routes stay available with consistent navigation and canonicals', async ({
  page,
  request,
}) => {
  const expectedNavigation = [
    ['Home', 'index.html'],
    ['Services', 'services.html'],
    ['Industrial', 'industrial.html'],
    ['Commercial', 'commercial.html'],
    ['Residential', 'residential.html'],
    ['Solar & BESS', 'solar-bess.html'],
    ['Drone & Thermal', 'engineering-inspection.html'],
    ['Projects', 'projects.html'],
    ['About', 'about.html'],
    ['Contact', 'contact.html'],
    ['Portal', 'customer-portal.html'],
  ];
  const expectedMobileNavigation = [
    ['Services', 'services.html'],
    ['Industrial', 'industrial.html'],
    ['Projects', 'projects.html'],
    ['Contact', 'contact.html'],
    ['Portal', 'customer-portal.html'],
    ['Call 760-234-8306', 'tel:7602348306'],
  ];
  const canonicalUrls = new Set();

  for (const route of publicRoutes) {
    const htmlRoute = route === '/' ? '/index.html' : route;
    const cleanRoute = htmlRoute === '/index.html' ? '/' : htmlRoute.replace(/\.html$/, '');
    expect(
      (await request.get(htmlRoute)).ok(),
      htmlRoute + ' should remain available',
    ).toBeTruthy();
    expect(
      (await request.get(cleanRoute)).ok(),
      cleanRoute + ' should remain available',
    ).toBeTruthy();

    await openPage(page, htmlRoute);
    const expectedCanonical =
      'https://bluebearelectric.com' + (cleanRoute === '/' ? '/' : cleanRoute);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute('href', expectedCanonical);
    canonicalUrls.add(await canonical.getAttribute('href'));

    if (route === '/security-policy.html') continue;
    const navigation = await page
      .locator('.links a')
      .evaluateAll((links) =>
        links.map((link) => [link.textContent.trim(), link.getAttribute('href')]),
      );
    expect(navigation).toEqual(expectedNavigation);
    const mobileNavigation = await page
      .locator('#mobile-navigation a')
      .evaluateAll((links) =>
        links.map((link) => [link.textContent.trim(), link.getAttribute('href')]),
      );
    expect(mobileNavigation).toEqual(expectedMobileNavigation);
    const footer = page.locator('footer.footer');
    await expect(footer).toContainText('760-234-8306');
    await expect(footer).toContainText('Imperial County, CA');
    await expect(footer).toContainText('1141313');
  }

  expect(canonicalUrls.size).toBe(publicRoutes.length);
});

test('service cards preserve the six expected destinations', async ({ page }) => {
  await openPage(page, '/services.html');
  const expectedDestinations = new Map([
    ['Industrial Electrical', 'industrial.html'],
    ['Commercial', 'commercial.html'],
    ['Residential', 'residential.html'],
    ['Solar & BESS', 'solar-bess.html'],
    ['Service & Repair', 'service-repair.html'],
    ['Drone Inspection & Thermal Diagnostics', 'engineering-inspection.html'],
  ]);

  for (const [name, href] of expectedDestinations) {
    await expect(page.locator('.service-card', { hasText: name })).toHaveAttribute('href', href);
  }
});

test('project filters and lightbox remain interactive', async ({ page }) => {
  await openPage(page, '/projects.html');
  await page.getByRole('button', { name: 'Testing', exact: true }).click();
  await expect(page.locator('.premium-project-card:not(.is-hidden)')).toHaveCount(2);

  await page.getByRole('button', { name: 'Open insulation resistance testing project' }).click();
  const lightbox = page.locator('[data-project-lightbox]');
  await expect(lightbox).toBeVisible();
  await expect(lightbox.getByRole('dialog')).toContainText('Insulation Resistance Testing');
  await expect(lightbox.locator('[data-lightbox-image]')).toHaveAttribute('src', /testing\.jpg$/);

  await page.keyboard.press('Escape');
  await expect(lightbox).toBeHidden();
});

test('contact form reports required-field errors without sending a request', async ({ page }) => {
  await openPage(page, '/contact.html');
  await page.getByRole('button', { name: 'Send My Estimate Request' }).click();

  const summary = page.locator('[data-form-error-summary]');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(summary.getByRole('link')).toHaveCount(3);
  await expect(page.locator('[name="full_name"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[name="phone"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[name="service_type"]')).toHaveAttribute('aria-invalid', 'true');
  await summary.getByRole('link', { name: 'Enter your full name.' }).click();
  await expect(page.getByLabel(/Full name/)).toBeFocused();
  const invalidCount = await page.locator('form[data-lead-form] :invalid').count();
  expect(invalidCount).toBe(3);
});

test('contact form reports an invalid email beside the field and in the error summary', async ({
  page,
}) => {
  await openPage(page, '/contact.html');
  await page.getByLabel(/Full name/).fill('Phase Three Test');
  await page.getByLabel(/Phone number/).fill('760-555-0100');
  await page.getByLabel(/Email address/).fill('not-an-email');
  await page.getByLabel(/Service needed/).selectOption({ label: 'Commercial' });
  await page.getByRole('button', { name: 'Send My Estimate Request' }).click();

  await expect(page.locator('[data-field-error="email"]')).toHaveText(
    'Enter an email address in the format name@example.com.',
  );
  await expect(page.locator('[data-form-error-summary]')).toContainText(
    'Enter an email address in the format name@example.com.',
  );
});

test('mocked successful estimate submission announces success and manages dialog focus', async ({
  page,
}) => {
  await page.route('**/api/quote', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, reference: 'PHASE3QA' }),
    });
  });
  await openPage(page, '/contact.html');
  await page.getByLabel(/Full name/).fill('Phase Three Test');
  await page.getByLabel(/Phone number/).fill('760-555-0100');
  await page.getByLabel(/Service needed/).selectOption({ label: 'Commercial' });
  const submit = page.getByRole('button', { name: 'Send My Estimate Request' });
  await submit.click();

  const dialog = page.getByRole('dialog', { name: /Thank You/i });
  await expect(dialog).toBeVisible();
  await expect(page.locator('[data-form-status]')).toContainText('Request delivered securely');
  await expect(dialog.getByRole('button', { name: 'Done' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(submit).toBeFocused();
});

test('mocked submission failure is announced and moves focus to the error summary', async ({
  page,
}) => {
  await page.route('**/api/quote', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        message: 'The request system is temporarily unavailable.',
      }),
    });
  });
  await openPage(page, '/contact.html');
  await page.getByLabel(/Full name/).fill('Phase Three Test');
  await page.getByLabel(/Phone number/).fill('760-555-0100');
  await page.getByLabel(/Service needed/).selectOption({ label: 'Commercial' });
  await page.getByRole('button', { name: 'Send My Estimate Request' }).click();

  const summary = page.locator('[data-form-error-summary]');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('The request system is temporarily unavailable.');
  await expect(page.locator('[data-form-status]')).toHaveAttribute('role', 'alert');
});

test('interactive service diagrams support arrow-key tab navigation', async ({ page }) => {
  const diagrams = [
    { route: '/residential.html', tablist: 'Residential electrical systems' },
    { route: '/solar-bess.html', tablist: 'Solar energy flow stages' },
    { route: '/engineering-inspection.html', tablist: 'Inspection image mode' },
  ];

  for (const { route, tablist } of diagrams) {
    await openPage(page, route);
    const tabs = page.getByRole('tablist', { name: tablist }).getByRole('tab');
    const first = tabs.first();
    const second = tabs.nth(1);
    await first.focus();
    await page.keyboard.press('ArrowRight');
    await expect(second).toBeFocused();
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(first).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      await second.getAttribute('id'),
    );
  }
});

test('customer, employee, and admin entry points remain available', async ({ page }) => {
  await openPage(page, '/customer-portal.html');
  await expect(page).toHaveURL(/\/employee-portal\.html$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Blue Bear Employee Portal' }),
  ).toBeVisible();

  await openPage(page, '/employee-portal.html');
  await expect(page.locator('[data-login-form]')).toBeVisible();

  await openPage(page, '/admin.html');
  await expect(page.locator('[data-login-form]')).toBeAttached();
  await expect(page).toHaveTitle(/VoltFlow V8\.9/);
});

test('public pages do not develop horizontal overflow at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of publicRoutes) {
    await openPage(page, route);
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, `${route} should fit the mobile viewport`).toBeLessThanOrEqual(
      dimensions.clientWidth,
    );
  }
});

test('public pages reflow at a viewport equivalent to 200 percent browser zoom', async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 900 });

  for (const route of publicRoutes) {
    await openPage(page, route);
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, `${route} should reflow at 200% zoom`).toBeLessThanOrEqual(
      dimensions.clientWidth,
    );
  }
});

test('core public pages tolerate WCAG text-spacing overrides', async ({ page }) => {
  const routes = ['/', '/services.html', '/projects.html', '/contact.html'];
  for (const route of routes) {
    await openPage(page, route);
    await page.addStyleTag({
      content: `
        * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
        p { margin-bottom: 2em !important; }
      `,
    });
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, `${route} should tolerate text spacing`).toBeLessThanOrEqual(
      dimensions.clientWidth,
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});
