import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('local flow covers join, draw, automatic payment and secondary views', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Aggiungimi' }).click();
  await page.getByRole('button', { name: /mostra partecipanti/i }).click();
  await page.getByRole('button', { name: /aggiungi colleghi test/i }).click();
  await page.getByRole('button', { name: 'Chiudi' }).click();

  const spin = page.getByRole('button', { name: 'Gira' });
  await expect(spin).toBeEnabled();
  const segmentColors = await page.locator('.wheel-segment').evaluateAll((segments) => Object.fromEntries(segments.map((segment) => [
    (segment as SVGPathElement).dataset.userId,
    segment.getAttribute('fill')
  ])));
  await spin.click();
  const wheel = page.getByRole('img', { name: /ruota in rotazione/i });
  await expect(page.getByRole('main', { name: 'Ruota Pay Wheel' })).toHaveAttribute('aria-busy', 'true');
  await expect(wheel).toHaveClass(/wheel--spinning/);
  const firstTransform = await wheel.evaluate((element) => getComputedStyle(element).transform);
  await page.waitForTimeout(120);
  await expect.poll(() => wheel.evaluate((element) => getComputedStyle(element).transform)).not.toBe(firstTransform);
  const result = page.locator('.result-stage');
  await expect(page.getByText('Paga', { exact: true })).toBeVisible();
  const payerId = await result.getAttribute('data-payer-id');
  await expect.poll(() => result.evaluate((element) => getComputedStyle(element).getPropertyValue('--result-color').trim())).toBe(segmentColors[payerId ?? '']);
  await page.getByText('Test', { exact: true }).click();
  await page.getByRole('button', { name: /simula scadenza/i }).click();

  await expect(page.getByRole('button', { name: 'Aggiungimi' })).toBeVisible();
  await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.getByRole('link', { name: 'Classifica' }).click();
  await expect(page.getByRole('heading', { name: 'Classifica' })).toBeVisible();
  await expect(page.locator('.average-card')).toContainText('1,80');

  await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.getByRole('link', { name: 'Profilo' }).click();
  await expect(page.getByRole('heading', { name: /ciao/i })).toBeVisible();
  await expect(page.getByText(/pagamento automatico/i)).toBeVisible();
});
