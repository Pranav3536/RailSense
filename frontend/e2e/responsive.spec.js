import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('RailSense E2E — Responsive Viewports & Visual Capture', () => {
  const routes = [
    { name: 'welcome', path: '/' },
    { name: 'overview', path: '/overview' },
    { name: 'trains', path: '/trains' },
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

      const submitBtn = page.getByRole('button', { name: 'Estimate Delay Risk', exact: true });
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      await expect(page.getByRole('heading', { name: 'Prediction Result', exact: true })).toBeVisible({ timeout: 10000 });
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

    const submitBtn = page.getByRole('button', { name: 'Estimate Delay Risk', exact: true });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await expect(page.getByRole('heading', { name: 'Prediction Result', exact: true })).toBeVisible({ timeout: 10000 });

    const collapsibleBtn = page.getByRole('button', { name: 'About this prediction', exact: true });
    await collapsibleBtn.click();
    await expect(page.getByText('Operational threshold:', { exact: true })).toBeVisible();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: path.resolve('../docs/ui/phase11_4/predict_collapsible_1366.png'),
      fullPage: false,
    });
  });

  test('captures Phase 11.5 Model Lab screenshots and verifies feature chart labels non-overlap', async ({ page }) => {
    const fs = await import('fs');
    const outDir = path.resolve(__dirname, '../../docs/ui/phase11_5');
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

      await expect(page.getByRole('heading', { name: 'Top 5 Features' })).toBeVisible({ timeout: 10000 });

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

  test('verifies Phase 11.6 Sidebar telemetry and Delay Patterns polish', async ({ page }) => {
    const fs = await import('fs');
    const outDir = path.resolve(__dirname, '../../docs/ui/phase11_6');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const viewports = [
      { name: '360', width: 360, height: 640 },
      { name: '768', width: 768, height: 1024 },
      { name: '1366', width: 1366, height: 768 },
      { name: '1920', width: 1920, height: 1080 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/patterns');
      await page.waitForLoadState('networkidle');

      // 1. Verify zero horizontal overflow
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(isOverflowing).toBeFalsy();

      // On desktop viewports (1366+), verify Sidebar status
      if (vp.width >= 1366) {
        await expect(page.getByText('System online')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('aside').getByText(/Data as of/)).toBeVisible();
        await expect(page.getByText(/Telemetry/i)).toHaveCount(0);
        await expect(page.getByText('local snapshot')).toHaveCount(0);
      }

      // 2. Check no prompt leak string anywhere on page
      await expect(page.getByText(/Worded as observed empirical association/i)).toHaveCount(0);
      await expect(page.getByText(/never causation/i)).toHaveCount(0);

      // 3. Check section headers have NO bogus "Low Support (<30)" warning pills
      await expect(page.getByText(/7 weekdays Low Support/i)).toHaveCount(0);
      await expect(page.getByText(/20 classes Low Support/i)).toHaveCount(0);
      await expect(page.getByText(/5 position buckets Low Support/i)).toHaveCount(0);

      // 4. Check Wilson CI formatting (has "–" and no square brackets)
      const wilsonCells = page.locator('table tbody tr td').filter({ hasText: /%\s*[-–]\s*/ });
      if ((await wilsonCells.count()) > 0) {
        const text = await wilsonCells.first().textContent();
        expect(text).not.toContain('[');
        expect(text).not.toContain(']');
        expect(text).toContain('–');
      }

      // 5. Check journey sequence bins order
      const sequenceHeading = page.getByRole('heading', { name: /Delays Across Journey Positions/i });
      await expect(sequenceHeading).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: path.join(outDir, `patterns_${vp.name}.png`),
        fullPage: false,
      });
    }
  });

  test('Phase 11.7: Smart Insights visual integrity, telemetry status & query execution (360, 768, 1280, 1366, 1920)', async ({
    page,
  }) => {
    const outDir = path.resolve(__dirname, '../../docs/ui/phase11_7');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/insights');
      await page.waitForLoadState('networkidle');

      // 1. Verify zero horizontal overflow
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(isOverflowing).toBeFalsy();

      // 2. On desktop viewports (1366+), verify Sidebar status strictly
      if (vp.width >= 1366) {
        await expect(page.getByText('System online')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('aside').getByText(/Data as of/)).toBeVisible();
        await expect(page.getByText(/Telemetry/i)).toHaveCount(0);
        await expect(page.getByText('local snapshot')).toHaveCount(0);
      }

      // 3. Verify student / amateur boasting is removed
      await expect(page.getByText(/100%\s*free/i)).toHaveCount(0);
      await expect(page.getByText(/zero paid APIs/i)).toHaveCount(0);
      await expect(page.getByText(/without runtime LLM dependencies/i)).toHaveCount(0);

      // 4. Verify character counter is removed


      // 5. Verify query label
      await expect(page.getByText('Ask a Question', { exact: true })).toBeVisible();

      // 6. Test query submission and result card on 1366 desktop
      if (vp.width === 1366) {
        const input = page.locator('#smart-insights-input');
        const askBtn = page.getByRole('button', { name: /(Ask|Submit)/i });

        // Query 1: Fleet summary
        await input.fill('What is the overall delay rate across Indian Railways?');
        await askBtn.click();

        await expect(page.locator('[role="region"][aria-labelledby="answer-heading"]')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/High Match/i)).toBeVisible();



        // Check raw code snippet and floating Understood: are NOT visible
        await expect(page.locator('code:has-text("fleet_summary")')).toHaveCount(0);
        await expect(page.getByText(/^Understood:$/i)).toHaveCount(0);

        // Check definition note is inside technical provenance accordion and not cluttering body
        const provDetails = page.locator('details:has-text("How Your Question Was Processed")');
        await expect(provDetails).toBeVisible();

        // Query 2: Category ranking (table result)
        await input.fill('Which train category is most delayed?');
        await askBtn.click();
        await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
      }

      // Take screenshot
      await page.screenshot({
        path: path.join(outDir, `insights_${vp.name}.png`),
        fullPage: false,
      });
    }
  });
});
