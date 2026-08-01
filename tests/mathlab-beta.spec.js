const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings, openSettings } = require('./helpers');

test.describe('Beta gating', () => {
    test('Math Lab is hidden by default', async ({ page }) => {
        await gotoApp(page);
        await expect(page.locator('#mathlab-btn')).toBeHidden();
        await expect(page.locator('#math-btn')).toBeVisible();
    });

    test('the parent panel reveals Math Lab and its settings', async ({ page }) => {
        await gotoApp(page);
        await openSettings(page);

        await expect(page.locator('#beta-settings')).toBeHidden();
        await page.locator('#set-beta-modes').check();
        await expect(page.locator('#beta-settings')).toBeVisible();
        await expect(page.locator('#set-math-method')).toHaveValue('classical');
        await expect(page.locator('#set-mathlab-level')).toHaveValue('auto');

        await page.locator('#settings-close').click();
        await expect(page.locator('#mathlab-btn')).toBeVisible();
    });

    test('the beta button carries a 🧪 badge and a beta label', async ({ page }) => {
        await seedSettings(page, { betaModes: true });
        await gotoApp(page);
        await expect(page.locator('#mathlab-btn')).toBeVisible();
        await expect(page.locator('#mathlab-btn .beta-badge')).toHaveText('🧪');
        await expect(page.locator('#mathlab-btn')).toHaveAttribute('aria-label', 'Math Lab (beta)');
    });

    test('turning the flag off mid-session drops back to Free Play', async ({ page }) => {
        await seedSettings(page, { betaModes: true });
        await gotoApp(page);
        await page.locator('#mathlab-btn').click();
        await expect(page.locator('#mathlab-container')).toHaveClass(/active/);

        await openSettings(page);
        await page.locator('#set-beta-modes').uncheck();
        await page.locator('#settings-close').click();

        await expect(page.locator('#mathlab-btn')).toBeHidden();
        await expect(page.locator('#mathlab-container')).not.toHaveClass(/active/);
        await expect(page.locator('#key-display')).toBeVisible();
    });

    test('the settings choice survives a reload', async ({ page }) => {
        await gotoApp(page);
        await openSettings(page);
        await page.locator('#set-beta-modes').check();
        await page.locator('#set-mathlab-level').selectOption('subtracting10');
        await page.locator('#settings-close').click();

        await page.reload();
        await expect(page.locator('#mathlab-btn')).toBeVisible();
        await openSettings(page);
        await expect(page.locator('#set-mathlab-level')).toHaveValue('subtracting10');
    });
});
