const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

async function getTargetWord(page) {
    return (await page.locator('.letter-box').allTextContents()).join('');
}

test.describe('Words mode', () => {
    test.beforeEach(async ({ page }) => {
        await gotoApp(page);
        await page.locator('#words-btn').click();
        await expect(page.locator('#word-container')).toHaveClass(/active/);
    });

    test('shows a word with the first letter highlighted', async ({ page }) => {
        const word = await getTargetWord(page);
        expect(word.length).toBeGreaterThanOrEqual(2);
        await expect(page.locator('.letter-box').first()).toHaveClass(/current/);
        await expect(page.locator('#word-emoji')).not.toBeEmpty();
    });

    test('wrong letter does not advance', async ({ page }) => {
        const word = await getTargetWord(page);
        const wrong = word[0] === 'Q' ? 'W' : 'Q';
        await page.keyboard.press(wrong.toLowerCase());
        await expect(page.locator('.letter-box').first()).toHaveClass(/current/);
        await expect(page.locator('#word-count')).toHaveText('0');
    });

    test('spelling the word scores and picks a new word', async ({ page }) => {
        const word = await getTargetWord(page);
        for (const ch of word) {
            await page.keyboard.press(ch.toLowerCase());
        }
        await expect(page.locator('#word-count')).toHaveText('1');
        await expect(page.locator('.letter-box.current')).toHaveCount(1, { timeout: 5000 });
    });

    test('correct letter marks the box completed', async ({ page }) => {
        const word = await getTargetWord(page);
        await page.keyboard.press(word[0].toLowerCase());
        await expect(page.locator('.letter-box').first()).toHaveClass(/completed/);
    });
});
