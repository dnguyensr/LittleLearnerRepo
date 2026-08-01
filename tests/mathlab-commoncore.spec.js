const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings } = require('./helpers');

// Pinning `mathLabLevel` to an exact skill id fixes the problem shape, which
// fixes the variant for most rungs. Where a rung still has two presentations
// (counting can flash a subitizing frame), reload until the wanted one comes up.
async function openLab(page, skill, variant, until) {
    await seedSettings(page, { betaModes: true, mathMethod: 'commoncore', mathLabLevel: skill });
    await gotoApp(page);
    await page.locator('#mathlab-btn').click();
    await expect(page.locator('#mathlab-container')).toHaveClass(/active/);

    const workspace = page.locator('#mathlab-workspace');
    for (let i = 0; i < 40 && variant; i++) {
        const matches = await workspace.getAttribute('data-variant') === variant
            && (!until || until(await readQuestion(page)));
        if (matches) break;
        await page.reload();
        await page.locator('#play-area').click();
        await page.locator('#mathlab-btn').click();
    }
    if (variant) await expect(workspace).toHaveAttribute('data-variant', variant);
}

async function tap(locator) {
    await locator.dispatchEvent('pointerdown', { pointerId: 1 });
}

// Read the operands off the question line, which every variant renders.
async function readQuestion(page) {
    const text = await page.locator('#mathlab-question').textContent();
    const m = text.match(/(\d+)\s*([+−])\s*(\d+)/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = Number(m[3]);
    return { a, b, answer: m[2] === '+' ? a + b : a - b };
}

async function type(page, text) {
    for (const ch of String(text)) await page.keyboard.press(ch);
}

test.describe('Math Lab — Common Core, counting', () => {
    test('ten frame: tapping cells places and removes counters', async ({ page }) => {
        await openLab(page, 'count10', 'tenframe');
        const cells = page.locator('.tf-cell');
        await expect(cells).toHaveCount(10);
        await expect(page.locator('.tf-cell.filled')).toHaveCount(0);

        await tap(cells.nth(0));
        await tap(cells.nth(1));
        await expect(page.locator('.tf-cell.filled')).toHaveCount(2);

        await tap(cells.nth(0));
        await expect(page.locator('.tf-cell.filled')).toHaveCount(1);
    });

    test('ten frame: the count of objects is the answer', async ({ page }) => {
        await openLab(page, 'count10', 'tenframe');
        const answer = await page.locator('#mathlab-workspace .math-emoji').count();
        expect(answer).toBeGreaterThanOrEqual(1);
        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('subitizing: the frame is dealt pre-filled, then covered', async ({ page }) => {
        await openLab(page, 'subitize', 'subitize');
        await expect(page.locator('#mathlab-question')).toContainText('How many did you see?');

        const frame = page.locator('.ten-frame');
        const filled = await page.locator('.tf-cell.filled').count();
        expect(filled).toBeGreaterThanOrEqual(1);
        await expect(frame).toHaveClass(/covered/, { timeout: 4000 });

        // Peek uncovers it briefly, then it hides again
        await tap(page.locator('.cc-peek'));
        await expect(frame).not.toHaveClass(/covered/);
        await expect(frame).toHaveClass(/covered/, { timeout: 3000 });

        await type(page, filled);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });
});

test.describe('Math Lab — Common Core, adding', () => {
    test('make-a-ten moves counters between frames without changing the total', async ({ page }) => {
        await openLab(page, 'makeTen', 'maketen');
        const { a, b, answer } = await readQuestion(page);
        expect(a + b).toBeGreaterThanOrEqual(10);

        const frameA = page.locator('.ten-frame[data-frame="a"]');
        const frameB = page.locator('.ten-frame[data-frame="b"]');
        await expect(frameA.locator('.tf-cell.filled')).toHaveCount(a);
        await expect(frameB.locator('.tf-cell.filled')).toHaveCount(b);

        await tap(frameB.locator('.tf-cell.filled').first());
        await expect(frameA.locator('.tf-cell.filled')).toHaveCount(a + 1);
        await expect(frameB.locator('.tf-cell.filled')).toHaveCount(b - 1);
        await expect(page.locator('.tf-cell.filled')).toHaveCount(a + b);

        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('make-a-ten is never chosen for a sum that cannot cross ten', async ({ page }) => {
        // addWithin10 caps sums at 10, so the strategy never applies here
        await seedSettings(page, { betaModes: true, mathMethod: 'commoncore', mathLabLevel: 'addWithin10' });
        await gotoApp(page);
        await page.locator('#mathlab-btn').click();

        for (let i = 0; i < 8; i++) {
            const { a, b } = await readQuestion(page);
            expect(a + b).toBeLessThanOrEqual(10);
            await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-variant', 'hops');
            await page.reload();
            await page.locator('#play-area').click();
            await page.locator('#mathlab-btn').click();
        }
    });

    test('number-line hops move the frog and trail the ticks passed over', async ({ page }) => {
        await openLab(page, 'addWithin10', 'hops');
        const { a, answer } = await readQuestion(page);
        await expect(page.locator(`.nl-tick[data-value="${a}"]`)).toHaveClass(/here/);

        await tap(page.locator(`.nl-tick[data-value="${answer}"]`));
        await expect(page.locator(`.nl-tick[data-value="${answer}"]`)).toHaveClass(/here/);
        await expect(page.locator(`.nl-tick[data-value="${a}"]`)).toHaveClass(/hopped/);

        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });
});

test.describe('Math Lab — single-step levels judge themselves', () => {
    test('a correct answer scores without ✓', async ({ page }) => {
        await openLab(page, 'addWithin10', 'hops');
        const { answer } = await readQuestion(page);
        await type(page, answer);
        // No Enter
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('a partial two-digit answer waits for the next digit', async ({ page }) => {
        await openLab(page, 'addRegroup', 'blocks');
        const { answer } = await readQuestion(page);
        expect(answer).toBeGreaterThanOrEqual(10);
        const [first, second] = String(answer);

        await type(page, first);
        await page.waitForTimeout(900);
        await expect(page.locator('#mathlab-answer-display')).toHaveText(first);
        await expect(page.locator('#word-count')).toHaveText('0');

        await type(page, second);
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('backspace still edits a partial answer', async ({ page }) => {
        await openLab(page, 'addRegroup', 'blocks');
        const { answer } = await readQuestion(page);
        const first = String(answer)[0];

        await type(page, first);
        await expect(page.locator('#mathlab-answer-display')).toHaveText(first);
        await page.keyboard.press('Backspace');
        await expect(page.locator('#mathlab-answer-display')).toHaveText('?');
    });

    test('a digit that cannot be right is judged immediately', async ({ page }) => {
        await openLab(page, 'addWithin10', 'hops');
        // 0 is never a sum here, and never the start of one
        await page.keyboard.press('0');
        await expect(page.locator('#mathlab-answer-display')).toHaveText('?', { timeout: 3000 });
        await expect(page.locator('#word-count')).toHaveText('0');
    });
});

test.describe('Math Lab — Common Core, taking away and two-digit', () => {
    test('taking away counts back on the number line', async ({ page }) => {
        await openLab(page, 'subWithin10', 'countback');
        const { a, answer } = await readQuestion(page);
        expect(answer).toBeLessThan(a);

        await tap(page.locator(`.nl-tick[data-value="${answer}"]`));
        await expect(page.locator(`.nl-tick[data-value="${answer}"]`)).toHaveClass(/here/);

        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('two-digit addition: ten loose ones snap into a rod', async ({ page }) => {
        // Insist on a problem that actually regroups — that's the behaviour
        // under test, so it shouldn't be left to the dice.
        await openLab(page, 'addRegroup', 'blocks');
        const { a, b, answer } = await readQuestion(page);
        const looseBefore = (a % 10) + (b % 10);
        expect(looseBefore).toBeGreaterThanOrEqual(10);

        await expect(page.locator('.btb-one')).toHaveCount(looseBefore);
        const rodsBefore = await page.locator('.btb-rod').count();
        expect(rodsBefore).toBe(Math.floor(a / 10) + Math.floor(b / 10));

        for (let i = 0; i < 10; i++) {
            await tap(page.locator('.btb-one:not(.selected)').first());
        }
        await expect(page.locator('.btb-rod')).toHaveCount(rodsBefore + 1);
        await expect(page.locator('.btb-one')).toHaveCount(looseBefore - 10);

        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('two-digit subtraction: the open number line hops back and undoes', async ({ page }) => {
        await openLab(page, 'subRegroup', 'openline');
        const { a, answer } = await readQuestion(page);
        const line = page.locator('.open-line');
        await expect(line).toHaveAttribute('data-position', String(a));

        await tap(page.locator('.ol-hop[data-hop="10"]'));
        await expect(line).toHaveAttribute('data-position', String(a - 10));
        await tap(page.locator('.ol-hop[data-hop="1"]'));
        await expect(line).toHaveAttribute('data-position', String(a - 11));
        await expect(page.locator('.ol-stop')).toHaveCount(3);

        await tap(page.locator('.ol-hop[data-hop="undo"]'));
        await expect(line).toHaveAttribute('data-position', String(a - 10));
        await expect(page.locator('.ol-stop')).toHaveCount(2);

        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('undo on a fresh line is a no-op, not a crash', async ({ page }) => {
        await openLab(page, 'subRegroup', 'openline');
        const { a } = await readQuestion(page);
        await tap(page.locator('.ol-hop[data-hop="undo"]'));
        await expect(page.locator('.open-line')).toHaveAttribute('data-position', String(a));
        await expect(page.locator('.ol-stop')).toHaveCount(1);
    });
});

test.describe('Math Lab — method selection', () => {
    test('Common Core is selectable and swaps the manipulative live', async ({ page }) => {
        await seedSettings(page, { betaModes: true, mathMethod: 'classical', mathLabLevel: 'addWithin10' });
        await gotoApp(page);
        await page.locator('#mathlab-btn').click();
        await expect(page.locator('.vertical-sum')).toBeVisible();

        await page.locator('#settings-btn').dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#settings-panel')).toBeVisible();
        await page.locator('#set-math-method').selectOption('commoncore');
        await page.locator('#settings-close').click();

        await expect(page.locator('.vertical-sum')).toHaveCount(0);
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-variant', 'hops');
    });

    // Which methods are selectable is asserted once, in
    // tests/mathlab-singapore.spec.js — the spec for the last one to land.
});
