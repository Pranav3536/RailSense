import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('RailSense E2E — Phase 11.9 Delay Patterns & Sidebar Verification', () => {
  const outDir = path.resolve(__dirname, '../../docs/ui/phase11_9');

  test.beforeAll(() => {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
  });

  test('verifies all 5 sections, no header badges, interval format, no leaked phrases, axe audit, and captures screenshots', async ({
    page,
  }) => {
    const viewports = [
      { name: '360', width: 360, height: 640 },
      { name: '1366', width: 1366, height: 768 },
      { name: '1920', width: 1920, height: 1080 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/patterns');
      await page.waitForLoadState('networkidle');

      // 1. Assert zero horizontal scroll
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(isOverflowing).toBeFalsy();

      // 2. Capture screenshot into docs/ui/phase11_9/
      await page.screenshot({
        path: path.join(outDir, `patterns_${vp.name}.png`),
        fullPage: false,
      });
    }

    // Comprehensive assertions on 1366 viewport
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/patterns');
    await page.waitForLoadState('networkidle');

    // 1. All 5 sections render
    await expect(page.getByRole('heading', { name: 'Delays by Hour of Day' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Delays by Day of Week' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Delays by Train Category' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Delays Across Journey Positions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Delay Hotspots Explorer' })).toBeVisible();

    // 2. No support badge on section headers
    await expect(page.getByText(/Low Support \(<30\)/i)).toHaveCount(0);
    await expect(page.getByText(/7 weekdays Low Support/i)).toHaveCount(0);
    await expect(page.getByText(/20 classes Low Support/i)).toHaveCount(0);
    await expect(page.getByText(/5 position buckets Low Support/i)).toHaveCount(0);
    await expect(page.getByText(/7 days/i)).toHaveCount(0);

    // 3. Interval format in Hotspots table
    await expect(page.getByRole('columnheader', { name: /95% interval/i })).toBeVisible({ timeout: 15000 });
    const tableIntervalCells = page.locator('table tbody tr td').filter({ hasText: /%\s*[-–]\s*.*%/ });
    expect(await tableIntervalCells.count()).toBeGreaterThan(0);
    const firstCellText = await tableIntervalCells.first().textContent();
    expect(firstCellText).not.toContain('[');
    expect(firstCellText).not.toContain(']');
    expect(firstCellText).toContain('–');

    // 4. Page-text scan for leaked instruction phrases
    const pageText = await page.innerText('body');
    expect(pageText).not.toMatch(/Worded as observed empirical association/i);
    expect(pageText).not.toMatch(/never causation/i);
    expect(pageText).not.toMatch(/Serving store: SQLite/i);
    expect(pageText).not.toMatch(/Data source: RailWise/i);

    // 5. Sidebar status card
    await expect(page.getByText('System online')).toBeVisible();
    await expect(page.locator('aside').getByText(/Data as of 25 Oct 2026/)).toBeVisible();
    expect(pageText).not.toMatch(/Telemetry Core/i);
    expect(pageText).not.toMatch(/TiDB Cloud Connected/i);

    // 6. Axe accessibility audit
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const criticalOrSerious = axeResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalOrSerious).toHaveLength(0);
  });
});
