/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.VITE_COVERAGE === 'true' ? 'http://localhost:5174' : 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.VITE_COVERAGE === 'true' ? 'cross-env VITE_COVERAGE=true vite --port 5174' : 'npm run dev',
    url: process.env.VITE_COVERAGE === 'true' ? 'http://localhost:5174' : 'http://localhost:5173',
    reuseExistingServer: process.env.VITE_COVERAGE === 'true' ? false : !process.env.CI,
  },
});
