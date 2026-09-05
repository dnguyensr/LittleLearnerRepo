const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings, stubSpeech, spokenTexts, clearSpeechLog } = require('./helpers');

// P14 — Patterns. The rule that shapes every assertion here: a choice that does
// not fit is not an error. It leaves the activity exactly as it was.
//
// See docs/plans/14-patterns.md.

async function openPatterns(page) {
    await page.locator('#patterns-btn').click();
    await expect(page.locator('#patterns-container')).toHaveClass(/active/);
    await expect(page.locator('.pattern-choice')).not.toHaveCount(0);
}

/** The emoji that actually continues the row, derived from the row itself. */
async function expectedNext(page) {
    return await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('#pattern-sequence .pattern-tile')]
            .filter(tile => !tile.classList.contains('is-slot'));
        const shown = tiles.map(tile => tile.textContent);
        // The unit repeats, so the next item is the one a whole number of units
        // back. Trying the shortest unit first finds the real period.
        for (let unit = 1; unit <= 3; unit++) {
            const period = shown.slice(0, unit);
            if (shown.every((item, index) => item === period[index % unit])) {
                return shown[shown.length + 1 - unit - 1] !== undefined
                    ? period[shown.length % unit]
                    : null;
            }
        }
        return null;
    });
}

/**
 * The state that must not change when a choice does not fit: what is in the
 * row, and whether the slot is still empty. Deliberately not innerHTML — the
 * read-along highlight walks the row on a timer, and that transient class is a
 * reading indicator, not part of the puzzle.
 */
async function rowState(page) {
    return await page.locator('#pattern-sequence .pattern-tile').evaluateAll(nodes =>
        nodes.map(node => ({
            item: node.textContent,
            slot: node.classList.contains('is-slot')
        })));
}

async function tapCorrect(page) {
    const next = await expectedNext(page);
    await page.locator(`.pattern-choice[data-emoji="${next}"]`).first().click();
    return next;
}

async function tapWrong(page) {
    const next = await expectedNext(page);
    const wrong = await page.locator('.pattern-choice').evaluateAll((nodes, answer) =>
        nodes.map(node => node.getAttribute('data-emoji')).find(emoji => emoji !== answer), next);
    await page.locator(`.pattern-choice[data-emoji="${wrong}"]`).first().click();
    return wrong;
}

test.describe('Patterns', () => {
    test.beforeEach(async ({ page }) => {
        await seedSettings(page, { speech: false });
        await gotoApp(page);
        await openPatterns(page);
    });

    test('a pattern shows a repeating row with the last item missing', async ({ page }) => {
        const tiles = page.locator('#pattern-sequence .pattern-tile');
        await expect(tiles).not.toHaveCount(0);
        await expect(page.locator('#pattern-slot')).toHaveText('❓');

        // Whatever type was generated, the visible run really does repeat.
        const repeats = await page.evaluate(() => {
            const shown = [...document.querySelectorAll('#pattern-sequence .pattern-tile')]
                .filter(tile => !tile.classList.contains('is-slot'))
                .map(tile => tile.textContent);
            for (let unit = 1; unit <= 3; unit++) {
                if (shown.every((item, index) => item === shown[index % unit])) return true;
            }
            return false;
        });
        expect(repeats).toBe(true);
    });

    test('the choices are drawn from the pattern itself, never from elsewhere', async ({ page }) => {
        const inRow = await page.locator('#pattern-sequence .pattern-tile').evaluateAll(nodes =>
            nodes.filter(node => !node.classList.contains('is-slot')).map(node => node.textContent));
        const offered = await page.locator('.pattern-choice').evaluateAll(nodes =>
            nodes.map(node => node.getAttribute('data-emoji')));

        expect(offered.length).toBeGreaterThanOrEqual(2);
        for (const emoji of offered) expect(inRow).toContain(emoji);
    });

    test('the right choice fills the slot and completes the row', async ({ page }) => {
        await expect(page.locator('#score-display')).toBeHidden();
        const next = await tapCorrect(page);
        await expect(page.locator('#pattern-slot')).toHaveText(next);
        await expect(page.locator('#pattern-slot')).toHaveClass(/is-filled/);
        await expect(page.locator('#pattern-prompt')).toHaveText('It keeps going!');
        await expect(page.locator('#pattern-next-btn')).toBeVisible();
        await expect(page.locator('#score-display')).toBeHidden();
        expect(await page.evaluate(() => localStorage.getItem('edamame-score-patterns'))).toBeNull();
    });

    // The central promise of this mode.
    test('a choice that does not fit changes nothing', async ({ page }) => {
        const before = await rowState(page);
        const score = await page.locator('#word-count').textContent();

        await tapWrong(page);

        await expect(page.locator('#pattern-slot')).toHaveText('❓');
        expect(await rowState(page)).toEqual(before);
        await expect(page.locator('#word-count')).toHaveText(score);
        await expect(page.locator('#pattern-next-btn')).toBeHidden();
        // Every choice is still available, including the one just tried.
        const enabled = await page.locator('.pattern-choice').evaluateAll(nodes =>
            nodes.every(node => !(/** @type {HTMLButtonElement} */ (node).disabled)));
        expect(enabled).toBe(true);
    });

    test('the child can still finish after a choice that did not fit', async ({ page }) => {
        await tapWrong(page);
        const next = await tapCorrect(page);
        await expect(page.locator('#pattern-slot')).toHaveText(next);
        await expect(page.locator('#pattern-next-btn')).toBeVisible();
    });

    test('the child chooses when to move on', async ({ page }) => {
        await tapCorrect(page);
        const solved = await rowState(page);
        await page.waitForTimeout(600);
        // Nothing advances on its own.
        expect(await rowState(page)).toEqual(solved);

        await page.locator('#pattern-next-btn').click();
        await expect(page.locator('#pattern-slot')).toHaveText('❓');
        await expect(page.locator('#pattern-next-btn')).toBeHidden();
    });

    test('no keyboard press disturbs the pattern', async ({ page }) => {
        const before = await rowState(page);
        for (const key of ['a', '5', 'Enter', 'Backspace']) await page.keyboard.press(key);
        expect(await rowState(page)).toEqual(before);
    });

    test('every tile and choice is a big enough target inside the play area', async ({ page }) => {
        const result = await page.locator('#patterns-container').evaluate(container => {
            const play = document.getElementById('play-area').getBoundingClientRect();
            const rect = container.getBoundingClientRect();
            const choices = [...container.querySelectorAll('.pattern-choice')];
            return {
                contained: rect.top >= play.top - 1 && rect.bottom <= play.bottom + 1
                    && rect.left >= play.left - 1 && rect.right <= play.right + 1,
                targets: choices.map(choice => {
                    const box = choice.getBoundingClientRect();
                    return { width: box.width, height: box.height };
                })
            };
        });
        expect(result.contained).toBe(true);
        for (const target of result.targets) {
            expect(target.width).toBeGreaterThanOrEqual(44);
            expect(target.height).toBeGreaterThanOrEqual(44);
        }
    });
});

test.describe('Patterns — readiness', () => {
    test('five independent successes in six master a stage and move on', async ({ page }) => {
        await seedSettings(page, { speech: false });
        await gotoApp(page);
        await openPatterns(page);

        for (let round = 0; round < 6; round++) {
            await tapCorrect(page);
            await expect(page.locator('#pattern-next-btn')).toBeVisible();
            await page.locator('#pattern-next-btn').click();
            await expect(page.locator('#pattern-slot')).toHaveText('❓');
        }

        const stored = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('edamame-patterns-progress') || 'null'));
        expect(stored.types.ab.mastered).toBe(true);
        expect(stored.currentType).toBe('aab');
    });

    test('a puzzle that needed help still celebrates but does not count', async ({ page }) => {
        await seedSettings(page, { speech: false });
        await gotoApp(page);
        await openPatterns(page);

        for (let round = 0; round < 6; round++) {
            await tapWrong(page);
            await tapCorrect(page);
            await expect(page.locator('#pattern-next-btn')).toBeVisible();
            await page.locator('#pattern-next-btn').click();
        }

        const stored = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('edamame-patterns-progress') || 'null'));
        expect(stored.types.ab.mastered).toBe(false);
        expect(stored.currentType).toBe('ab');
    });

    test('a pinned stage overrides the learning path', async ({ page }) => {
        await seedSettings(page, { speech: false, patternStage: 'abc' });
        await gotoApp(page);
        await openPatterns(page);

        // abc uses three distinct items, so three choices are offered.
        await expect(page.locator('.pattern-choice')).toHaveCount(3);
    });

    test('progress survives a reload and Start over takes two taps', async ({ page }) => {
        await seedSettings(page, { speech: false });
        await gotoApp(page);
        await openPatterns(page);
        await tapCorrect(page);

        await page.reload();
        await page.locator('#play-area').click();
        await page.locator('#settings-btn').click();
        await expect(page.locator('#patterns-progress-label')).not.toHaveText('');

        const reset = page.locator('#patterns-progress-reset');
        await reset.click();
        await expect(reset).toHaveText('Tap again to erase');
        await reset.click();
        const stored = await page.evaluate(() => localStorage.getItem('edamame-patterns-progress'));
        expect(stored).toBeNull();
    });

    test('corrupt stored progress normalizes instead of breaking the mode', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('edamame-patterns-progress', '{"version":1,"currentType":"nope","types":"broken"}');
            localStorage.setItem('edamame-settings', JSON.stringify({ speech: false }));
        });
        await gotoApp(page);
        await openPatterns(page);
        await expect(page.locator('#pattern-slot')).toHaveText('❓');
    });
});

test.describe('Patterns — what it says', () => {
    test('the pattern is read aloud, one item at a time', async ({ page }) => {
        await stubSpeech(page);
        await gotoApp(page);
        await openPatterns(page);

        await clearSpeechLog(page);
        await page.locator('#pattern-speak-btn').click();

        // speakPaced puts a deliberate gap between phrases, so the queue
        // arrives over time rather than all at once.
        await expect.poll(async () => (await spokenTexts(page)).at(-1), { timeout: 8000 })
            .toBe('What comes next?');
        expect((await spokenTexts(page)).length).toBeGreaterThan(2);
    });

    test('completing says what the pattern is doing', async ({ page }) => {
        await stubSpeech(page);
        await gotoApp(page);
        await openPatterns(page);

        await clearSpeechLog(page);
        await tapCorrect(page);
        await expect.poll(async () => (await spokenTexts(page)).at(-1), { timeout: 5000 })
            .toMatch(/It keeps going!$/);
    });
});
