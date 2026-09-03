const { test, expect } = require('@playwright/test');
const { gotoApp, stubSpeech, spokenTexts, clearSpeechLog } = require('./helpers');

test.describe('Letter Land', () => {
    test.beforeEach(async ({ page }) => {
        await gotoApp(page);
        await page.locator('#letters-btn').click();
        await expect(page.locator('#letters-container')).toHaveClass(/active/);
    });

    test('pressing a letter shows it with its example word', async ({ page }) => {
        await page.keyboard.press('b');
        await expect(page.locator('#letter-display')).toHaveText('B b');
        await expect(page.locator('#letter-example')).toContainText('B is for Ball');
        await page.keyboard.press('z');
        await expect(page.locator('#letter-display')).toHaveText('Z z');
        await expect(page.locator('#letter-example')).toContainText('Z is for Zebra');
    });

    test('examples match the taught sound, including the special X ending', async ({ page }) => {
        await page.keyboard.press('i');
        await expect(page.locator('#letter-example')).toContainText('I is for Igloo');
        await page.keyboard.press('o');
        await expect(page.locator('#letter-example')).toContainText('O is for Octopus');
        await page.keyboard.press('x');
        await expect(page.locator('#letter-example')).toContainText('X is in Fox');
        await expect(page.locator('#letter-example .letter-highlight')).toHaveText('x');
    });

    test('replay controls fit the play area and meet touch target size', async ({ page }) => {
        await page.keyboard.press('w');
        const result = await page.locator('#letters-container').evaluate(container => {
            const play = document.getElementById('play-area').getBoundingClientRect();
            const controls = [...container.querySelectorAll('button:not([hidden])')];
            return {
                contained: controls.every(control => {
                    const rect = control.getBoundingClientRect();
                    return rect.top >= play.top - 1 && rect.bottom <= play.bottom + 1
                        && rect.left >= play.left - 1 && rect.right <= play.right + 1;
                }),
                targets: controls.map(control => {
                    const rect = control.getBoundingClientRect();
                    return { width: rect.width, height: rect.height };
                })
            };
        });
        expect(result.contained).toBe(true);
        for (const target of result.targets) {
            expect(target.width).toBeGreaterThanOrEqual(44);
            expect(target.height).toBeGreaterThanOrEqual(44);
        }
    });

    test('non-letters are ignored', async ({ page }) => {
        await page.keyboard.press('5');
        await expect(page.locator('#letter-display')).toHaveText('ABC');
    });
});

test.describe('Letter Land touch replay', () => {
    test.use({ hasTouch: true });

    test('a touchscreen tap replays the selected example word', async ({ page }) => {
        await stubSpeech(page);
        await gotoApp(page);
        await page.locator('#letters-btn').click();
        await page.keyboard.press('c');
        await clearSpeechLog(page);

        await page.locator('#letter-example').tap();
        expect(await spokenTexts(page)).toEqual(['cat']);
    });
});


test.describe('Parent settings', () => {
    test('the labelled gear opens on one tap and Escape returns focus', async ({ page }) => {
        await gotoApp(page);
        const gear = page.locator('#settings-btn');
        const panel = page.locator('#settings-panel');

        await gear.click();
        await expect(panel).toBeVisible();
        await expect(gear).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#settings-card')).toBeFocused();

        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();
        await expect(gear).toHaveAttribute('aria-expanded', 'false');
        await expect(gear).toBeFocused();
    });

});
