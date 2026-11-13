import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('RailSense E2E — Phase 11.7 Visual Capture', () => {
  test('captures Phase 11.7 Welcome and Train Hub screenshots at 1366x768', async ({ page }) => {
    const outDir = path.resolve(__dirname, '../../docs/ui/phase11_7');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    await page.setViewportSize({ width: 1366, height: 768 });

    // 1. Welcome page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1, name: /Home|Welcome/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Get Started|Start Here/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: path.join(outDir, 'welcome_1366.png'),
      fullPage: false,
    });

    // 2. Train Hub Catalog
    await page.goto('/trains');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#train-search-input')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a[href*="/trains/"]').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: path.join(outDir, 'trainhub_catalog_1366.png'),
      fullPage: false,
    });

    // 3. Train Hub Detail (12951)
    await page.goto('/trains/12951');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Canonical Timetable & Stop Delay Rates/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: path.join(outDir, 'trainhub_detail_1366.png'),
      fullPage: false,
    });

    // 4. Train Hub Result (12951 pre-departure prediction result)
    await page.goto('/trains/12951?seq=4&date=2026-10-20');
    await page.waitForLoadState('networkidle');
    const submitBtn = page.getByRole('button', { name: 'Estimate Delay Risk', exact: true });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await expect(page.getByRole('heading', { name: 'Prediction Result', exact: true })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(outDir, 'trainhub_result_1366.png'),
      fullPage: false,
    });
  });
});
