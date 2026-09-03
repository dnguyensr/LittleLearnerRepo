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
        await seedSettings(page, { mathMethod: 'classical', mathLabLevel: 'count10' });
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

        // Numbers reserves and reveals its slots without motion transitions.
        await page.locator('#numbers-btn').click();
        await page.keyboard.press('3');
        await expect(page.locator('.count-object')).toHaveCount(3);
        expect(await page.locator('.count-object').first().evaluate(element =>
            parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.001);
    });

    // The inverse — effects DO spawn with motion allowed — is already covered
    // by freeplay.spec.js ("tapping the play area spawns effects").
});

test.describe('Accessibility (axe)', () => {
    // Math Lab is scanned once per teaching method: each renders a completely
    // different set of controls.
    for (const method of ['classical', 'commoncore', 'singapore']) {
        test(`math lab (${method}) has no serious/critical violations`, async ({ page }) => {
            await seedSettings(page, { mathMethod: method });
            await gotoApp(page);
            await page.locator('#mathlab-btn').click();
            await expect(page.locator('#mathlab-container')).toHaveClass(/active/);
            const violations = await scan(page);
            expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
        });
    }

    for (const mode of ['free', 'piano', 'letters', 'numbers', 'mathlab', 'words']) {
        test(`${mode} mode has no serious/critical violations`, async ({ page }) => {
            await gotoApp(page);
            await page.locator(`#${mode}-btn`).click();
            if (mode === 'free') {
                await ensureOskVisible(page);
            }
            if (mode === 'letters') {
                await page.keyboard.press('a');
            }
            if (mode === 'numbers') {
                await page.keyboard.press('4');
            }
            const violations = await scan(page);
            expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
        });
    }

    // The scan above catches Numbers as the app counts it. These are the states
    // P11 added, where the objects are buttons the child operates: role="img"
    // would be a violation here, which is why #number-objects is a group.
    test('numbers stays clean while the child counts and after moving the set', async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'tap' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await page.keyboard.press('4');
        await expect(page.locator('.count-object')).toHaveCount(4);

        const objects = page.locator('.count-object');
        await objects.nth(0).click();
        const midCount = await scan(page);
        expect(midCount, JSON.stringify(midCount, null, 2)).toEqual([]);

        for (const index of [1, 2, 3]) await objects.nth(index).click();
        await expect(page.locator('#number-move-btn')).toBeVisible();
        await page.locator('#number-move-btn').click();
        const rearranged = await scan(page);
        expect(rearranged, JSON.stringify(rearranged, null, 2)).toEqual([]);
    });
});
