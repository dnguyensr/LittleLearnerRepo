const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings, stubSpeech, speechLog, spokenTexts, clearSpeechLog } = require('./helpers');

// Number Fun has two layers of contract, and both are asserted here.
//
// P9 (docs/plans/09-number-foundations.md) owns the modeled count: stable
// slots, an object visible before its number word is queued, one guarded
// watchdog per step, and clean cancellation. Those assertions moved here
// unchanged when P11 landed, and they still describe the demonstration a child
// sees on their first encounter with a numeral.
//
// P11 (docs/plans/11-interactive-counting.md) owns what happens after the
// demonstration: the child counts by touching, taps are accepted in any order,
// an object cannot be counted twice, and rearranging the set does not change
// how many there are.
// Every final object slot is reserved immediately. Reveals are paced by the
// voice, or by a fixed timer when speech is off. Speech is disabled here so the
// timing is deterministic; the voice contract is tested separately below.
test.describe('Number Fun — the modeled count', () => {
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

/* ---------- P11: the child performs the count ---------- */

// `tap` skips the demonstration so these do not have to sit through it. The
// hand-over that `auto` performs is asserted separately, below.
async function childTurn(page, digit) {
    await page.keyboard.press(digit);
    await expect(page.locator('#number-objects.is-tappable')).toHaveCount(1);
    await expect(page.locator('.count-object')).toHaveCount(Number(digit));
}

function badges(page) {
    return page.locator('.count-object').evaluateAll(nodes =>
        nodes.map(node => node.querySelector('.count-badge').textContent));
}

test.describe('Number Fun — the child counts', () => {
    test.beforeEach(async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'tap' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await expect(page.locator('#numbers-container')).toHaveClass(/active/);
    });

    test('every object is on screen and uncounted before the child starts', async ({ page }) => {
        await childTurn(page, '4');
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(4);
        await expect(page.locator('.count-object.is-counted')).toHaveCount(0);
        await expect(page.locator('#number-total')).toHaveText('');
    });

    // Gelman and Gallistel's order-irrelevance principle: which object is
    // touched first cannot matter, only that each is touched once.
    test('taps are accepted in any order and count up in tap order', async ({ page }) => {
        await childTurn(page, '3');
        const objects = page.locator('.count-object');

        await objects.nth(2).click();
        await objects.nth(0).click();
        await objects.nth(1).click();

        expect(await badges(page)).toEqual(['2', '3', '1']);
        await expect(page.locator('#number-total')).toHaveText(/^3 /);
    });

    // One-to-one correspondence is enforced by construction rather than by
    // correction, so there is never a wrong answer to report.
    test('an object already counted cannot be counted again', async ({ page }) => {
        await childTurn(page, '3');
        const objects = page.locator('.count-object');

        await objects.nth(0).click();
        await objects.nth(0).click();
        await objects.nth(0).click();

        expect(await badges(page)).toEqual(['1', '', '']);
        await expect(page.locator('.count-object.is-counted')).toHaveCount(1);
        await expect(page.locator('#number-total')).toHaveText('');
    });

    test('the last badge is emphasised when the set is complete', async ({ page }) => {
        await childTurn(page, '3');
        const objects = page.locator('.count-object');
        for (const index of [0, 1, 2]) await objects.nth(index).click();

        await expect(page.locator('#number-total')).toHaveText(/^3 /);
        await expect(page.locator('.count-object.is-last')).toHaveCount(1);
        await expect(objects.nth(2)).toHaveClass(/is-last/);
    });

    test('one and zero still use singular and empty-set wording', async ({ page }) => {
        await childTurn(page, '1');
        await page.locator('.count-object').first().click();
        await expect(page.locator('#number-total')).toHaveText(/^1 \w+$/);

        await page.keyboard.press('0');
        await expect(page.locator('.count-object')).toHaveCount(0);
        await expect(page.locator('#number-objects')).toHaveClass(/is-zero/);
        await expect(page.locator('#number-total')).toHaveText(/^0 /);
    });
});

test.describe('Number Fun — moving the set does not change how many', () => {
    test.beforeEach(async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'tap' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
    });

    async function countAll(page, n) {
        const objects = page.locator('.count-object');
        for (let index = 0; index < n; index++) await objects.nth(index).click();
        await expect(page.locator('#number-total')).toHaveText(new RegExp(`^${n} `));
    }

    test('Move them! appears only once the set has been counted', async ({ page }) => {
        await childTurn(page, '3');
        await expect(page.locator('#number-move-btn')).toBeHidden();
        await countAll(page, 3);
        await expect(page.locator('#number-move-btn')).toBeVisible();
    });

    test('rearranging keeps the same objects and the same quantity', async ({ page }) => {
        await childTurn(page, '4');
        await countAll(page, 4);

        // Stamp the live nodes so "the same objects moved" can be told apart
        // from "a new set was rendered" — which is the whole demonstration.
        await page.locator('.count-object').evaluateAll(nodes =>
            nodes.forEach((node, index) => { node.dataset.stamp = `s${index}`; }));

        await page.locator('#number-move-btn').click();

        await expect(page.locator('.count-object')).toHaveCount(4);
        expect(await page.locator('.count-object').evaluateAll(nodes =>
            nodes.map(node => node.dataset.stamp))).toEqual(['s0', 's1', 's2', 's3']);
        // The badges are cleared so the child re-counts rather than reading the
        // previous answer back off the screen.
        await expect(page.locator('.count-object.is-counted')).toHaveCount(0);
        await expect(page.locator('#number-total')).toHaveText('');

        await countAll(page, 4);
    });

    test('each Move them! lays the same set out differently', async ({ page }) => {
        await childTurn(page, '6');
        await countAll(page, 6);

        const spacing = () => page.locator('#number-objects').evaluate(node => ({
            gap: getComputedStyle(node).columnGap,
            columns: getComputedStyle(node).gridTemplateColumns
        }));

        const grid = await spacing();
        await page.locator('#number-move-btn').click();
        await countAll(page, 6);
        const spread = await spacing();
        await page.locator('#number-move-btn').click();
        const bunched = await spacing();

        expect(spread).not.toEqual(grid);
        expect(bunched).not.toEqual(spread);
        expect(bunched).not.toEqual(grid);
        await expect(page.locator('.count-object')).toHaveCount(6);
    });
});

test.describe('Number Fun — model once, then hand over', () => {
    test.beforeEach(async ({ page }) => {
        await seedSettings(page, { speech: false });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
    });

    test('the first press demonstrates and the second hands the count over', async ({ page }) => {
        await page.keyboard.press('3');
        // A demonstration reveals one object at a time and counts them itself.
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(1, { timeout: 4000 });
        await expect(page.locator('#number-total')).toHaveText(/^3 /, { timeout: 6000 });

        await page.keyboard.press('3');
        // The child's turn: everything visible at once, nothing counted yet.
        await expect(page.locator('#number-objects.is-tappable')).toHaveCount(1);
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(3);
        await expect(page.locator('.count-object.is-counted')).toHaveCount(0);
    });

    test('a numeral that has not been seen yet is still demonstrated', async ({ page }) => {
        await page.keyboard.press('3');
        await expect(page.locator('#number-total')).toHaveText(/^3 /, { timeout: 6000 });

        await page.keyboard.press('2');
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(0);
        await expect(page.locator('#number-total')).toHaveText(/^2 /, { timeout: 6000 });
    });

    test('Show me replays the demonstration and Count them! hands it back', async ({ page }) => {
        await page.keyboard.press('2');
        await expect(page.locator('#number-total')).toHaveText(/^2 /, { timeout: 6000 });

        await page.locator('#number-count-btn').click();
        await expect(page.locator('#number-objects.is-tappable')).toHaveCount(1);
        await expect(page.locator('.count-object.is-counted')).toHaveCount(0);

        await page.locator('#number-show-btn').click();
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(0);
        await expect(page.locator('#number-total')).toHaveText(/^2 /, { timeout: 6000 });
    });
});

test.describe('Number Fun — the grown-up chooses who counts', () => {
    test('always counting for them reproduces the demonstration every time', async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'watch' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();

        await page.keyboard.press('2');
        await expect(page.locator('#number-total')).toHaveText(/^2 /, { timeout: 6000 });

        // Still demonstrated on the second press, unlike `auto`.
        await page.keyboard.press('2');
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(0);
        await expect(page.locator('#number-total')).toHaveText(/^2 /, { timeout: 6000 });
    });

    test('always letting them count skips the demonstration entirely', async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'tap' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();

        await page.keyboard.press('3');
        await expect(page.locator('.count-object.is-revealed')).toHaveCount(3);
        await expect(page.locator('.count-object.is-counted')).toHaveCount(0);
    });
});

test.describe('Number Fun — the counting voice, child-led', () => {
    test.beforeEach(async ({ page }) => {
        await seedSettings(page, { numbersCounting: 'tap' });
        await stubSpeech(page);
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await expect(page.locator('#numbers-container')).toHaveClass(/active/);
    });

    test('each tap speaks its number and the last one names the quantity', async ({ page }) => {
        await page.keyboard.press('3');
        await clearSpeechLog(page);

        const objects = page.locator('.count-object');
        for (const index of [0, 1, 2]) await objects.nth(index).click();
        await expect(page.locator('#number-total')).toHaveText(/^3 /);

        const spoken = await spokenTexts(page);
        expect(spoken.slice(0, 3)).toEqual(['One', 'Two', 'Three']);
        expect(spoken[3]).toMatch(/^Three\. There are three \w+\.$/);
    });

    test('re-touching a counted object repeats its number without advancing', async ({ page }) => {
        await page.keyboard.press('3');
        await clearSpeechLog(page);

        const objects = page.locator('.count-object');
        await objects.nth(1).click();
        await objects.nth(1).click();
        await objects.nth(1).click();

        expect(await spokenTexts(page)).toEqual(['One', 'One', 'One']);
        await expect(page.locator('.count-object.is-counted')).toHaveCount(1);
    });

    test('a re-count after moving states that the quantity did not change', async ({ page }) => {
        await page.keyboard.press('3');
        const objects = page.locator('.count-object');
        for (const index of [0, 1, 2]) await objects.nth(index).click();
        await expect(page.locator('#number-move-btn')).toBeVisible();

        await page.locator('#number-move-btn').click();
        await clearSpeechLog(page);
        for (const index of [0, 1, 2]) await objects.nth(index).click();
        await expect(page.locator('#number-total')).toHaveText(/^3 /);

        expect((await spokenTexts(page)).at(-1))
            .toBe('Still three. Moving them did not change how many.');
    });
});

test.describe('Number Fun — the same quantity, shown differently', () => {
    test.beforeEach(async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'tap' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await page.keyboard.press('4');
        await expect(page.locator('.count-object')).toHaveCount(4);
    });

    test('dots and a ten frame hold the same quantity and stay countable', async ({ page }) => {
        await page.locator('#number-view-dots').click();
        await expect(page.locator('#number-objects .numbers-dots .count-object')).toHaveCount(4);
        await expect(page.locator('#number-view-dots')).toHaveAttribute('aria-pressed', 'true');

        const dots = page.locator('.count-object');
        for (let index = 0; index < 4; index++) await dots.nth(index).click();
        await expect(page.locator('#number-total')).toHaveText(/^4 /);

        await page.locator('#number-view-frame').click();
        // The frame keeps all ten boxes; four of them hold an object.
        await expect(page.locator('#number-objects .numbers-frame .tf-cell')).toHaveCount(10);
        await expect(page.locator('.count-object')).toHaveCount(4);

        const cells = page.locator('.count-object');
        for (let index = 0; index < 4; index++) await cells.nth(index).click();
        await expect(page.locator('#number-total')).toHaveText(/^4 /);
    });

    test('a ten frame offers counting but not rearranging', async ({ page }) => {
        await page.locator('#number-view-frame').click();
        const cells = page.locator('.count-object');
        for (let index = 0; index < 4; index++) await cells.nth(index).click();
        await expect(page.locator('#number-total')).toHaveText(/^4 /);
        await expect(page.locator('#number-move-btn')).toBeHidden();
    });
});

test.describe('Number Fun — touch targets and fit', () => {
    test('the full nine-object set and every control fit and are big enough', async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'tap' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();

        await page.keyboard.press('9');
        await expect(page.locator('.count-object')).toHaveCount(9);

        const result = await page.locator('#numbers-container').evaluate(container => {
            const play = document.getElementById('play-area').getBoundingClientRect();
            const controls = [...container.querySelectorAll('button')]
                .filter(control => getComputedStyle(control).visibility !== 'hidden'
                    && !control.closest('[hidden]'));
            return {
                contained: [...controls, container].every(node => {
                    const rect = node.getBoundingClientRect();
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
        expect(result.targets.length).toBeGreaterThan(0);
        for (const target of result.targets) {
            expect(target.width).toBeGreaterThanOrEqual(44);
            expect(target.height).toBeGreaterThanOrEqual(44);
        }
    });
});

test.describe('Number Fun — what the grown-up can see', () => {
    test.beforeEach(async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'tap' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
    });

    test('an independent count is recorded for the grown-up, not the child', async ({ page }) => {
        await page.keyboard.press('3');
        const objects = page.locator('.count-object');
        for (const index of [0, 1, 2]) await objects.nth(index).click();
        await expect(page.locator('#number-total')).toHaveText(/^3 /);

        // Nothing about it reaches the play area: Numbers stays score-free.
        await expect(page.locator('#score-display')).toBeHidden();

        const stored = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('edamame-numbers-progress') || 'null'));
        expect(stored.digits['3'].counted).toBe(1);

        await page.locator('#settings-btn').click();
        await expect(page.locator('#numbers-progress-label')).toHaveText(/counted alone: 3/);
    });

    test('the record survives a reload and Start over needs two taps', async ({ page }) => {
        await page.keyboard.press('2');
        const objects = page.locator('.count-object');
        for (const index of [0, 1]) await objects.nth(index).click();
        await expect(page.locator('#number-total')).toHaveText(/^2 /);

        await page.reload();
        await page.locator('#play-area').click();
        await page.locator('#settings-btn').click();
        await expect(page.locator('#numbers-progress-label')).toHaveText(/counted alone: 2/);

        const reset = page.locator('#numbers-progress-reset');
        await reset.click();
        await expect(reset).toHaveText('Tap again to erase');
        await expect(page.locator('#numbers-progress-label')).toHaveText(/counted alone: 2/);
        await reset.click();
        await expect(page.locator('#numbers-progress-label')).toHaveText('nothing yet');
    });
});
