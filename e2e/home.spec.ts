import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load and display welcome window', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Clawntawn/);

    // Check main heading is visible (use role for specificity)
    await expect(page.getByRole('heading', { name: 'CLAWNTAWN' })).toBeVisible();

    // Check tagline is visible
    await expect(page.getByText('A coastal lobster town that evolves itself')).toBeVisible();
  });

  test('should display Mayor Clawrence card', async ({ page }) => {
    await page.goto('/');

    // Check Mayor card is visible (use exact match)
    await expect(page.getByText('Mayor Clawrence', { exact: true })).toBeVisible();

    // Check office hours section exists
    await expect(page.getByText('Mayor Clawrence - Office Hours')).toBeVisible();
  });

  test('should have interactive buttons', async ({ page }) => {
    await page.goto('/');

    // Check main navigation buttons exist
    await expect(page.getByRole('button', { name: /Enter Town Hall/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /View Projects/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Visit Forums/i })).toBeVisible();

    // Check Mayor interaction buttons
    await expect(page.getByRole('button', { name: /Raise Hand/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Watch/i })).toBeVisible();
  });

  test('should display treasury and citizen count', async ({ page }) => {
    await page.goto('/');

    // Check stats are displayed
    await expect(page.getByText(/Treasury:/)).toBeVisible();
    await expect(page.getByText(/Citizens:/)).toBeVisible();
  });

  test('should have retro styling', async ({ page }) => {
    await page.goto('/');

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'e2e/screenshots/home.png', fullPage: true });

    // Check that retro windows exist
    const retroWindows = page.locator('.window-retro');
    await expect(retroWindows.first()).toBeVisible();

    // Check that retro buttons exist
    const retroButtons = page.locator('.btn-retro');
    expect(await retroButtons.count()).toBeGreaterThan(0);
  });
});
