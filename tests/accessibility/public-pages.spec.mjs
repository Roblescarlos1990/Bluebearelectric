import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

import { mockPublishedContent, openPage } from '../support/site.mjs';

const baseline = JSON.parse(
  await readFile(new URL('./axe-baseline.json', import.meta.url), 'utf8'),
);
const routes = ['/', '/services.html', '/projects.html', '/contact.html'];

test.beforeEach(async ({ page }) => {
  await mockPublishedContent(page);
});

for (const route of routes) {
  test(`accessibility baseline does not regress on ${route}`, async ({ page }, testInfo) => {
    await openPage(page, route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    await testInfo.attach(`axe-${route === '/' ? 'home' : route.replace(/\W+/g, '-')}.json`, {
      body: Buffer.from(JSON.stringify(results, null, 2)),
      contentType: 'application/json',
    });

    const counts = Object.fromEntries(
      results.violations.map((violation) => [violation.id, violation.nodes.length]),
    );
    const allowed = baseline[route] || {};
    const regressions = Object.entries(counts)
      .filter(([rule, count]) => count > (allowed[rule] || 0))
      .map(([rule, count]) => ({ rule, count, allowed: allowed[rule] || 0 }));

    console.log(
      `AXE ${route}: ${results.violations.length} rules, ${results.violations.reduce((sum, violation) => sum + violation.nodes.length, 0)} nodes`,
    );
    expect(regressions).toEqual([]);
  });
}
