const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings } = require('./helpers');

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} skill  exact skill id, accepted by the mathLabLevel setting
 * @param {{ variant?: string, until?: (q: any) => boolean }} [options]
 */
async function openLab(page, skill, { variant, until } = {}) {
    await seedSettings(page, { betaModes: true, mathMethod: 'singapore', mathLabLevel: skill });
    await gotoApp(page);
    await page.locator('#mathlab-btn').click();
    await expect(page.locator('#mathlab-container')).toHaveClass(/active/);

    const workspace = page.locator('#mathlab-workspace');
    for (let i = 0; i < 40 && (variant || until); i++) {
        const matches = (!variant || await workspace.getAttribute('data-variant') === variant)
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

// The concrete/pictorial rotation is derived from correct answers *this
// session*, which resets whenever the mode is activated — so the later stage
// can only be reached by actually playing, not by reloading until it turns up.
async function solveCount(page, expectedScore) {
    const answer = await page.locator('#mathlab-workspace .tap-item').count();
    await type(page, answer);
    await page.keyboard.press('Enter');
    await expect(page.locator('#word-count')).toHaveText(String(expectedScore));
    await expect(page.locator('#mathlab-answer-display')).toHaveText('?', { timeout: 5000 });
}

test.describe('Math Lab — Singapore, counting (concrete → pictorial)', () => {
    test('a fresh session starts concrete, with countable objects', async ({ page }) => {
        await openLab(page, 'count10');
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-variant', 'concrete');
        expect(await page.locator('#mathlab-workspace .tap-item').count()).toBeGreaterThanOrEqual(1);
        await expect(page.locator('.dot-card')).toHaveCount(0);
    });

    test('two correct answers move concrete → pictorial (a dot card)', async ({ page }) => {
        await openLab(page, 'count10');
        const workspace = page.locator('#mathlab-workspace');

        await solveCount(page, 1);
        await expect(workspace).toHaveAttribute('data-variant', 'concrete');
        await solveCount(page, 2);
        await expect(workspace).toHaveAttribute('data-variant', 'pictorial');

        const dots = page.locator('.dot-card .dot');
        expect(await dots.count()).toBeGreaterThanOrEqual(1);
        await expect(page.locator('#mathlab-question')).toHaveText('How many dots?');

        await tap(dots.first());
        await expect(dots.first()).toHaveClass(/counted/);
    });

    test('the rotation wraps back to concrete after pictorial', async ({ page }) => {
        await openLab(page, 'count10');
        for (let i = 1; i <= 4; i++) await solveCount(page, i);
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-variant', 'concrete');
    });

    // The abstract step is its own ladder rung now, not a stage in the rotation.
    test('the numeralMatch rung gives the numeral and asks for the quantity', async ({ page }) => {
        await openLab(page, 'numeralMatch');
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-variant', 'numeralbuild');

        const target = Number(await page.locator('.numeral-card').textContent());
        expect(target).toBeGreaterThanOrEqual(1);
        await expect(page.locator('#mathlab-question')).toContainText(`Show me ${target}`);

        const cells = page.locator('.tf-cell');
        await expect(cells).toHaveCount(10);
        for (let i = 0; i < target; i++) await tap(cells.nth(i));
        await expect(page.locator('.tf-cell.filled')).toHaveCount(target);

        await type(page, target);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });
});

test.describe('Math Lab — Singapore, number bonds', () => {
    test('the whole is the answer slot and fills as you type', async ({ page }) => {
        await openLab(page, 'addWithin10');
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-variant', 'bond');
        const { a, b, answer } = await readQuestion(page);

        await expect(page.locator('.nb-part[data-part="0"]')).toHaveText(String(a));
        await expect(page.locator('.nb-part[data-part="1"]')).toHaveText(String(b));
        await expect(page.locator('.nb-whole .nb-slot')).toHaveText('?');
        // The answer goes in the bond, not a separate box
        await expect(page.locator('#mathlab-answer-display')).toBeHidden();

        await page.keyboard.press('1');
        await expect(page.locator('.nb-whole .nb-slot')).toHaveText('1');
        await page.keyboard.press('Backspace');

        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('.nb-whole .nb-slot')).toHaveClass(/done/);
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('make-a-ten splits the second part into what completes ten and the rest', async ({ page }) => {
        await openLab(page, 'makeTen');
        const { a, b } = await readQuestion(page);
        const toTen = 10 - a;

        await expect(page.locator('#mathlab-workspace .cc-label'))
            .toHaveText('Tap the second part to break it up!');

        await tap(page.locator('.nb-part[data-part="1"]'));
        const subparts = page.locator('.nb-subpart');
        await expect(subparts).toHaveCount(2);
        await expect(subparts.nth(0)).toHaveText(String(toTen));
        await expect(subparts.nth(1)).toHaveText(String(b - toTen));

        // Splitting twice must not stack more circles
        await tap(page.locator('.nb-part[data-part="1"]'));
        await expect(subparts).toHaveCount(2);
    });

    test('a bond that cannot make ten offers no split', async ({ page }) => {
        await openLab(page, 'addWithin5');
        await expect(page.locator('#mathlab-workspace .cc-label'))
            .toHaveText('Put the parts together!');
        await tap(page.locator('.nb-part[data-part="1"]'));
        await expect(page.locator('.nb-subpart')).toHaveCount(0);
    });
});

test.describe('Math Lab — Singapore, bar models', () => {
    test('taking away hides a part and reveals it only after a correct answer', async ({ page }) => {
        await openLab(page, 'subWithin10');
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-variant', 'missingpart');
        const { a, b, answer } = await readQuestion(page);

        await expect(page.locator('.nb-whole')).toHaveText(String(a));
        await expect(page.locator('.nb-part[data-part="0"]')).toHaveText(String(b));
        await expect(page.locator('.bm-seg.covered')).toHaveText('?');
        await expect(page.locator('.bm-brace')).toHaveText(`${a} in all`);

        // A wrong answer must not give the hidden part away
        await page.keyboard.press('0');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        await expect(page.locator('.bm-seg.covered')).toHaveCount(1);

        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('.bm-seg.revealed')).toHaveText(String(answer));
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('two-digit addition splits both numbers into tens and ones', async ({ page }) => {
        await openLab(page, 'addWithin100');
        const { a, b, answer } = await readQuestion(page);

        const bars = page.locator('.bar-model');
        await expect(bars).toHaveCount(2);
        await expect(bars.nth(0).locator('.bm-seg').nth(0)).toHaveText(String(Math.floor(a / 10) * 10));
        await expect(bars.nth(0).locator('.bm-seg').nth(1)).toHaveText(String(a % 10));
        await expect(bars.nth(1).locator('.bm-brace')).toHaveText(String(b));

        // Each combine button turns into its own result chip
        const tensBtn = page.locator('.sg-combine[data-combine="tens"]');
        const onesBtn = page.locator('.sg-combine[data-combine="ones"]');
        await expect(tensBtn).toHaveText('Tens');

        await tap(tensBtn);
        await expect(tensBtn).toHaveText(`Tens: ${Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10}`);
        await tap(onesBtn);
        await expect(onesBtn).toHaveText(`Ones: ${(a % 10) + (b % 10)}`);
        await expect(page.locator('.sg-combine.used')).toHaveCount(2);

        // Tapping a spent button must not re-run the combine
        const tensText = await tensBtn.textContent();
        await tap(tensBtn);
        await expect(tensBtn).toHaveText(tensText);
        await expect(page.locator('.sg-combine')).toHaveCount(2);

        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('two-digit subtraction is a comparison bar with the part hidden', async ({ page }) => {
        await openLab(page, 'subWithin100');
        const { a, answer } = await readQuestion(page);
        await expect(page.locator('.bm-brace')).toHaveText(`${a} in all`);
        await expect(page.locator('.bm-seg.covered')).toHaveText('?');

        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('.bm-seg.revealed')).toHaveText(String(answer));
        await expect(page.locator('#word-count')).toHaveText('1');
    });
});

// Which methods are selectable is asserted once, in
// tests/mathlab-progression.spec.js — the spec for the last one to land.
test.describe('Math Lab — method selection', () => {
    test('switching to Singapore swaps in its manipulative', async ({ page }) => {
        await seedSettings(page, { betaModes: true, mathMethod: 'commoncore', mathLabLevel: 'addWithin10' });
        await gotoApp(page);
        await page.locator('#mathlab-btn').click();
        await expect(page.locator('.number-bond')).toHaveCount(0);

        await page.locator('#settings-btn').dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#settings-panel')).toBeVisible();
        await page.locator('#set-math-method').selectOption('singapore');
        await page.locator('#settings-close').click();

        await expect(page.locator('.number-bond')).toHaveCount(1);
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-variant', 'bond');
    });
});
