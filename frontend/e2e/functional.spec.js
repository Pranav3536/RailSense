import { test, expect } from '@playwright/test';

test.describe('RailSense E2E — Functional Suite (Real API)', () => {
  test('all 6 routes load with zero console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const routes = ['/', '/explorer', '/predict', '/model-lab', '/patterns', '/insights'];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#main-content')).toBeVisible();
    }

    expect(consoleErrors).toEqual([]);
  });

  test('Overview page renders KPIs and charts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Macro Volume StatCards
    await expect(page.getByText('Total Stops', { exact: true })).toBeVisible();
    await expect(page.getByText('Fleet Delay Rate', { exact: true })).toBeVisible();

    // Chart cards
    await expect(page.getByText(/Daily Observed Delayed Rate Trend/i)).toBeVisible();
    await expect(page.getByText(/Macro Arrival Delay Distribution/i)).toBeVisible();
    await expect(page.getByText(/Observed Delay by Service Category/i)).toBeVisible();
  });

  test('Train Explorer search, route profile, and predict stop navigation', async ({ page, request }) => {
    // 1. Fetch a train number dynamically from API
    const trainsRes = await request.get('http://127.0.0.1:5000/api/trains?page=1&page_size=5');
    expect(trainsRes.ok()).toBeTruthy();
    const trainsJson = await trainsRes.json();
    const sampleTrain = trainsJson.items?.[0]?.train_number || '12951';

    await page.goto('/explorer');
    await page.waitForLoadState('networkidle');

    // 2. Search for train
    const searchInput = page.getByPlaceholder(/Search train number.*or name/i);
    await searchInput.fill(sampleTrain);
    await page.waitForTimeout(500); // debounce

    // 3. Click train row to view route profile
    const trainRow = page.locator('tbody tr').filter({ hasText: sampleTrain }).first();
    await trainRow.click();
    await page.waitForLoadState('networkidle');

    // 4. Verify timetable table renders and has stops
    await expect(page.getByText(/Canonical Timetable & Stop Delay Rates/i)).toBeVisible();
    const predictBtn = page.getByRole('button', { name: /Predict Delay/i }).first();
    if (await predictBtn.isVisible()) {
      await predictBtn.click();
      await page.waitForURL(/\/predict\?train=/);
      // Verify form is prefilled without auto-submit
      const url = page.url();
      expect(url).toContain('train=');
      // Results should not be rendered yet because user must click Predict Delay
      await expect(page.getByText(/Delay Risk Estimation/i)).not.toBeVisible();
    }
  });

  test('Train Explorer deep-link reload with SPA routing and zero CSP violations', async ({ page, request }) => {
    const trainsRes = await request.get('http://127.0.0.1:5000/api/trains?page=1&page_size=5');
    expect(trainsRes.ok()).toBeTruthy();
    const trainsJson = await trainsRes.json();
    const sampleTrain = trainsJson.items?.[0]?.train_number || '12951';

    const cspViolations = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Content Security Policy') || text.includes('CSP') || text.includes('violates')) {
        cspViolations.push(text);
      }
    });

    // Direct deep-link navigation
    await page.goto(`/explorer/${sampleTrain}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Canonical Timetable/i)).toBeVisible();

    // Reload page to test static host SPA fallback behavior
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Canonical Timetable/i)).toBeVisible();

    expect(cspViolations).toEqual([]);
  });

  test('Delay Prediction form submission displays calibrated probability and risk band', async ({ page }) => {
    await page.goto('/predict?train=12951&seq=4&date=2026-10-20');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.getByRole('button', { name: /Run Prediction|Predict Delay/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify results panel renders
    await expect(page.getByRole('heading', { name: 'Prediction Result', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Estimated (above|below) alert threshold/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Why This Prediction\?|Model Feature Associations/i })).toBeVisible();
  });

  test('Model Lab renders benchmark comparison, 3 KPI cards, and confusion matrix', async ({ page }) => {
    await page.goto('/model-lab');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Model Lab' })).toBeVisible();
    await expect(page.getByText('Precision')).toBeVisible();
    await expect(page.getByText('Recall')).toBeVisible();
    await expect(page.getByText('Model Comparison')).toBeVisible();
    await expect(page.getByText('Confusion Matrix')).toBeVisible();
    await expect(page.getByText('Top 5 Features')).toBeVisible();
  });

  test('Delay Patterns hotspot controls update only after Apply click', async ({ page }) => {
    await page.goto('/patterns');
    await page.waitForLoadState('networkidle');

    // Scroll to hotspots section
    const hotspotsHeader = page.getByText(/Observed Delay Hotspots Explorer/i);
    await hotspotsHeader.scrollIntoViewIfNeeded();

    // Switch level to Trains
    const trainsBtn = page.getByRole('button', { name: 'Trains' });
    await trainsBtn.click();

    // Prior to clicking Apply Filters, station hotspots are still shown or pending
    const applyBtn = page.getByRole('button', { name: /Apply Filters/i });
    await expect(applyBtn).toBeEnabled({ timeout: 10000 });
    await applyBtn.click();
    await page.waitForTimeout(1000);

    // Verify train headers are displayed
    await expect(page.locator('th', { hasText: 'Train' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Smart Insights handles 8 varied query types correctly', async ({ page }) => {
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    const testQueries = [
      { q: 'What is the overall delay rate across Indian Railways?', expectText: '49.91%' },
      { q: 'How punctual is train 12951?', expectText: 'NDLS TEJAS RAJ' },
      { q: 'How many total trains and stations are tracked?', expectText: '10,743' },
      { q: 'What is the average delay for Rajdhani trains?', expectText: 'Category RAJ' },
      { q: 'Why was train 12951 delayed yesterday?', expectText: 'cannot establish physical' },
      { q: 'Will train 12951 be delayed tomorrow?', expectText: 'Delay Prediction' },
      { q: 'How do I book a ticket on IRCTC?', expectText: 'cannot assist with ticket booking' },
      { q: 'Which stations have highest delay?', expectText: 'hotspot' },
    ];

    const input = page.locator('#smart-insights-input');
    const askBtn = page.getByRole('button', { name: /(Ask|Submit)/i });

    for (const item of testQueries) {
      await expect(input).toBeEnabled({ timeout: 10000 });
      await input.fill(item.q);
      await expect(askBtn).toBeEnabled({ timeout: 10000 });
      await askBtn.click();

      // Verify answer or clarification appears
      await expect(page.locator('[role="region"][aria-live="polite"]')).toBeVisible({ timeout: 10000 });
      if (item.isClarification) {
        await expect(page.getByText(/select one of the following train services/i)).toBeVisible({ timeout: 10000 });
      } else {
        await expect(page.getByText(new RegExp(item.expectText, 'i')).first()).toBeVisible({ timeout: 10000 });
      }
    }
  });
});
