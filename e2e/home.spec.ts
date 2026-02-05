import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load and display town view with welcome dialog', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Clawntawn/);

    // Check main heading is visible in the town view (first one, not the dialog one)
    await expect(page.getByRole('heading', { name: 'CLAWNTAWN' }).first()).toBeVisible();

    // Check welcome dialog opens by default
    await expect(page.getByRole('dialog', { name: 'Welcome to Clawntawn' })).toBeVisible();

    // Check tagline is visible in dialog
    await expect(page.getByText('A coastal lobster town that evolves itself')).toBeVisible();
  });

  test('should close welcome dialog and show town', async ({ page }) => {
    await page.goto('/');

    // Click explore button to close dialog
    await page.getByRole('button', { name: 'Explore Town' }).click();

    // Dialog should be closed
    await expect(page.getByRole('dialog', { name: 'Welcome to Clawntawn' })).not.toBeVisible();

    // Town view should show buildings
    await expect(page.getByRole('button', { name: 'Town Hall' })).toBeVisible();
  });

  test('should open Town Hall dialog when clicking building', async ({ page }) => {
    await page.goto('/');

    // Close welcome dialog first
    await page.getByRole('button', { name: 'Explore Town' }).click();

    // Click Town Hall building
    await page.getByRole('button', { name: 'Town Hall' }).click();

    // Check Town Hall dialog opens
    await expect(page.getByRole('dialog', { name: 'Town Hall - Mayor Clawrence' })).toBeVisible();

    // Check Mayor content is visible (exact match to avoid matching dialog title)
    await expect(page.getByText('Mayor Clawrence', { exact: true })).toBeVisible();
    await expect(page.getByText('Online', { exact: false })).toBeVisible();

    // Check action buttons
    await expect(page.getByRole('button', { name: /Raise Hand/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Watch/i })).toBeVisible();
  });

  test('should display treasury and citizen count', async ({ page }) => {
    await page.goto('/');

    // Stats are visible in the town view header
    await expect(page.getByText(/Treasury: 10,000/)).toBeVisible();
    await expect(page.getByText(/Population: 42/)).toBeVisible();
  });

  test('should have all town buildings', async ({ page }) => {
    await page.goto('/');

    // Close welcome dialog
    await page.getByRole('button', { name: 'Explore Town' }).click();

    // Check all buildings are present
    await expect(page.getByRole('button', { name: 'Town Hall' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Community Forum' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Project Board' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lobster Dock' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lighthouse' })).toBeVisible();
  });

  test('should close dialog with X button', async ({ page }) => {
    await page.goto('/');

    // Welcome dialog should be open
    await expect(page.getByRole('dialog', { name: 'Welcome to Clawntawn' })).toBeVisible();

    // Click close button
    await page.getByRole('button', { name: 'Close dialog' }).click();

    // Dialog should be closed
    await expect(page.getByRole('dialog', { name: 'Welcome to Clawntawn' })).not.toBeVisible();
  });

  test('should close dialog with Escape key', async ({ page }) => {
    await page.goto('/');

    // Welcome dialog should be open
    await expect(page.getByRole('dialog', { name: 'Welcome to Clawntawn' })).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Dialog should be closed
    await expect(page.getByRole('dialog', { name: 'Welcome to Clawntawn' })).not.toBeVisible();
  });
});
