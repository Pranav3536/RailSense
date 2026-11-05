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

  test('captures Phase 11.4 Delay Prediction screenshots', async ({ page }) => {
    // 1. Empty form (1366x768)
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/predict');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.resolve('../docs/ui/phase11_4/predict_empty_1366.png'),
      fullPage: false,
    });

    // 2. Result views at 360, 1366, 1920
    const viewports = [
      { name: '360', width: 360, height: 640 },
      { name: '1366', width: 1366, height: 768 },
      { name: '1920', width: 1920, height: 1080 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/predict?train=12951&seq=4&date=2026-10-20');
      await page.waitForLoadState('networkidle');

      const submitBtn = page.getByRole('button', { name: /Run Prediction|Predict Delay/i });
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      await expect(page.getByText(/Estimated Delay Risk/i)).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.resolve(`../docs/ui/phase11_4/predict_result_${vp.name}.png`),
        fullPage: false,
      });
    }

    // 3. Collapsible open (1366x768)
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/predict?train=12951&seq=4&date=2026-10-20');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.getByRole('button', { name: /Run Prediction|Predict Delay/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await expect(page.getByText(/Estimated Delay Risk/i)).toBeVisible({ timeout: 10000 });

    const collapsibleBtn = page.getByRole('button', { name: /Model assumptions and caveats/i });
    await collapsibleBtn.click();
    await expect(page.getByRole('heading', { name: /Calibration & Operational/i })).toBeVisible();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: path.resolve('../docs/ui/phase11_4/predict_collapsible_1366.png'),
      fullPage: false,
    });
  });

  test('captures Phase 11.5 Model Lab screenshots and verifies feature chart labels non-overlap', async ({ page }) => {
    const fs = await import('fs');
    const outDir = path.resolve('../docs/ui/phase11_5');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const viewports = [
      { name: '360', width: 360, height: 640 },
      { name: '1366', width: 1366, height: 768 },
      { name: '1920', width: 1920, height: 1080 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/model-lab');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Feature Importance')).toBeVisible({ timeout: 10000 });

      // Verify no horizontal overflow
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(isOverflowing).toBeFalsy();

      // Feature Importance chart tick labels non-overlap check
      const tickTexts = page.locator('.recharts-yAxis .recharts-cartesian-axis-tick text');
      const count = await tickTexts.count();
      if (count > 1) {
        let prevBox = null;
        for (let i = 0; i < count; i++) {
          const box = await tickTexts.nth(i).boundingBox();
          if (box && prevBox) {
            const overlap = Math.max(0, Math.min(prevBox.y + prevBox.height, box.y + box.height) - Math.max(prevBox.y, box.y));
            expect(overlap).toBeLessThanOrEqual(2);
          }
          if (box) prevBox = box;
        }
      }

      await page.screenshot({
        path: path.join(outDir, `model_lab_${vp.name}.png`),
        fullPage: false,
      });
    }
  });
});
