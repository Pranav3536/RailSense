import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('RailSense E2E — Phase 11.10 Benchmark & Home Navigation', () => {
  const outDir = path.resolve(__dirname, '../../docs/ui/phase11_10');

  test.beforeAll(() => {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
  });

  test('Home page renders with "Home" / "Get Started", dynamic highlights, and passes Axe audit', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify Page Header
    await expect(page.getByRole('heading', { level: 1, name: /Home/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Get Started')).toBeVisible({ timeout: 10000 });

    // Verify 3 CTAs
    await expect(page.getByRole('link', { name: /Open Train Hub/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /View Network Trends/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /Check Model Performance/i })).toBeVisible({ timeout: 10000 });

    // Verify Sidebar Tab Label is "Home"
    await expect(page.locator('aside nav').getByText('Home', { exact: true })).toBeVisible({ timeout: 10000 });

    // Screenshot
    await page.screenshot({
      path: path.join(outDir, 'home_1366.png'),
      fullPage: false,
    });

    // Axe audit
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const severe = axeResults.violations.filter((v) => ['critical', 'serious'].includes(v.impact));
    expect(severe).toEqual([]);
  });

  test('Model Lab renders algorithm benchmark table, Why LightGBM, and passes Axe audit', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/model-lab');
    await page.waitForLoadState('networkidle');

    // Verify Benchmark Table & Columns
    await expect(page.getByText('Model Comparison')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: /Held-out test set/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: /Validation set/i })).toBeVisible({ timeout: 10000 });

    // Verify key models in benchmark table
    await expect(page.getByText('LightGBM (Calibrated)', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Final model', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Logistic Regression', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Random Forest', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('XGBoost', { exact: true })).toBeVisible({ timeout: 10000 });

    // Verify "Why LightGBM" card
    await expect(page.getByText('Why LightGBM for Production')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Rank #1 on Validation Split')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sub-2ms Single-Row Latency')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Compact Footprint (1.97 MB)')).toBeVisible({ timeout: 10000 });

    // Toggle Other Techniques collapsible
    const otherTechniquesToggle = page.getByRole('button', { name: /Toggle other evaluated techniques details/i });
    await expect(otherTechniquesToggle).toBeVisible({ timeout: 10000 });
    await otherTechniquesToggle.click();

    // Verify PCA and K-Means details
    await expect(page.getByText('Principal Component Analysis (PCA)', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('K-Means Clustering', { exact: true })).toBeVisible({ timeout: 10000 });

    // Screenshot
    await page.screenshot({
      path: path.join(outDir, 'model_lab_benchmark_1366.png'),
      fullPage: false,
    });

    // Axe audit
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const severe = axeResults.violations.filter((v) => ['critical', 'serious'].includes(v.impact));
    expect(severe).toEqual([]);
  });

  test('Model Lab renders on mobile 360px without document horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/model-lab');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Model Comparison')).toBeVisible({ timeout: 10000 });

    // Verify document does not have horizontal overflow
    const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const docClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(docScrollWidth).toBeLessThanOrEqual(docClientWidth + 1);

    // Screenshot
    await page.screenshot({
      path: path.join(outDir, 'model_lab_mobile_360.png'),
      fullPage: false,
    });
  });
});
