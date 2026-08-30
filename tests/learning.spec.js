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

// Every final object slot is reserved immediately. Reveals are paced by the
// voice, or by a fixed timer when speech is off. Speech is disabled here so the
// timing is deterministic; the voice contract is tested separately below.
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
        await expect(page.locator('.count-object')).toHaveCount(3);
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(3, { timeout: 6000 });
        await expect(page.locator('#number-total')).toHaveText(/^3 /);
    });

    test('stable slots reveal one at a time without moving earlier objects', async ({ page }) => {
        await page.keyboard.press('3');
        const slots = page.locator('.count-object');
        await expect(slots).toHaveCount(3);
        const before = await slots.evaluateAll(elements => elements.map(element => ({
            x: /** @type {HTMLElement} */ (element).offsetLeft,
            y: /** @type {HTMLElement} */ (element).offsetTop,
            width: /** @type {HTMLElement} */ (element).offsetWidth,
            height: /** @type {HTMLElement} */ (element).offsetHeight
        })));

        await expect(page.locator('.count-object.is-revealed')).toHaveCount(1, { timeout: 4000 });
        const after = await slots.evaluateAll(elements => elements.map(element => ({
            x: /** @type {HTMLElement} */ (element).offsetLeft,
            y: /** @type {HTMLElement} */ (element).offsetTop,
            width: /** @type {HTMLElement} */ (element).offsetWidth,
            height: /** @type {HTMLElement} */ (element).offsetHeight
        })));
        expect(after).toEqual(before);

        await expect(page.locator('.count-object.is-revealed')).toHaveCount(2, { timeout: 4000 });
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(3, { timeout: 4000 });
    });

    test('zero shows no objects', async ({ page }) => {
        await page.keyboard.press('0');
        await expect(page.locator('#number-display')).toHaveText('0');
        await expect(page.locator('.count-object')).toHaveCount(0);
        await expect(page.locator('#number-objects')).toHaveClass(/is-zero/);
        await expect(page.locator('#number-total')).toHaveText(/^0 /);
    });

    test('a new number cancels the previous count', async ({ page }) => {
        await page.keyboard.press('9');
        await page.keyboard.press('2');
        await expect(page.locator('#number-display')).toHaveText('2');
        await expect(page.locator('.count-object')).toHaveCount(2);
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(2, { timeout: 6000 });
        // None of the abandoned nine-count leaks through afterwards
        await page.waitForTimeout(2000);
        await expect(page.locator('.count-object')).toHaveCount(2);
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(2);
    });

    test('the complete nine-object grid fits inside the play area', async ({ page }) => {
        await page.keyboard.press('9');
        const contained = await page.locator('#numbers-container').evaluate(container => {
            const play = document.getElementById('play-area').getBoundingClientRect();
            const rect = container.getBoundingClientRect();
            return rect.top >= play.top - 1 && rect.bottom <= play.bottom + 1
                && rect.left >= play.left - 1 && rect.right <= play.right + 1;
        });
        expect(contained).toBe(true);
    });

    test('leaving Numbers cancels its unfinished count', async ({ page }) => {
        await page.keyboard.press('5');
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(0);
        await page.locator('#letters-btn').click();
        const revealedWhenLeaving = await page.locator('.count-object.is-revealed').count();
        await page.waitForTimeout(1500);
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(revealedWhenLeaving);
    });
});

test.describe('Number Fun — the counting voice', () => {
    // Runs everywhere, webkit included: the engine is replaced by a recorder
    // rather than wrapped, so the absence of speechSynthesis in Playwright's
    // WebKit no longer forces a skip. What is asserted here — the order of the
    // queue and the count of cancels — is the app's half of the contract, and
    // is identical on every browser.
    test('reveals lead their count words and the final phrase names the quantity', async ({ page }) => {
        await stubSpeech(page);
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await expect(page.locator('#numbers-container')).toHaveClass(/active/);
        await clearSpeechLog(page);

        await page.keyboard.press('3');

        const log = await speechLog(page);
        const speaks = log.filter(e => e.type === 'speak');

        expect(speaks.slice(0, 4).map(e => e.text))
            .toEqual(["Three. Let's count.", 'One', 'Two', 'Three']);
        expect(speaks.slice(0, 4).map(e => e.revealed)).toEqual([0, 1, 2, 3]);
        expect(speaks[4].text).toMatch(/^Three\. There are three \w+\.$/);
        expect(speaks[4].revealed).toBe(3);
        expect(log.filter(e => e.type === 'cancel')).toHaveLength(1);
    });

    test('a stalled voice advances only one guarded step at a time', async ({ page }) => {
        await stubSpeech(page, { autoComplete: false });
        await page.clock.install();
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await clearSpeechLog(page);

        await page.keyboard.press('2');
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(0);

        await page.clock.fastForward(2100);
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(1);
        expect((await spokenTexts(page)).slice(0, 2)).toEqual(["Two. Let's count.", 'One']);

        await page.clock.fastForward(2100);
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(2);
        expect((await spokenTexts(page)).slice(0, 3)).toEqual(["Two. Let's count.", 'One', 'Two']);
    });

    test('one and zero use child-friendly singular and empty-set language', async ({ page }) => {
        await stubSpeech(page);
        await gotoApp(page);
        await page.locator('#numbers-btn').click();

        await page.keyboard.press('1');
        expect((await spokenTexts(page)).at(-1)).toMatch(/^One\. There is one \w+\.$/);

        await clearSpeechLog(page);
        await page.keyboard.press('0');
        expect((await spokenTexts(page))).toEqual([expect.stringMatching(/^Zero\. There are no \w+\.$/)]);
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
