const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings } = require('./helpers');

const PROGRESS_KEY = 'lls-mathlab-progress';

async function seedProgress(page, progress) {
    await page.addInitScript(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [PROGRESS_KEY, progress]);
}

async function openLab(page, settings = {}) {
    await seedSettings(page, { betaModes: true, mathLabLevel: 'auto', ...settings });
    await gotoApp(page);
    await page.locator('#mathlab-btn').click();
    await expect(page.locator('#mathlab-container')).toHaveClass(/active/);
}

async function type(page, text) {
    for (const ch of String(text)) await page.keyboard.press(ch);
}

// Level 1 is a plain count in every method, but each shows it differently.
async function level1Answer(page) {
    const workspace = page.locator('#mathlab-workspace');
    const variant = await workspace.getAttribute('data-variant');
    if (variant === 'abstract') return Number(await page.locator('.numeral-card').textContent());
    if (variant === 'subitize') return page.locator('.tf-cell.filled').count();
    if (variant === 'pictorial') return page.locator('.dot').count();
    return page.locator('#mathlab-workspace .math-emoji').count();
}

// Answer the current level-1 problem and wait for the next one to be dealt.
async function solveLevel1(page, expectedScore) {
    await type(page, await level1Answer(page));
    await page.keyboard.press('Enter');
    await expect(page.locator('#word-count')).toHaveText(String(expectedScore));
    await expect(page.locator('#mathlab-answer-display')).toHaveText('?', { timeout: 6000 });
}

test.describe('Math Lab — mix rotation', () => {
    test('mix cycles through all three methods, one per problem', async ({ page }) => {
        await openLab(page, { mathMethod: 'mix', mathLabLevel: '1' });
        const workspace = page.locator('#mathlab-workspace');

        const seen = [];
        for (let i = 1; i <= 3; i++) {
            seen.push(await workspace.getAttribute('data-method'));
            await solveLevel1(page, i);
        }

        expect(seen.sort()).toEqual(['classical', 'commoncore', 'singapore']);
    });

    test('a stale variant does not survive a switch to classical', async ({ page }) => {
        await openLab(page, { mathMethod: 'mix', mathLabLevel: '1' });
        const workspace = page.locator('#mathlab-workspace');

        // classical sets no data-variant, so whichever method ran before it
        // must not leave its own behind on the shared workspace element
        for (let i = 1; i <= 4; i++) {
            if (await workspace.getAttribute('data-method') === 'classical') break;
            await solveLevel1(page, i);
        }

        await expect(workspace).toHaveAttribute('data-method', 'classical');
        expect(await workspace.getAttribute('data-variant')).toBeNull();
    });

    test('mix is selectable and every method option is now enabled', async ({ page }) => {
        await seedSettings(page, { betaModes: true });
        await gotoApp(page);
        await page.locator('#settings-btn').dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#settings-panel')).toBeVisible();

        for (const value of ['classical', 'commoncore', 'singapore', 'mix']) {
            await expect(page.locator(`#set-math-method option[value="${value}"]`))
                .toHaveJSProperty('disabled', false);
        }

        await page.locator('#set-math-method').selectOption('mix');
        await page.locator('#settings-close').click();
        await page.locator('#mathlab-btn').click();
        await expect(page.locator('#mathlab-workspace'))
            .toHaveAttribute('data-method', /classical|commoncore|singapore/);
    });
});

test.describe('Math Lab — auto level progression', () => {
    test('five correct answers earn a level, announced to the child', async ({ page }) => {
        await seedProgress(page, { level: 1, streak: 4 });
        await openLab(page, { mathMethod: 'classical' });
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-level', '1');

        await type(page, await level1Answer(page));
        await page.keyboard.press('Enter');

        await expect(page.locator('#mathlab-prompt')).toHaveText('Level 2! 🎉');
        await expect(page.locator('#mathlab-workspace'))
            .toHaveAttribute('data-level', '2', { timeout: 8000 });
    });

    test('progress survives leaving the mode and coming back', async ({ page }) => {
        await seedProgress(page, { level: 3, streak: 2 });
        await openLab(page, { mathMethod: 'classical' });
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-level', '3');

        await page.locator('#free-btn').click();
        await expect(page.locator('#mathlab-container')).not.toHaveClass(/active/);
        await page.locator('#mathlab-btn').click();

        // The old session-scoped counter would have dropped this back to 1
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-level', '3');
    });

    test('progress survives a reload', async ({ page }) => {
        await seedProgress(page, { level: 2, streak: 0 });
        await openLab(page, { mathMethod: 'classical' });
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-level', '2');

        await page.reload();
        await page.locator('#play-area').click();
        await page.locator('#mathlab-btn').click();
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-level', '2');
    });

    test('level 4 is the ceiling — no level 5', async ({ page }) => {
        await seedProgress(page, { level: 4, streak: 4 });
        await openLab(page, { mathMethod: 'classical' });
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-level', '4');

        const { a, b } = await page.evaluate(() => {
            const digits = [...document.querySelectorAll('.column-sum .c-digit:not(.c-slot)')]
                .map(el => Number(el.textContent));
            return { a: digits[0] * 10 + digits[1], b: digits[2] * 10 + digits[3] };
        });
        const sign = await page.evaluate(() =>
            [...document.querySelectorAll('.column-sum .c-op')].map(el => el.textContent.trim()).find(Boolean));
        const answer = sign === '+' ? a + b : a - b;

        await type(page, answer % 10);
        await page.keyboard.press('Enter');
        await expect(page.locator('.c-slot[data-slot="ones"]')).toHaveClass(/done/);
        await type(page, Math.floor(answer / 10));
        await page.keyboard.press('Enter');

        await expect(page.locator('#word-count')).toHaveText('1');
        await expect(page.locator('#mathlab-prompt')).toHaveText('');
        await expect(page.locator('#mathlab-workspace'))
            .toHaveAttribute('data-level', '4', { timeout: 8000 });
    });

    test('a pinned level ignores stored progress and never advances it', async ({ page }) => {
        await seedProgress(page, { level: 3, streak: 4 });
        await openLab(page, { mathMethod: 'classical', mathLabLevel: '1' });
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-level', '1');

        await type(page, await level1Answer(page));
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
        await expect(page.locator('#mathlab-prompt')).toHaveText('');

        const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
        expect(stored).toEqual({ level: 3, streak: 4 });
    });

    test('a corrupt progress entry falls back to level 1 instead of breaking', async ({ page }) => {
        await page.addInitScript(key => localStorage.setItem(key, 'not json'), PROGRESS_KEY);
        await openLab(page, { mathMethod: 'classical' });
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-level', '1');
    });

    test('an out-of-range stored level is clamped', async ({ page }) => {
        await seedProgress(page, { level: 99, streak: -5 });
        await openLab(page, { mathMethod: 'classical' });
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-level', '4');
    });
});
