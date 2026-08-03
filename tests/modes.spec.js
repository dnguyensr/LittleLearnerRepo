const { test, expect } = require('@playwright/test');
const { gotoApp, ensureOskVisible } = require('./helpers');

test.describe('Mode switching', () => {
    test('mode buttons are generated for every mode', async ({ page }) => {
        await gotoApp(page);
        for (const id of ['free-btn', 'piano-btn', 'letters-btn', 'numbers-btn', 'math-btn', 'words-btn']) {
            await expect(page.locator(`#${id}`)).toBeVisible();
        }
        await expect(page.locator('#free-btn')).toHaveAttribute('aria-pressed', 'true');
    });

    test('switching modes toggles containers and aria-pressed', async ({ page }) => {
        await gotoApp(page);

        await page.locator('#math-btn').click();
        await expect(page.locator('#math-container')).toHaveClass(/active/);
        await expect(page.locator('#key-display')).toBeHidden();
        await expect(page.locator('#math-btn')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('#free-btn')).toHaveAttribute('aria-pressed', 'false');

        await page.locator('#words-btn').click();
        await expect(page.locator('#word-container')).toHaveClass(/active/);
        await expect(page.locator('#math-container')).not.toHaveClass(/active/);

        await page.locator('#free-btn').click();
        await expect(page.locator('#key-display')).toBeVisible();
        await expect(page.locator('#word-container')).not.toHaveClass(/active/);
    });

    test('tapping the active mode button returns to Free Play', async ({ page }) => {
        await gotoApp(page);
        await page.locator('#math-btn').click();
        await expect(page.locator('#math-container')).toHaveClass(/active/);
        await page.locator('#math-btn').click();
        await expect(page.locator('#math-container')).not.toHaveClass(/active/);
        await expect(page.locator('#key-display')).toBeVisible();
    });

    test('on-screen keyboard swaps QWERTY and numpad per mode', async ({ page }) => {
        await gotoApp(page);
        await ensureOskVisible(page);
        await expect(page.locator('#osk')).not.toHaveClass(/numpad/);
        expect(await page.locator('.osk-key').count()).toBeGreaterThan(30);

        await page.locator('#math-btn').click();
        await expect(page.locator('#osk')).toHaveClass(/numpad/);
        await expect(page.locator('.osk-key')).toHaveCount(12);
    });

    test('Letters and Words drop the number row, Free Play keeps it', async ({ page }) => {
        await gotoApp(page);
        await ensureOskVisible(page);
        await expect(page.locator('.osk-key[data-key="7"]')).toHaveCount(1);

        for (const id of ['letters-btn', 'words-btn']) {
            await page.locator(`#${id}`).click();
            await expect(page.locator('.osk-key[data-key="7"]')).toHaveCount(0);
            await expect(page.locator('.osk-key[data-key="Q"]')).toHaveCount(1);
            await expect(page.locator('.osk-key')).toHaveCount(27);
        }

        await page.locator('#free-btn').click();
        await expect(page.locator('.osk-key[data-key="7"]')).toHaveCount(1);
    });

    test('score is shown in math/words and hidden in free play', async ({ page }) => {
        await gotoApp(page);
        await expect(page.locator('#score-display')).toBeHidden();
        await page.locator('#math-btn').click();
        await expect(page.locator('#score-display')).toBeVisible();
        await page.locator('#free-btn').click();
        await expect(page.locator('#score-display')).toBeHidden();
    });
});
