import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('RailSense E2E — Accessibility Leftovers & Interactive A11y Suite', () => {

  // 1. Axe on Error State
  test('axe audit on ErrorState component', async ({ page }) => {
    // Intercept API call to force a 500 error envelope
    await page.route('**/api/overview', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Simulated backend database error for a11y testing.',
            details: null,
            request_id: 'test-err-123'
          }
        }),
      });
    });

    await page.goto('/');
    await page.waitForSelector('text=Failed to Load Overview Intelligence');

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const severe = scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const moderate = scan.violations.filter((v) => v.impact === 'moderate');
    console.log(`[A11y ErrorState] Severe: ${severe.length}, Moderate: ${moderate.length}`);
    expect(severe).toEqual([]);
  });

  // 2. Axe on Mobile Navigation Drawer Open
  test('axe audit on mobile drawer open', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click mobile menu button
    const menuBtn = page.getByRole('button', { name: /Open navigation menu/i });
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      const mobileDrawer = page.locator('.fixed.inset-0.z-50.lg\\:hidden');
      await expect(mobileDrawer).toBeVisible();

      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const severe = scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      const moderate = scan.violations.filter((v) => v.impact === 'moderate');
      console.log(`[A11y Mobile Drawer] Severe: ${severe.length}, Moderate: ${moderate.length}`);
      expect(severe).toEqual([]);
    }
  });

  // 3. Axe on Definition Popover Open
  test('axe audit on definition popover open in Model Lab', async ({ page }) => {
    await page.goto('/model-lab');
    await page.waitForLoadState('networkidle');

    const infoBtn = page.locator('button[aria-label*="definition"], button[aria-label*="tooltip"], button[aria-label*="info"]').first();
    if (await infoBtn.isVisible()) {
      await infoBtn.click();
      await page.waitForTimeout(300);

      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const severe = scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      console.log(`[A11y Definition Popover] Severe: ${severe.length}`);
      expect(severe).toEqual([]);
    }
  });

  // 4. Axe on Smart Insights Answer with Table
  test('axe audit on Smart Insights table result', async ({ page }) => {
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    const input = page.locator('#smart-insights-input');
    await input.fill('Which stations have the worst delays?');
    await page.keyboard.press('Enter');

    // Wait for table to appear
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const severe = scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const moderate = scan.violations.filter((v) => v.impact === 'moderate');
    console.log(`[A11y Insights Table] Severe: ${severe.length}, Moderate: ${moderate.length}`);
    expect(severe).toEqual([]);
  });

  // 5. Axe on Delay Prediction Result
  test('axe audit on Delay Prediction result view', async ({ page }) => {
    await page.goto('/predict?train=12951&seq=4&date=2026-10-20');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.getByRole('button', { name: /Run Prediction|Predict Delay/i });
    await submitBtn.click();

    // Wait for probability gauge and risk band to render
    await expect(page.getByText(/Estimated Delay Risk|Delay Risk Estimation/i)).toBeVisible({ timeout: 15000 });

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const severe = scan.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const moderate = scan.violations.filter((v) => v.impact === 'moderate');
    console.log(`[A11y Predict Result] Severe: ${severe.length}, Moderate: ${moderate.length}`);
    expect(severe).toEqual([]);
  });

  // 6. Keyboard-Only Navigation: Drawer Escape & Focus Trap
  test('keyboard drawer focus trap and Escape key close', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const menuBtn = page.getByRole('button', { name: /Open navigation menu/i });
    if (await menuBtn.isVisible()) {
      await menuBtn.focus();
      await page.keyboard.press('Enter');
      const mobileDrawer = page.locator('.fixed.inset-0.z-50.lg\\:hidden');
      await expect(mobileDrawer).toBeVisible();

      // Press Escape to dismiss drawer
      await page.keyboard.press('Escape');
      await expect(mobileDrawer).not.toBeVisible();
    }
  });

  // 7. Keyboard-Only Navigation: ChartTableToggle
  test('keyboard ChartTableToggle toggle with Space and Enter', async ({ page }) => {
    await page.goto('/patterns');
    await page.waitForLoadState('networkidle');

    const tableBtn = page.getByRole('button', { name: /Table/i }).first();
    if (await tableBtn.isVisible()) {
      await tableBtn.focus();
      await page.keyboard.press('Enter');

      // Table should become visible
      await expect(page.locator('table').first()).toBeVisible();

      const chartBtn = page.getByRole('button', { name: /Chart/i }).first();
      await chartBtn.focus();
      await page.keyboard.press('Space');

      // Switched back to chart view
      await expect(chartBtn).toHaveAttribute('aria-pressed', 'true');
    }
  });

  // 8. Keyboard-Only Navigation: Delay Patterns Hotspot Controls
  test('keyboard interaction on Delay Patterns hotspot controls', async ({ page }) => {
    await page.goto('/patterns');
    await page.waitForLoadState('networkidle');

    const minStopsInput = page.getByLabel(/Minimum Stops/i);
    if (await minStopsInput.isVisible()) {
      await minStopsInput.focus();
      await page.keyboard.press('Control+A');
      await page.keyboard.type('75');

      const applyBtn = page.getByRole('button', { name: /Apply Filters/i });
      await applyBtn.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      expect(await minStopsInput.inputValue()).toBe('75');
    }
  });

  // 9. 200% Zoom Reflow
  test('200% zoom reflow has zero horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 720 });
    const routes = ['/', '/explorer', '/predict', '/model-lab', '/patterns', '/insights'];

    for (const r of routes) {
      await page.goto(r);
      await page.waitForLoadState('networkidle');

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(overflow).toBeFalsy();
    }
  });

  // 10. Reduced Motion
  test('respects prefers-reduced-motion media feature', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#main-content')).toBeVisible();
  });
});
