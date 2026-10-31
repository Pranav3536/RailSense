import { test, expect } from '@playwright/test';

/**
 * RailSense — Post-Deployment Live E2E Smoke Suite (frontend/e2e/deployed.spec.js)
 * Validates the live production site deployed on Vercel + Render.
 * Skipped automatically if DEPLOYED_URL is not set.
 */

const deployedUrl = process.env.DEPLOYED_URL || process.env.PLAYWRIGHT_TEST_BASE_URL || '';

test.describe('RailSense Live Deployed Verification', () => {
  test.beforeEach(async () => {
    test.skip(
      !deployedUrl,
      'DEPLOYED_URL not configured — skipping live deployed verification (Owner will run post-deployment).'
    );
  });

  test('live home & overview loads with KPIs and zero console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(deployedUrl);
    await page.waitForLoadState('networkidle');

    // Confirm main content and key KPIs
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByText(/Total Stops Observed/i)).toBeVisible();
    await expect(page.getByText(/Observed Delayed Rate/i).first()).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('live Train Explorer search and route profile render', async ({ page }) => {
    await page.goto(`${deployedUrl}/explorer`);
    await page.waitForLoadState('networkidle');

    // Search for train 12951
    const searchInput = page.getByPlaceholder(/Search train number or name/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('12951');

    // Confirm train card appears and navigate to route
    await expect(page.getByText('12951')).toBeVisible();
    const trainCard = page.locator('article', { hasText: '12951' }).first();
    await trainCard.click();

    // Verify stops timetable is displayed
    await expect(page.getByText(/Route Timetable & Observed Delays/i)).toBeVisible();
    await expect(page.getByText('BVI')).toBeVisible();
  });

  test('live Delay Prediction submits and renders calibrated risk profile', async ({ page }) => {
    await page.goto(`${deployedUrl}/predict?train=12951&seq=2&date=2026-10-15`);
    await page.waitForLoadState('networkidle');

    // Confirm form prefill
    await expect(page.getByText('Delay Prediction Engine')).toBeVisible();
    const submitBtn = page.getByRole('button', { name: /Predict Delay Probability/i });
    await expect(submitBtn).toBeEnabled();

    // Submit prediction
    await submitBtn.click();

    // Verify result card renders
    await expect(page.getByText('Prediction Result & Risk Profile')).toBeVisible();
    await expect(page.getByText(/Decision at Operational Threshold/i)).toBeVisible();
    await expect(page.getByText(/Model Feature Associations/i)).toBeVisible();
  });

  test('live Model Lab renders benchmark comparison table and architecture', async ({ page }) => {
    await page.goto(`${deployedUrl}/model-lab`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Model Evaluation & Transparency')).toBeVisible();
    await expect(page.getByText('Majority Baseline')).toBeVisible();
    await expect(page.getByText('Train Historical Prior')).toBeVisible();
    await expect(page.getByText('LightGBM (Calibrated)')).toBeVisible();
  });
});
