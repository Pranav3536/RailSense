import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: path.join(__dirname, 'e2e'),
  testMatch: /.*\.spec\.js/,
  testIgnore: ['**/src/**', '**/node_modules/**'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `${path.join(__dirname, '..', 'backend', '.venv', 'Scripts', 'python.exe')} ${path.join(__dirname, '..', 'backend', 'wsgi.py')}`,
      url: 'http://127.0.0.1:5000/api/health',
      reuseExistingServer: false,
      timeout: 45000,
      env: {
        ...process.env,
        RATE_LIMIT_MAX: '5000',
      },
    },
    {
      command: 'npm run preview -- --port 5173 --host 127.0.0.1',
      cwd: __dirname,
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
      timeout: 45000,
    },
  ],
});
