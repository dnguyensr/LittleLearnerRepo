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

    // Regression: the final letter used to be cancelled by the word
    // celebration, so FLY was spoken "F, L, ...FLY". The celebration must queue
    // behind the letter rather than interrupt it.
    test('the last letter is not cut off by the word celebration', async ({ page, browserName }) => {
        // See learning.spec.js: Playwright's WebKit has no speechSynthesis to hook.
        test.skip(browserName === 'webkit', 'speechSynthesis is absent in Playwright WebKit');
        const spoken = [];
        await page.exposeFunction('recordUtterance', text => spoken.push(text));
        await page.evaluate(() => {
            const record = /** @type {any} */ (window).recordUtterance;
            const original = window.speechSynthesis.speak.bind(window.speechSynthesis);
            window.speechSynthesis.speak = utterance => {
                record(utterance.text);
                original(utterance);
            };
            const cancel = window.speechSynthesis.cancel.bind(window.speechSynthesis);
            window.speechSynthesis.cancel = () => { record('[cancel]'); cancel(); };
        });

        const word = await getTargetWord(page);
        for (const ch of word) await page.keyboard.press(ch.toLowerCase());
        await expect(page.locator('#word-count')).toHaveText('1');

        const lastLetter = word[word.length - 1];
        const lastLetterAt = spoken.lastIndexOf(lastLetter);
        const celebrationAt = spoken.findIndex(t => t.startsWith(`${word}!`));

        expect(lastLetterAt, `"${lastLetter}" was never spoken: ${spoken.join(' | ')}`).toBeGreaterThanOrEqual(0);
        expect(celebrationAt).toBeGreaterThan(lastLetterAt);
        // Nothing cancels between the letter and the word that follows it
        expect(spoken.slice(lastLetterAt + 1, celebrationAt)).not.toContain('[cancel]');
    });

    test('correct letter marks the box completed', async ({ page }) => {
        const word = await getTargetWord(page);
        await page.keyboard.press(word[0].toLowerCase());
        await expect(page.locator('.letter-box').first()).toHaveClass(/completed/);
    });
});
