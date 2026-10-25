import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('entry contains a single CTA and joins the local outing in one click', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Aggiungimi' })).toBeVisible();
  await expect(page.getByRole('heading')).toHaveCount(0);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByRole('button')).toHaveCount(1);

  await page.getByRole('button', { name: 'Aggiungimi' }).click();
  await expect(page.getByRole('button', { name: 'Apri menu' })).toBeVisible();
  await expect(page.getByRole('img', { name: /ruota con/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Non partecipo' })).toBeVisible();
});

test('public account deletion page is accessible without login', async ({ page }) => {
  await page.goto('/account-deletion');
  await expect(page.getByRole('heading', { name: /eliminazione account/i })).toBeVisible();
});
