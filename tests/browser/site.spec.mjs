import { expect, test } from '@playwright/test';

import {
  captureRuntimeErrors,
  mockPublishedContent,
  openPage,
  publicRoutes,
} from '../support/site.mjs';

test.beforeEach(async ({ page }) => {
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

  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(mobileNavigation).toHaveClass(/open/);
  await expect(mobileNavigation.getByRole('link', { name: /Call 760-234-8306/i })).toHaveAttribute(
    'href',
    'tel:7602348306',
  );

  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(mobileNavigation).not.toHaveClass(/open/);
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

  await expect(page.locator('[data-form-status]')).toHaveText(
    'Please complete your name, phone number, and service needed.',
  );
  await expect(page.getByLabel('Full name')).toBeFocused();
  const invalidCount = await page.locator('form[data-lead-form] :invalid').count();
  expect(invalidCount).toBe(3);
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
