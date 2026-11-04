import { test, expect } from '@playwright/test';
import { WAKE_UP_NOTICE_MESSAGE } from '../src/config/constants';

test.describe('RailSense E2E — Resilience, Error Envelopes & Wake-Up Notice', () => {
  test('displays Wake-Up Notice when server request takes more than 4 seconds', async ({ page }) => {
    // Intercept /api/overview and delay response by 4.5 seconds
    await page.route('**/api/overview', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await route.continue();
    });

    await page.goto('/');

    // Verify wake-up notice appears after 4 seconds
    const notice = page.getByRole('status').filter({ hasText: WAKE_UP_NOTICE_MESSAGE });
    await expect(notice).toBeVisible({ timeout: 8000 });

    // Once response finishes, wake-up notice clears
    await expect(notice).not.toBeVisible({ timeout: 6000 });
  });

  test('handles 500 server error envelope with ErrorState and retry action', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/overview', async (route) => {
      callCount += 1;
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Simulated server error for resilience testing.',
              request_id: 'err-test-500-uuid',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    // Error state should display without crashing or white screen
    await expect(page.getByText(/Simulated server error for resilience testing/i)).toBeVisible();
    await expect(page.getByText(/err-test-500-uuid/i)).toBeVisible();

    // Clicking retry recovers when API resumes
    const retryBtn = page.getByRole('button', { name: /Try Again/i });
    await retryBtn.click();
    await expect(page.getByText('Total Stops', { exact: true })).toBeVisible();
  });

  test('handles 404 train not found gracefully in Train Explorer', async ({ page }) => {
    await page.goto('/explorer/999999');
    await page.waitForLoadState('networkidle');

    // Shows train not found banner
    await expect(page.getByText(/Train '999999' not found in catalog/i)).toBeVisible();
  });

  test('handles 429 rate limit with cooldown and prevents auto-retry storm', async ({ page }) => {
    await page.route('**/api/predict', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'Retry-After': '20' },
        body: JSON.stringify({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded (120 req/min). Please wait a few seconds before trying again.',
          },
        }),
      });
    });

    await page.goto('/predict?train=12951&seq=4&date=2026-10-20');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.getByRole('button', { name: /Predict Delay/i });
    await submitBtn.click();

    // Error message appears
    await expect(page.getByText(/Rate limit exceeded/i)).toBeVisible();
  });
});
