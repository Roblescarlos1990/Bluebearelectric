import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { mockPublishedContent, openPage, publicRoutes } from '../support/site.mjs';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await mockPublishedContent(page);
});

for (const route of publicRoutes) {
  test(`public accessibility scan passes on ${route}`, async ({ page }, testInfo) => {
    await openPage(page, route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    await testInfo.attach(`axe-${route === '/' ? 'home' : route.replace(/\W+/g, '-')}.json`, {
      body: Buffer.from(JSON.stringify(results, null, 2)),
      contentType: 'application/json',
    });

    console.log(
      `AXE ${route}: ${results.violations.length} rules, ${results.violations.reduce((sum, violation) => sum + violation.nodes.length, 0)} nodes`,
    );
    if (results.violations.length) {
      console.log(
        JSON.stringify(
          results.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.map((node) => ({
              target: node.target,
              html: node.html,
              failureSummary: node.failureSummary,
            })),
          })),
          null,
          2,
        ),
      );
    }
    expect(
      results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
      })),
    ).toEqual([]);
  });
}
