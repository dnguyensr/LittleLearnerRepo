const { test, expect } = require('@playwright/test');
const { gotoApp, ensureOskVisible } = require('./helpers');

test.describe('Free Play', () => {
    test('physical key shows the key and adds to history', async ({ page }) => {
        await gotoApp(page);
        await page.keyboard.press('a');
        await expect(page.locator('#key-display')).toHaveText('A');
        await page.keyboard.press('b');
        await expect(page.locator('#key-display')).toHaveText('B');
        expect(await page.locator('.history-key').count()).toBeGreaterThanOrEqual(2);
    });

    test('history is capped at 8 keys', async ({ page }) => {
        await gotoApp(page);
        for (const ch of 'abcdefghij') {
            await page.keyboard.press(ch);
        }
        await expect(page.locator('.history-key')).toHaveCount(8);
    });

    test('on-screen keyboard tap acts like a key press', async ({ page }) => {
        await gotoApp(page);
        await ensureOskVisible(page);
        await page.locator('.osk-key[data-key="Q"]').dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#key-display')).toHaveText('Q');
    });

    test('tapping the play area spawns effects', async ({ page }) => {
        await gotoApp(page);
        await page.locator('#play-area').dispatchEvent('pointerdown', { pointerId: 1, clientX: 300, clientY: 300 });
        await expect(page.locator('.bubble').first()).toBeAttached();
        await expect(page.locator('.star').first()).toBeAttached();
    });

    test('audio context is running after a user gesture', async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'autoplay-policy override is chromium-only');
        await gotoApp(page);
        await page.keyboard.press('a');
        const state = await page.evaluate(async () => {
            const audio = await import('/js/audio.js');
            return audio.getAudioState();
        });
        expect(state).toBe('running');
    });
});
