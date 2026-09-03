import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PHASE1_TEST_PORT || 43118);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: '.',
  testMatch: /tests\/(?:accessibility|browser)\/.*\.spec\.mjs/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  globalSetup: './tests/support/global-setup.mjs',
  timeout: 30_000,
  expect: {
    timeout: 7_500,
  },
  use: {
    baseURL,
    browserName: 'chromium',
    colorScheme: 'dark',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : undefined,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? 'off' : 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark', reducedMotion: 'reduce' },
    },
  ],
});
