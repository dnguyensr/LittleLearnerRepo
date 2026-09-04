const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings, stubSpeech, spokenTexts, clearSpeechLog } = require('./helpers');

// P13 — making the letter. The P8 contracts (meeting a letter, its example, the
// three replay targets) stay in learning.spec.js; this file covers the
// constructive activity that sits on top of them.
//
// See docs/plans/13-letter-formation.md.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

async function meet(page, letter) {
    await page.keyboard.press(letter.toLowerCase());
    await expect(page.locator('#letter-display')).toHaveText(`${letter} ${letter.toLowerCase()}`);
}

// The first visit to a letter is modelled, so getting to the child's turn means
// letting the animation finish. Reduced motion is not used here: the animated
// path is what most children will actually see.
async function childTurn(page, letter) {
    await meet(page, letter);
    await page.locator('#letter-make-btn').click();
    await expect(page.locator('.trace-dot.is-active')).toHaveCount(1, { timeout: 15000 });
    await expect(page.locator('.trace-dot.is-done')).toHaveCount(0);
}

test.describe('Letter formation — the paths themselves', () => {
    test('every letter has strokes, and every stroke has at least two waypoints', async ({ page }) => {
        await gotoApp(page);
        const paths = await page.evaluate(async () => {
            const path = '/js/data/letter-paths.js';
            const module = await import(path);
            return module.letterPaths;
        });

        const problems = [];
        for (const letter of ALPHABET) {
            const strokes = paths[letter];
            if (!strokes || !strokes.length) {
                problems.push(`${letter}: no strokes`);
                continue;
            }
            strokes.forEach((stroke, index) => {
                if (stroke.length < 2) problems.push(`${letter}: stroke ${index} has ${stroke.length} point(s)`);
                for (const point of stroke) {
                    if (point.length !== 2 || point.some(value => typeof value !== 'number')) {
                        problems.push(`${letter}: stroke ${index} has a malformed point`);
                    }
                }
            });
        }
        expect(problems, problems.join('\n')).toEqual([]);
    });
});

test.describe('Letter formation', () => {
    test.beforeEach(async ({ page }) => {
        await seedSettings(page, { speech: false });
        await gotoApp(page);
        await page.locator('#letters-btn').click();
        await expect(page.locator('#letters-container')).toHaveClass(/active/);
    });

    test('meeting a letter offers making it but does not start it', async ({ page }) => {
        await meet(page, 'L');
        await expect(page.locator('#letter-make-btn')).toBeVisible();
        await expect(page.locator('#letter-trace')).toBeHidden();
        await expect(page.locator('#letter-watch-btn')).toBeHidden();
    });

    test('the first visit models the strokes, then hands over', async ({ page }) => {
        await meet(page, 'L');
        await page.locator('#letter-make-btn').click();

        // The model draws the path before any dot is live.
        await expect(page.locator('#letter-trace')).toBeVisible();
        await expect(page.locator('#letter-watch-btn')).toBeVisible();
        await expect(page.locator('.trace-dot.is-active')).toHaveCount(1, { timeout: 15000 });
        await expect(page.locator('#letter-ink')).toHaveAttribute('d', '');
    });

    test('only the next waypoint is operable, and tapping it draws the letter', async ({ page }) => {
        await childTurn(page, 'L');
        const dots = page.locator('.trace-dot');
        await expect(dots).toHaveCount(4);

        // Every dot but the live one is inert.
        const disabled = await dots.evaluateAll(nodes =>
            nodes.map(node => /** @type {HTMLButtonElement} */ (node).disabled));
        expect(disabled).toEqual([false, true, true, true]);

        await dots.nth(0).click();
        await expect(dots.nth(1)).toHaveClass(/is-active/);
        await expect(dots.nth(0)).toHaveClass(/is-done/);

        await dots.nth(1).click();
        // Two points of one stroke are drawn, so there is ink now.
        await expect(page.locator('#letter-ink')).not.toHaveAttribute('d', '');
    });

    test('the pen lifts between strokes rather than joining them', async ({ page }) => {
        // L is two strokes of two points: down, then across.
        await childTurn(page, 'L');
        const dots = page.locator('.trace-dot');
        for (const index of [0, 1, 2, 3]) await dots.nth(index).click();

        const d = await page.locator('#letter-ink').getAttribute('d');
        // One `M` per stroke. A single M would mean the two strokes were joined
        // by a segment the letter does not have.
        expect((d.match(/M/g) || []).length).toBe(2);
    });

    test('finishing draws the whole letter and marks every dot done', async ({ page }) => {
        await childTurn(page, 'T');
        const dots = page.locator('.trace-dot');
        const count = await dots.count();
        for (let index = 0; index < count; index++) await dots.nth(index).click();

        await expect(page.locator('.trace-dot.is-done')).toHaveCount(count);
        await expect(page.locator('.trace-dot.is-active')).toHaveCount(0);
        await expect(page.locator('#letter-trace')).toHaveClass(/is-complete/);
    });

    test('a second visit to the same letter skips the demonstration', async ({ page }) => {
        await childTurn(page, 'L');
        await page.locator('.trace-dot').nth(0).click();

        await meet(page, 'V');
        await meet(page, 'L');
        await page.locator('#letter-make-btn').click();
        // Straight to the child's turn: dot one is live immediately, and the
        // part-finished trace from before did not survive.
        await expect(page.locator('.trace-dot.is-active')).toHaveCount(1);
        await expect(page.locator('.trace-dot.is-done')).toHaveCount(0);
    });

    test('choosing another letter abandons a part-finished trace', async ({ page }) => {
        await childTurn(page, 'L');
        await page.locator('.trace-dot').nth(0).click();
        await expect(page.locator('.trace-dot.is-done')).toHaveCount(1);

        await meet(page, 'X');
        await expect(page.locator('#letter-trace')).toBeHidden();
        await expect(page.locator('.trace-dot')).toHaveCount(0);
        await expect(page.locator('#letter-ink')).toHaveAttribute('d', '');
    });

    test('leaving Letters clears the tracing surface', async ({ page }) => {
        await childTurn(page, 'L');
        await page.locator('#numbers-btn').click();
        await page.locator('#letters-btn').click();
        await expect(page.locator('#letter-trace')).toBeHidden();
        await expect(page.locator('.trace-dot')).toHaveCount(0);
    });

    test('the live dot is a 44px target and the inert ones are hidden from AT', async ({ page }) => {
        // S has the most waypoints, so it is the worst case for crowding.
        await childTurn(page, 'S');
        const active = page.locator('.trace-dot.is-active');
        const box = await active.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);

        await expect(active).toHaveAttribute('aria-hidden', 'false');
        await expect(active).toHaveAttribute('aria-label', /Start S here/);
        const hidden = await page.locator('.trace-dot:not(.is-active)').evaluateAll(nodes =>
            nodes.every(node => node.getAttribute('aria-hidden') === 'true'));
        expect(hidden).toBe(true);
    });

    test('the letter and its controls fit the play area', async ({ page }) => {
        await childTurn(page, 'S');
        const contained = await page.locator('#letters-container').evaluate(container => {
            const play = document.getElementById('play-area').getBoundingClientRect();
            const rect = container.getBoundingClientRect();
            return rect.top >= play.top - 1 && rect.bottom <= play.bottom + 1
                && rect.left >= play.left - 1 && rect.right <= play.right + 1;
        });
        expect(contained).toBe(true);
    });
});

test.describe('Letter formation — what it says', () => {
    test('it names the letter when the child finishes making it', async ({ page }) => {
        await stubSpeech(page);
        await gotoApp(page);
        await page.locator('#letters-btn').click();
        await meet(page, 'L');
        await page.locator('#letter-make-btn').click();
        await expect(page.locator('.trace-dot.is-active')).toHaveCount(1, { timeout: 15000 });

        await clearSpeechLog(page);
        const dots = page.locator('.trace-dot');
        for (const index of [0, 1, 2, 3]) await dots.nth(index).click();

        // "ell" is how js/data/letters.js spells L for the speech engine, so the
        // engine names the letter instead of describing the character.
        expect((await spokenTexts(page)).at(-1)).toBe('You made ell!');
    });
});
