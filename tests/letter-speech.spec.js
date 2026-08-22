const { test, expect } = require('@playwright/test');
const { gotoApp, stubSpeech, spokenTexts, clearSpeechLog } = require('./helpers');

// What iOS Safari does with a bare "E" cannot be reproduced here. Playwright's
// WebKit is not Safari and has no speech engine, and the "capital E" reading
// comes from Apple's voice files, which don't exist off an Apple device. What
// *can* be pinned down is the text the app hands the engine, which is the whole
// of the fix: never give it a lone capital letter.
//
// stubSpeech makes that assertable on every project, webkit included.

test.describe('Letter names are spoken, not described', () => {
    test.beforeEach(async ({ page }) => stubSpeech(page));

    test('Words speaks a letter name, never a bare capital', async ({ page }) => {
        await gotoApp(page);
        await page.locator('#words-btn').click();
        await expect(page.locator('#word-container')).toHaveClass(/active/);

        const word = (await page.locator('.letter-box').allTextContents()).join('');
        await clearSpeechLog(page);

        // Stop one short of the last letter: completing the word queues the
        // celebration too, which is a word and not a letter.
        for (const letter of word.slice(0, -1)) {
            await page.keyboard.press(letter.toLowerCase());
        }

        const said = await spokenTexts(page);
        expect(said).toHaveLength(word.length - 1);
        // The reported bug: iOS read each of these as "capital E", "capital A",
        // "capital T" while a child spelled EAT.
        for (const text of said) {
            expect(text).not.toMatch(/^[A-Z]$/);
        }
        for (const [i, letter] of [...word.slice(0, -1)].entries()) {
            expect(said[i]).toBe(await spokenLetter(page, letter));
        }
    });

    test('Letters names the letter before its sound and example word', async ({ page }) => {
        await gotoApp(page);
        await page.locator('#letters-btn').click();
        await clearSpeechLog(page);

        await page.keyboard.press('e');
        const said = await spokenTexts(page);
        expect(said).toHaveLength(1);
        expect(said[0]).toBe('ee! eh! EGG!');
    });

    test('phonics mode still speaks the sound, not the name', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('lls-settings', JSON.stringify({ phonics: true }));
        });
        await gotoApp(page);
        await page.locator('#words-btn').click();

        const word = (await page.locator('.letter-box').allTextContents()).join('');
        await clearSpeechLog(page);
        await page.keyboard.press(word[0].toLowerCase());

        // A few phonics happen to be spelled like the letter name ('oh' for O),
        // so this asserts the phonic itself rather than "not the name".
        const phonic = await page.evaluate(async letter => {
            const path = '/js/data/letters.js';
            const { getLetterInfo } = await import(path);
            return getLetterInfo(letter).phonic;
        }, word[0]);
        expect((await spokenTexts(page))[0]).toBe(phonic);
    });

    test('spokenLetter is case-insensitive and passes non-letters through', async ({ page }) => {
        await gotoApp(page);
        // The whole point: the caller should not have to normalise case first.
        expect(await spokenLetter(page, 'e')).toBe('ee');
        expect(await spokenLetter(page, 'E')).toBe('ee');
        expect(await spokenLetter(page, 'a')).toBe(await spokenLetter(page, 'A'));

        expect(await spokenLetter(page, '7')).toBe('7');
        expect(await spokenLetter(page, '?')).toBe('?');
    });

    test('every letter has a name that is not just the letter', async ({ page }) => {
        await gotoApp(page);
        const bare = await page.evaluate(async () => {
            const path = '/js/data/letters.js';
            const { letterData } = await import(path);
            return letterData
                .filter(entry => /^[A-Za-z]$/.test(entry.spoken) || !entry.spoken)
                .map(entry => entry.letter);
        });
        expect(bare).toEqual([]);
    });
});

// The pure lookup, imported straight from the data module.
async function spokenLetter(page, letter) {
    return page.evaluate(async value => {
        const path = '/js/data/letters.js';
        const letters = await import(path);
        return letters.spokenLetter(value);
    }, letter);
}
