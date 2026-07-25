const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

test.describe('Piano mode', () => {
    test.beforeEach(async ({ page }) => {
        await gotoApp(page);
        await page.locator('#piano-btn').click();
        await expect(page.locator('#piano-container')).toHaveClass(/active/);
    });

    test('renders the piano and hides the on-screen keyboard', async ({ page, isMobile }) => {
        const whites = await page.locator('.piano-key.white').count();
        const blacks = await page.locator('.piano-key.black').count();
        if (isMobile) {
            // narrow screens fall back to one octave C4-C5
            expect(whites).toBe(8);
            expect(blacks).toBe(5);
        } else {
            expect(whites).toBe(15);
            expect(blacks).toBe(10);
        }
        await expect(page.locator('#osk')).not.toHaveClass(/visible/);
        await expect(page.locator('#keyboard-btn')).toBeHidden();
    });

    test('physical key press sustains until release', async ({ page }) => {
        const c4 = page.locator('.piano-key[data-midi="60"]');
        await page.keyboard.down('z');
        await expect(c4).toHaveClass(/active/);
        await page.keyboard.up('z');
        await expect(c4).not.toHaveClass(/active/);
    });

    test('sharp keys map to black keys', async ({ page }) => {
        const cSharp4 = page.locator('.piano-key[data-midi="61"]');
        await page.keyboard.down('s');
        await expect(cSharp4).toHaveClass(/active/);
        await page.keyboard.up('s');
        await expect(cSharp4).not.toHaveClass(/active/);
    });

    test('chords: two keys held at once both stay active', async ({ page }) => {
        const c4 = page.locator('.piano-key[data-midi="60"]');
        const e4 = page.locator('.piano-key[data-midi="64"]');
        await page.keyboard.down('z');
        await page.keyboard.down('c');
        await expect(c4).toHaveClass(/active/);
        await expect(e4).toHaveClass(/active/);
        await page.keyboard.up('z');
        await expect(c4).not.toHaveClass(/active/);
        await expect(e4).toHaveClass(/active/);
        await page.keyboard.up('c');
    });

    test('pointer press and release play a key', async ({ page }) => {
        const g4 = page.locator('.piano-key[data-midi="67"]');
        await g4.dispatchEvent('pointerdown', { pointerId: 5 });
        await expect(g4).toHaveClass(/active/);
        await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 5 })));
        await expect(g4).not.toHaveClass(/active/);
    });

    test('leaving piano mode restores the on-screen keyboard button', async ({ page }) => {
        await page.locator('#free-btn').click();
        await expect(page.locator('#keyboard-btn')).toBeVisible();
        await expect(page.locator('#piano-container')).not.toHaveClass(/active/);
    });
});
