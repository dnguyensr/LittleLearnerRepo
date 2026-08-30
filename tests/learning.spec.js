const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings, stubSpeech, speechLog, spokenTexts, clearSpeechLog } = require('./helpers');

test.describe('Letter Land', () => {
    test.beforeEach(async ({ page }) => {
        await gotoApp(page);
        await page.locator('#letters-btn').click();
        await expect(page.locator('#letters-container')).toHaveClass(/active/);
    });

    test('pressing a letter shows it with its example word', async ({ page }) => {
        await page.keyboard.press('b');
        await expect(page.locator('#letter-display')).toHaveText('B b');
        await expect(page.locator('#letter-example')).toContainText('B is for Ball');
        await page.keyboard.press('z');
        await expect(page.locator('#letter-display')).toHaveText('Z z');
        await expect(page.locator('#letter-example')).toContainText('Z is for Zebra');
    });

    test('examples match the taught sound, including the special X ending', async ({ page }) => {
        await page.keyboard.press('i');
        await expect(page.locator('#letter-example')).toContainText('I is for Igloo');
        await page.keyboard.press('o');
        await expect(page.locator('#letter-example')).toContainText('O is for Octopus');
        await page.keyboard.press('x');
        await expect(page.locator('#letter-example')).toContainText('X is in Fox');
        await expect(page.locator('#letter-example .letter-highlight')).toHaveText('x');
    });

    test('replay controls fit the play area and meet touch target size', async ({ page }) => {
        await page.keyboard.press('w');
        const result = await page.locator('#letters-container').evaluate(container => {
            const play = document.getElementById('play-area').getBoundingClientRect();
            const controls = [...container.querySelectorAll('button:not([hidden])')];
            return {
                contained: controls.every(control => {
                    const rect = control.getBoundingClientRect();
                    return rect.top >= play.top - 1 && rect.bottom <= play.bottom + 1
                        && rect.left >= play.left - 1 && rect.right <= play.right + 1;
                }),
                targets: controls.map(control => {
                    const rect = control.getBoundingClientRect();
                    return { width: rect.width, height: rect.height };
                })
            };
        });
        expect(result.contained).toBe(true);
        for (const target of result.targets) {
            expect(target.width).toBeGreaterThanOrEqual(44);
            expect(target.height).toBeGreaterThanOrEqual(44);
        }
    });

    test('non-letters are ignored', async ({ page }) => {
        await page.keyboard.press('5');
        await expect(page.locator('#letter-display')).toHaveText('ABC');
    });
});

test.describe('Letter Land touch replay', () => {
    test.use({ hasTouch: true });

    test('a touchscreen tap replays the selected example word', async ({ page }) => {
        await stubSpeech(page);
        await gotoApp(page);
        await page.locator('#letters-btn').click();
        await page.keyboard.press('c');
        await clearSpeechLog(page);

        await page.locator('#letter-example').tap();
        expect(await spokenTexts(page)).toEqual(['cat']);
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
    // Runs everywhere, webkit included: the engine is replaced by a recorder
    // rather than wrapped, so the absence of speechSynthesis in Playwright's
    // WebKit no longer forces a skip. What is asserted here — the order of the
    // queue and the count of cancels — is the app's half of the contract, and
    // is identical on every browser.
    test('the whole count is queued as one sequence, never interrupted', async ({ page }) => {
        await stubSpeech(page);
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await expect(page.locator('#numbers-container')).toHaveClass(/active/);
        await clearSpeechLog(page);

        await page.keyboard.press('3');

        // Queued synchronously, so this needs no waiting on actual audio
        const log = await speechLog(page);

        // The announcement then each number, in order and in one queue
        expect(log.filter(e => e.type === 'speak').map(e => e.text))
            .toEqual(['3!', '1', '2', '3']);
        // Exactly one cancel: the interrupt clearing whatever came before. The
        // count itself never interrupts, which is what stops it being chopped.
        expect(log.filter(e => e.type === 'cancel')).toHaveLength(1);
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
