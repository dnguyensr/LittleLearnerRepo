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

    test('Letters introduces the name through one familiar example', async ({ page }) => {
        await gotoApp(page);
        await page.locator('#letters-btn').click();
        await clearSpeechLog(page);

        await page.keyboard.press('e');
        const said = await spokenTexts(page);
        expect(said).toHaveLength(1);
        expect(said[0]).toBe('ee. ee is for egg.');
    });

    test('Letters phonics setting emphasizes the sound relationship', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('lls-settings', JSON.stringify({ phonics: true }));
        });
        await gotoApp(page);
        await page.locator('#letters-btn').click();
        await clearSpeechLog(page);

        await page.keyboard.press('i');
        expect(await spokenTexts(page)).toEqual(['eye says ih, at the start of igloo.']);
    });

    test('letter, word, and sound can be replayed independently', async ({ page }) => {
        await gotoApp(page);
        await page.locator('#letters-btn').click();
        await page.keyboard.press('b');
        await clearSpeechLog(page);

        await page.locator('#letter-display').click();
        await page.locator('#letter-example').click();
        await page.locator('#letter-sound-btn').click();

        expect(await spokenTexts(page)).toEqual([
            'bee',
            'ball',
            'bee says buh, at the start of ball.'
        ]);
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
