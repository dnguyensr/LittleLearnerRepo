const { test, expect } = require('@playwright/test');
const { gotoApp, ensureOskVisible, seedSettings } = require('./helpers');

// Open Math Lab pinned to one skill, so each spec exercises a known layout.
// `mathLabLevel` accepts an exact skill id as well as a stage id.
async function openLab(page, skill) {
    await seedSettings(page, { betaModes: true, mathMethod: 'classical', mathLabLevel: skill });
    await gotoApp(page);
    await page.locator('#mathlab-btn').click();
    await expect(page.locator('#mathlab-container')).toHaveClass(/active/);
}

// Read the problem back out of the manipulative, the way the child sees it.
function readProblem(page) {
    return page.evaluate(() => {
        const nums = sel => [...document.querySelectorAll(sel)].map(el => Number(el.textContent));
        const counters = document.querySelectorAll('#mathlab-workspace .tap-counter');

        if (document.querySelector('.column-sum')) {
            const [aT, aO, bT, bO] = nums('.column-sum .c-digit:not(.c-slot)');
            const sign = [...document.querySelectorAll('.column-sum .c-op')]
                .map(el => el.textContent.trim()).find(Boolean);
            const a = aT * 10 + aO;
            const b = bT * 10 + bO;
            const answer = sign === '+' ? a + b : a - b;
            return { a, b, sign, answer, regroups: sign === '+' ? aO + bO >= 10 : aO < bO };
        }

        const vertical = document.querySelector('.vertical-sum');
        if (vertical) {
            const [a, b] = nums('.vertical-sum .v-num:not(.v-slot)');
            const sign = vertical.querySelector('.v-op').textContent.trim();
            return { a, b, sign, answer: sign === '+' ? a + b : a - b };
        }

        const a = counters[0].querySelectorAll('.tap-item').length;
        return { a, b: null, sign: null, answer: a };
    });
}

async function type(page, text) {
    for (const ch of String(text)) await page.keyboard.press(ch);
}

test.describe('Math Lab — classical, counting', () => {
    test.beforeEach(async ({ page }) => openLab(page, 'count10'));

    test('renders tappable counters and the numpad', async ({ page }) => {
        const items = page.locator('#mathlab-workspace .tap-item');
        expect(await items.count()).toBeGreaterThanOrEqual(1);
        await expect(page.locator('#mathlab-answer-display')).toHaveText('?');
        await expect(page.locator('#mathlab-speak-btn')).toBeVisible();
        await ensureOskVisible(page);
        await expect(page.locator('#osk')).toHaveClass(/numpad/);
    });

    test('tapping an object counts it, tapping again un-counts it', async ({ page }) => {
        const first = page.locator('#mathlab-workspace .tap-item').first();
        await first.dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(first).toHaveClass(/counted/);
        await first.dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(first).not.toHaveClass(/counted/);
    });

    test('typing the count and confirming scores', async ({ page }) => {
        const { answer } = await readProblem(page);
        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('two wrong answers walk the count aloud', async ({ page }) => {
        for (let i = 0; i < 2; i++) {
            await page.keyboard.press('0');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(900);
        }
        await expect(page.locator('#mathlab-workspace .tap-item.counted').first())
            .toBeVisible({ timeout: 4000 });
        await expect(page.locator('#word-count')).toHaveText('0');
    });
});

test.describe('Math Lab — classical, adding and taking away', () => {
    test('adding shows stacked notation and scores a correct sum', async ({ page }) => {
        await openLab(page, 'addWithin10');
        await expect(page.locator('.vertical-sum')).toBeVisible();
        const { a, b, sign, answer } = await readProblem(page);
        expect(sign).toBe('+');
        expect(answer).toBe(a + b);

        // The answer goes into the notation, not a second box below it
        await expect(page.locator('#mathlab-answer-display')).toBeHidden();
        await page.keyboard.press('1');
        await expect(page.locator('.v-slot')).toHaveText('1');

        await page.keyboard.press('Backspace');
        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('taking away shows the eater and takes one away per tap', async ({ page }) => {
        await openLab(page, 'subWithin10');
        const { sign, answer } = await readProblem(page);
        expect(sign).toBe('−');

        const eater = page.locator('.eater-btn');
        await expect(eater).toBeVisible();
        await eater.dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#mathlab-workspace .tap-item.eaten')).toHaveCount(1);

        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });
});

test.describe('Math Lab — classical, two-digit column algorithm', () => {
    test.beforeEach(async ({ page }) => openLab(page, 'addRegroup'));

    test('answers the ones column first, then the tens', async ({ page }) => {
        const { answer, regroups } = await readProblem(page);
        const ones = answer % 10;
        const tens = Math.floor(answer / 10);
        expect(tens).toBeGreaterThan(0);

        await expect(page.locator('#mathlab-prompt')).toHaveText('Ones first!');

        await type(page, ones);
        await page.keyboard.press('Enter');
        await expect(page.locator('.c-slot[data-slot="ones"]')).toHaveText(String(ones));
        await expect(page.locator('.c-slot[data-slot="ones"]')).toHaveClass(/done/);
        await expect(page.locator('#mathlab-prompt')).toHaveText('Now the tens!');
        await expect(page.locator('#word-count')).toHaveText('0');

        if (regroups) {
            await expect(page.locator('.c-carry[data-carry="tens"]')).toHaveText('1');
        }

        await type(page, tens);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('a wrong ones digit does not advance to the tens column', async ({ page }) => {
        const { answer } = await readProblem(page);
        const wrong = (answer % 10 + 1) % 10;

        await type(page, wrong);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        await expect(page.locator('#mathlab-prompt')).toHaveText('Ones first!');
        await expect(page.locator('.c-slot[data-slot="ones"]')).toHaveText('?');
        await expect(page.locator('#word-count')).toHaveText('0');
    });
});

test.describe('Math Lab — settings plumbing', () => {
    test('score is kept separately from Math mode', async ({ page }) => {
        await seedSettings(page, { betaModes: true, mathLabLevel: 'count10' });
        await page.addInitScript(() => localStorage.setItem('lls-score-math', '7'));
        await gotoApp(page);

        await page.locator('#math-btn').click();
        await expect(page.locator('#word-count')).toHaveText('7');
        await page.locator('#mathlab-btn').click();
        await expect(page.locator('#word-count')).toHaveText('0');
    });
});
