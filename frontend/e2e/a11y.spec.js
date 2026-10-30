import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('RailSense E2E — Automated Accessibility & Keyboard Suite', () => {
  const routes = [
    { name: 'Overview', path: '/' },
    { name: 'Train Explorer', path: '/explorer' },
    { name: 'Delay Prediction', path: '/predict' },
    { name: 'Model Lab', path: '/model-lab' },
    { name: 'Delay Patterns', path: '/patterns' },
    { name: 'Smart Insights', path: '/insights' },
  ];

  for (const r of routes) {
    test(`axe-core automated audit on ${r.name} route`, async ({ page }) => {
      await page.goto(r.path);
      await page.waitForLoadState('networkidle');

      // Run axe analysis
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Filter critical and serious violations
      const severeViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(severeViolations).toEqual([]);
    });
  }

  test('Skip to main content link works via keyboard Tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Press Tab from initial page load
    await page.keyboard.press('Tab');
    const skipLink = page.getByText(/Skip to main content/i);
    await expect(skipLink).toBeFocused();

    // Activate skip link
    await page.keyboard.press('Enter');
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });

  test('Heading hierarchy has exactly one h1 per page', async ({ page }) => {
    for (const r of routes) {
      await page.goto(r.path);
      await page.waitForLoadState('networkidle');

      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
    }
  });

  test('Smart Insights allows submission via Enter key on keyboard', async ({ page }) => {
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    const input = page.locator('#smart-insights-input');
    await input.focus();
    await input.fill('What is the fleet delayed rate?');
    await page.keyboard.press('Enter');

    // Answer region updates
    await expect(page.locator('[role="region"][aria-live="polite"]')).toBeVisible({ timeout: 5000 });
  });
});
