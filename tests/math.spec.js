const { test, expect } = require('@playwright/test');
const { gotoApp, ensureOskVisible, seedSettings } = require('./helpers');

/**
 * The answer isn't exposed in the DOM. Tiers 2-4 render an equation, which is
 * unambiguous; tier 1 has none, so fall back to counting the .math-emoji spans
 * (one span per emoji, so multi-codepoint emojis can't skew the count).
 */
async function computeAnswer(page) {
    return page.evaluate(() => {
        const equation = document.getElementById('math-equation');
        const text = equation && equation.style.display !== 'none' ? equation.textContent.trim() : '';

        // "3 + 4 = ?" / "8 − 3 = ?" / "3 + ? = 8" (missing addend)
        const solved = text.match(/^(\d+)\s*([+−])\s*(\d+)\s*=\s*\?/);
        if (solved) {
            const [, a, op, b] = solved;
            return op === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
        }
        const missing = text.match(/^(\d+)\s*\+\s*\?\s*=\s*(\d+)/);
        if (missing) return Number(missing[2]) - Number(missing[1]);

        return document.querySelectorAll('#math-emojis .math-emoji').length;
    });
}

// Reload until a two-digit answer turns up, so prefix behaviour can be tested.
async function openWithTwoDigitAnswer(page) {
    await seedSettings(page, { mathTier: '4' });
    for (let i = 0; i < 30; i++) {
        await gotoApp(page);
        await page.locator('#math-btn').click();
        await expect(page.locator('#math-container')).toHaveClass(/active/);
        const answer = await computeAnswer(page);
        if (answer >= 10) return answer;
    }
    throw new Error('no two-digit answer after 30 attempts');
}

test.describe('Math mode', () => {
    test.beforeEach(async ({ page }) => {
        await gotoApp(page);
        await page.locator('#math-btn').click();
        await expect(page.locator('#math-container')).toHaveClass(/active/);
    });

    test('shows a problem and the numpad layout with a confirm key', async ({ page }) => {
        await expect(page.locator('#math-question')).not.toBeEmpty();
        await expect(page.locator('#math-answer-display')).toHaveText('?');
        await ensureOskVisible(page);
        await expect(page.locator('#osk')).toHaveClass(/numpad/);
        await expect(page.locator('.osk-key')).toHaveCount(12);
        await expect(page.locator('.osk-key.confirm')).toHaveText('✓');
    });

    test('a correct answer scores without pressing ✓', async ({ page }) => {
        const answer = await computeAnswer(page);
        expect(answer).toBeGreaterThanOrEqual(1);
        for (const digit of String(answer)) {
            await page.keyboard.press(digit);
        }
        // No Enter — the last digit is enough
        await expect(page.locator('#word-count')).toHaveText('1');
        await expect(page.locator('#math-answer-display')).toHaveText('?', { timeout: 5000 });
    });

    test('✓ still works for anyone who reaches for it', async ({ page }) => {
        const answer = await computeAnswer(page);
        await ensureOskVisible(page);
        for (const digit of String(answer)) {
            await page.keyboard.press(digit);
        }
        await page.locator('.osk-key.confirm').dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('a wrong answer resets without scoring, no ✓ needed', async ({ page }) => {
        // 0 is never correct and never the start of a correct answer
        await page.keyboard.press('0');
        await expect(page.locator('#math-answer-display')).toHaveText('?', { timeout: 3000 });
        await expect(page.locator('#word-count')).toHaveText('0');
    });

    test('a partial answer that could still be right is not judged', async ({ page }) => {
        const answer = await openWithTwoDigitAnswer(page);
        const firstDigit = String(answer)[0];

        await page.keyboard.press(firstDigit);
        await page.waitForTimeout(900);
        // Still waiting for the second digit, not flashed as wrong
        await expect(page.locator('#math-answer-display')).toHaveText(firstDigit);
        await expect(page.locator('#word-count')).toHaveText('0');

        await page.keyboard.press(String(answer)[1]);
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('backspace edits a partial answer', async ({ page }) => {
        const answer = await openWithTwoDigitAnswer(page);
        await ensureOskVisible(page);

        const firstDigit = String(answer)[0];
        await page.locator(`.osk-key[data-key="${firstDigit}"]`).dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#math-answer-display')).toHaveText(firstDigit);
        await page.locator('.osk-key[data-key="Backspace"]').dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#math-answer-display')).toHaveText('?');
    });

    test('speak button is present for read-aloud', async ({ page }) => {
        await expect(page.locator('#math-speak-btn')).toBeVisible();
    });
});
