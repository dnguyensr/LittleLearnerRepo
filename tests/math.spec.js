const { test, expect } = require('@playwright/test');
const { gotoApp, ensureOskVisible } = require('./helpers');

// The answer isn't exposed in the DOM, so compute it the way a kid would:
// count the emojis in each group (grapheme segmentation handles multi-
// codepoint emojis). A fresh session starts at tier 1 (auto): a single
// group with no operator, where the answer is just the count.
async function computeAnswer(page) {
    return page.evaluate(() => {
        const seg = new Intl.Segmenter();
        const count = el => el.querySelectorAll('.math-emoji').length;
        const groups = [...document.querySelectorAll('#math-emojis .emoji-group:not(.missing)')].map(count);
        const op = document.querySelector('#math-emojis .math-operator');
        if (!op) return groups[0];
        if (op.textContent === '+') return groups[0] + groups[1];
        // subtraction group includes the eater emoji as a prefix, but
        // .math-emoji spans only wrap the food, so no off-by-one
        return groups[0] - groups[1];
    });
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

    test('correct answer + confirm scores and advances', async ({ page }) => {
        const answer = await computeAnswer(page);
        expect(answer).toBeGreaterThanOrEqual(1);
        for (const digit of String(answer)) {
            await page.keyboard.press(digit);
        }
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
        await expect(page.locator('#math-answer-display')).toHaveText('?', { timeout: 5000 });
    });

    test('wrong answer + confirm resets without scoring', async ({ page }) => {
        // 0 is never a correct answer (minimum is 1)
        await page.keyboard.press('0');
        await expect(page.locator('#math-answer-display')).toHaveText('0');
        await page.keyboard.press('Enter');
        await expect(page.locator('#math-answer-display')).toHaveText('?', { timeout: 3000 });
        await expect(page.locator('#word-count')).toHaveText('0');
    });

    test('digits are not judged until confirm', async ({ page }) => {
        await page.keyboard.press('9');
        await page.keyboard.press('9');
        // still shown, no wrong-flash reset without Enter
        await page.waitForTimeout(900);
        await expect(page.locator('#math-answer-display')).toHaveText('99');
        await expect(page.locator('#word-count')).toHaveText('0');
    });

    test('numpad tap and backspace edit the answer', async ({ page }) => {
        await ensureOskVisible(page);
        await page.locator('.osk-key[data-key="1"]').dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#math-answer-display')).toHaveText('1');
        await page.locator('.osk-key[data-key="Backspace"]').dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#math-answer-display')).toHaveText('?');
    });

    test('speak button is present for read-aloud', async ({ page }) => {
        await expect(page.locator('#math-speak-btn')).toBeVisible();
    });
});
