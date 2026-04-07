import { test, expect } from '@playwright/test';
import { setupBaseApiMocks } from './utils/apiMocks';

test('diagnostic - dashboard loads', async ({ page }) => {
  await setupBaseApiMocks(page);
  await page.goto('/');
  await expect(page.getByText('My Workflows')).toBeVisible({ timeout: 15000 });
  console.log('Dashboard loaded successfully');
});
