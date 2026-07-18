import { expect, test } from '@playwright/test';

test('smart bar converts live', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Smart converter input').fill('12 km to mi');
	await expect(page.locator('.result-card .num')).toHaveText('7.45645');
	await expect(page.locator('.result-card')).toContainText('mi');
});

test('unit math works', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Smart converter input').fill('3 ft + 12 in in cm');
	await expect(page.locator('.result-card .num')).toHaveText('121.92');
});

test('grid fills all siblings from one input', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Length' }).click();
	const meterInput = page.locator('.cell', { hasText: 'Meter' }).first().locator('input');
	await meterInput.fill('5');
	const footInput = page.locator('.cell', { hasText: 'Foot' }).locator('input');
	await expect(footInput).toHaveValue('16.4042');
});

test('share URL restores a query', async ({ page }) => {
	await page.goto('/?q=2+km+to+mi');
	await expect(page.locator('.result-card .num')).toHaveText('1.24274');
});

test('suggestions jump to a category', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Smart converter input').fill('tola');
	await page.getByRole('button', { name: /Jump to Tola/ }).click();
	await expect(page.locator('.cell', { hasText: 'Tola' })).toBeVisible();
});
