import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('RailSense E2E — Responsive Viewports & Visual Capture', () => {
  const routes = [
    { name: 'overview', path: '/' },
    { name: 'explorer', path: '/explorer' },
    { name: 'predict', path: '/predict' },
    { name: 'model-lab', path: '/model-lab' },
    { name: 'patterns', path: '/patterns' },
    { name: 'insights', path: '/insights' },
  ];

  const viewports = [
    { name: '360', width: 360, height: 640 },
    { name: '768', width: 768, height: 1024 },
    { name: '1280', width: 1280, height: 720 },
    { name: '1366', width: 1366, height: 768 },
    { name: '1920', width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    test(`asserts zero horizontal scroll at ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const r of routes) {
        await page.goto(r.path);
        await page.waitForLoadState('networkidle');

        // Check horizontal overflow
        const isOverflowing = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(isOverflowing).toBeFalsy();
      }
    });
  }

  test('captures screenshots for all routes at 360, 1366, and 1920 viewports', async ({ page }) => {
    const screenshotViewports = [
      { name: '360', width: 360, height: 640 },
      { name: '1366', width: 1366, height: 768 },
      { name: '1920', width: 1920, height: 1080 },
    ];

    for (const vp of screenshotViewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const r of routes) {
        await page.goto(r.path);
        await page.waitForLoadState('networkidle');

        const screenshotPath = path.resolve(
          `../docs/ui/phase10/${r.name}_${vp.name}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: false });
      }
    }
  });

  test('sidebar footer is visible without clipping at 1366x768 and 1280x720', async ({ page }) => {
    for (const width of [1280, 1366]) {
      await page.setViewportSize({ width, height: 720 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const footer = page.locator('aside').getByText(/Creator & Maintainer/i);
      await expect(footer).toBeVisible();
    }
  });
});
