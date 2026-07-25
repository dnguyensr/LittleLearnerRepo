const { test, expect } = require('@playwright/test');
const { gotoApp, ensureOskVisible } = require('./helpers');

// The answer isn't exposed in the DOM, so compute it the way a kid would:
// count the emojis in each group. Grapheme segmentation handles multi-
// codepoint emojis; the subtraction group's first grapheme is the eater.
async function computeAnswer(page) {
    return page.evaluate(() => {
        const seg = new Intl.Segmenter();
        const count = text => [...seg.segment(text.trim())].length;
        const groups = [...document.querySelectorAll('#math-emojis .emoji-group')].map(g => count(g.textContent));
        const op = document.querySelector('#math-emojis .math-operator').textContent;
        return op === '+' ? groups[0] + groups[1] : groups[0] - (groups[1] - 1);
    });
}

test.describe('Math mode', () => {
    test.beforeEach(async ({ page }) => {
        await gotoApp(page);
        await page.locator('#math-btn').click();
        await expect(page.locator('#math-container')).toHaveClass(/active/);
    });

    test('shows a problem and the numpad layout', async ({ page }) => {
        await expect(page.locator('#math-question')).not.toBeEmpty();
        await expect(page.locator('#math-answer-display')).toHaveText('?');
        await ensureOskVisible(page);
        await expect(page.locator('#osk')).toHaveClass(/numpad/);
        await expect(page.locator('.osk-key')).toHaveCount(11);
    });

    test('correct answer scores and advances to a new problem', async ({ page }) => {
        const answer = await computeAnswer(page);
        expect(answer).toBeGreaterThanOrEqual(1);
        for (const digit of String(answer)) {
            await page.keyboard.press(digit);
        }
        await expect(page.locator('#word-count')).toHaveText('1');
        await expect(page.locator('#math-answer-display')).toHaveText('?', { timeout: 5000 });
    });

    test('wrong answer resets the answer display', async ({ page }) => {
        // 0 is never a correct answer (minimum is 1)
        await page.keyboard.press('0');
        await expect(page.locator('#math-answer-display')).toHaveText('0');
        await expect(page.locator('#math-answer-display')).toHaveText('?', { timeout: 3000 });
        await expect(page.locator('#word-count')).toHaveText('0');
    });

    test('numpad tap and backspace edit the answer', async ({ page }) => {
        await ensureOskVisible(page);
        await page.locator('.osk-key[data-key="1"]').dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#math-answer-display')).toHaveText('1');
        await page.locator('.osk-key[data-key="Backspace"]').dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#math-answer-display')).toHaveText('?');
    });
});
