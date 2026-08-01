const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { gotoApp, ensureOskVisible, seedSettings } = require('./helpers');

// color-contrast is disabled for now: the white-on-pastel-gradient palette
// needs a design pass (tracked in docs/plans/05-testing-tooling.md).
async function scan(page) {
    const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast'])
        .analyze();
    return results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
}

test.describe('Reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('key presses and celebrations spawn no bubbles, stars or flying keys', async ({ page }) => {
        await seedSettings(page, { betaModes: true, mathMethod: 'classical', mathLabLevel: 'count10' });
        await gotoApp(page);

        // Free play: the flying key and its confetti are suppressed
        await page.keyboard.press('a');
        await expect(page.locator('#key-display')).toHaveText('A');
        expect(await page.locator('.flying-key, .bubble, .star').count()).toBe(0);

        // Math Lab: a correct answer still scores and advances, minus the storm
        await page.locator('#mathlab-btn').click();
        const answer = await page.locator('#mathlab-workspace .math-emoji').count();
        for (const ch of String(answer)) await page.keyboard.press(ch);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
        expect(await page.locator('.bubble, .star').count()).toBe(0);
    });

    // The inverse — effects DO spawn with motion allowed — is already covered
    // by freeplay.spec.js ("tapping the play area spawns effects").
});

test.describe('Accessibility (axe)', () => {
    // Math Lab is scanned once per teaching method: each renders a completely
    // different set of controls.
    for (const method of ['classical', 'commoncore', 'singapore']) {
        test(`math lab (${method}) has no serious/critical violations`, async ({ page }) => {
            await seedSettings(page, { betaModes: true, mathMethod: method });
            await gotoApp(page);
            await page.locator('#mathlab-btn').click();
            await expect(page.locator('#mathlab-container')).toHaveClass(/active/);
            const violations = await scan(page);
            expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
        });
    }

    for (const mode of ['free', 'piano', 'letters', 'numbers', 'math', 'mathlab', 'words']) {
        test(`${mode} mode has no serious/critical violations`, async ({ page }) => {
            if (mode === 'mathlab') await seedSettings(page, { betaModes: true });
            await gotoApp(page);
            await page.locator(`#${mode}-btn`).click();
            if (mode === 'free' || mode === 'words') {
                await ensureOskVisible(page);
            }
            const violations = await scan(page);
            expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
        });
    }
});
