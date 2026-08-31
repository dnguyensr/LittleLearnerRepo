const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings, openSettings } = require('./helpers');

// Math and its guided lessons now ship as one experience. There is no beta
// opt-in or beta marking in the child navigation or grown-up panel.

test.describe('Math Lab settings', () => {
    test('ships Math and guided lessons with no beta UI', async ({ page }) => {
        await gotoApp(page);
        await expect(page.locator('#mathlab-btn')).toBeVisible();
        await expect(page.locator('#mathlab-btn')).toHaveText(/Math/);
        await expect(page.locator('#mathlab-btn .beta-badge')).toHaveCount(0);
        // The old Math mode is unregistered, and the flag it hid behind is gone
        await expect(page.locator('#math-btn')).toHaveCount(0);
        await expect(page.locator('#set-beta-modes')).toHaveCount(0);
        await expect(page.locator('#set-guided-lessons-beta')).toHaveCount(0);
        await expect(page.locator('.beta-pill')).toHaveCount(0);
    });

    test('method and stage are set straight from the parent panel', async ({ page }) => {
        await gotoApp(page);
        await openSettings(page);

        await expect(page.locator('#set-math-method')).toBeVisible();
        await expect(page.locator('#set-math-method')).toHaveValue('singapore');
        await expect(page.locator('#set-mathlab-level')).toBeVisible();
        await expect(page.locator('#set-mathlab-level')).toHaveValue('auto');
        await expect(page.locator('#mathlab-progress-row')).toBeVisible();
        await expect(page.locator('#set-guided-lessons-beta')).toHaveCount(0);
    });

    test('the settings choice survives a reload', async ({ page }) => {
        await gotoApp(page);
        await openSettings(page);
        await page.locator('#set-mathlab-level').selectOption('subtracting10');
        await page.locator('#set-math-method').selectOption('singapore');
        await page.locator('#settings-close').click();

        await page.reload();
        await openSettings(page);
        await expect(page.locator('#set-mathlab-level')).toHaveValue('subtracting10');
        await expect(page.locator('#set-math-method')).toHaveValue('singapore');
    });

    test('a stage seeded before boot is the stage that is played', async ({ page }) => {
        await seedSettings(page, { mathLabLevel: 'subtracting10' });
        await gotoApp(page);
        await page.locator('#mathlab-btn').click();
        await expect(page.locator('#mathlab-container')).toHaveClass(/active/);
        await openSettings(page);
        await expect(page.locator('#set-mathlab-level')).toHaveValue('subtracting10');
    });
});
