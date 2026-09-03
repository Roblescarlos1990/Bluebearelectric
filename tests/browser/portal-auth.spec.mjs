import { expect, test } from '@playwright/test';

import { captureRuntimeErrors, openPage } from '../support/site.mjs';
import { mockPortalSupabase } from '../support/mock-supabase.mjs';

test('employee sign-in reaches pending approval and sign-out returns to authentication', async ({
  page,
}) => {
  const runtimeErrors = captureRuntimeErrors(page);
  await mockPortalSupabase(page, {
    employeeProfile: {
      user_id: 'phase-7-user',
      email: 'pending@example.com',
      full_name: 'Pending Employee',
      active: false,
      approval_status: 'pending',
    },
  });
  await openPage(page, '/employee-portal.html');

  await page.getByLabel('Email').first().fill('pending@example.com');
  await page.getByLabel('Password').first().fill('phase-7-test-password');
  await page.locator('[data-login-form]').getByRole('button', { name: 'Sign In' }).click();

  await expect(page.locator('[data-pending-shell]')).toBeVisible();
  await expect(page.locator('[data-pending-email]')).toHaveText('pending@example.com');
  await expect(page.getByRole('heading', { name: 'Pending Administrator Approval' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('phase7:signIn'))).toBe('1');

  await page.locator('[data-pending-signout]').click();
  await expect(page.locator('[data-auth-shell]')).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('phase7:signOut'))).toBe('1');
  expect(runtimeErrors).toEqual([]);
});

test('password reset entry updates through the authenticated client contract', async ({ page }) => {
  const runtimeErrors = captureRuntimeErrors(page);
  await mockPortalSupabase(page, {
    user: { id: 'phase-7-user', email: 'employee@example.com' },
  });
  await openPage(page, '/reset-password.html');

  await page.getByLabel('New password').fill('phase-7-new-password');
  await page.getByLabel('Confirm password').fill('phase-7-new-password');
  await page.getByRole('button', { name: 'Update Password' }).click();

  await expect(page.locator('[data-reset-status]')).toHaveText(
    'Password updated. You may return to the employee portal.',
  );
  expect(await page.evaluate(() => sessionStorage.getItem('phase7:updateUser'))).toBe('1');
  expect(await page.evaluate(() => sessionStorage.getItem('phase7:lastPasswordLength'))).toBe('20');
  expect(runtimeErrors).toEqual([]);
});

test('public conversion controls stay out of portal and administrator routes', async ({ page }) => {
  await mockPortalSupabase(page);

  await openPage(page, '/');
  await expect(page.locator('.floating-call')).toHaveCount(1);

  for (const route of ['/employee-portal.html', '/reset-password.html', '/admin.html']) {
    await openPage(page, route);
    await expect(page.locator('.floating-call')).toHaveCount(0);
  }
});
