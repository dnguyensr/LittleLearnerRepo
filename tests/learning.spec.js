const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings } = require('./helpers');

test.describe('Letter Land', () => {
    test.beforeEach(async ({ page }) => {
        await gotoApp(page);
        await page.locator('#letters-btn').click();
        await expect(page.locator('#letters-container')).toHaveClass(/active/);
    });

    test('pressing a letter shows it with its example word', async ({ page }) => {
        await page.keyboard.press('b');
        await expect(page.locator('#letter-display')).toHaveText('B');
        await expect(page.locator('#letter-example')).toContainText('BALL');
        await page.keyboard.press('z');
        await expect(page.locator('#letter-display')).toHaveText('Z');
        await expect(page.locator('#letter-example')).toContainText('ZEBRA');
    });

    test('non-letters are ignored', async ({ page }) => {
        await page.keyboard.press('5');
        await expect(page.locator('#letter-display')).toHaveText('ABC');
    });
});

// Counting is paced by the voice, falling back to a fixed timer when there is
// no voice. These run with speech off so the timing is deterministic: the real
// speech engine is a single shared service, and under parallel workers it
// stalls badly enough to make any audio-paced assertion flaky. The voice-paced
// path is contract-tested below without waiting on audio at all.
test.describe('Number Fun', () => {
    test.beforeEach(async ({ page }) => {
        await seedSettings(page, { speech: false });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await expect(page.locator('#numbers-container')).toHaveClass(/active/);
    });

    test('pressing a number shows it and counts out objects', async ({ page }) => {
        await page.keyboard.press('3');
        await expect(page.locator('#number-display')).toHaveText('3');
        await expect(page.locator('.count-object')).toHaveCount(3, { timeout: 6000 });
    });

    test('objects appear one at a time, not all at once', async ({ page }) => {
        await page.keyboard.press('3');
        await expect(page.locator('.count-object')).toHaveCount(0);
        await expect(page.locator('.count-object')).toHaveCount(1, { timeout: 4000 });
        await expect(page.locator('.count-object')).toHaveCount(2, { timeout: 4000 });
        await expect(page.locator('.count-object')).toHaveCount(3, { timeout: 4000 });
    });

    test('zero shows no objects', async ({ page }) => {
        await page.keyboard.press('0');
        await expect(page.locator('#number-display')).toHaveText('0');
        await page.waitForTimeout(800);
        await expect(page.locator('.count-object')).toHaveCount(0);
    });

    test('a new number cancels the previous count', async ({ page }) => {
        await page.keyboard.press('9');
        await page.keyboard.press('2');
        await expect(page.locator('#number-display')).toHaveText('2');
        await expect(page.locator('.count-object')).toHaveCount(2, { timeout: 6000 });
        // None of the abandoned nine-count leaks through afterwards
        await page.waitForTimeout(2000);
        await expect(page.locator('.count-object')).toHaveCount(2);
    });
});

test.describe('Number Fun — the counting voice', () => {
    test('the whole count is queued as one sequence, never interrupted', async ({ page }) => {
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await expect(page.locator('#numbers-container')).toHaveClass(/active/);

        await page.evaluate(() => {
            const win = /** @type {any} */ (window);
            win.__spoken = [];
            win.__cancels = 0;
            const speak = speechSynthesis.speak.bind(speechSynthesis);
            speechSynthesis.speak = utterance => { win.__spoken.push(utterance.text); speak(utterance); };
            const cancel = speechSynthesis.cancel.bind(speechSynthesis);
            speechSynthesis.cancel = () => { win.__cancels++; cancel(); };
        });

        await page.keyboard.press('3');

        // Queued synchronously, so this needs no waiting on actual audio
        const result = await page.evaluate(() => {
            const win = /** @type {any} */ (window);
            return { spoken: win.__spoken, cancels: win.__cancels };
        });

        // The announcement then each number, in order and in one queue
        expect(result.spoken).toEqual(['3!', '1', '2', '3']);
        // Exactly one cancel: the interrupt clearing whatever came before. The
        // count itself never interrupts, which is what stops it being chopped.
        expect(result.cancels).toBe(1);
    });
});

test.describe('Parent settings', () => {
    test('gear opens on hold, not on tap', async ({ page }) => {
        await gotoApp(page);
        const gear = page.locator('#settings-btn');
        const panel = page.locator('#settings-panel');

        await gear.click();
        await expect(panel).toBeHidden();

        await gear.dispatchEvent('pointerdown', { pointerId: 1 });
        await page.waitForTimeout(800);
        await gear.dispatchEvent('pointerup', { pointerId: 1 });
        await expect(panel).toBeVisible();

        await page.locator('#settings-close').click();
        await expect(panel).toBeHidden();
    });

    test('words hint highlights the expected letter on the OSK', async ({ page }) => {
        await gotoApp(page);
        await page.locator('#words-btn').click();
        const word = (await page.locator('.letter-box').allTextContents()).join('');
        const expected = word[0];
        await expect(page.locator(`.osk-key[data-key="${expected}"]`)).toHaveClass(/hint/);

        // two misses upgrade the hint to a strong pulse
        const wrong = expected === 'Q' ? 'W' : 'Q';
        await page.keyboard.press(wrong.toLowerCase());
        await page.keyboard.press(wrong.toLowerCase());
        await expect(page.locator(`.osk-key[data-key="${expected}"]`)).toHaveClass(/hint-strong/);
    });
});
