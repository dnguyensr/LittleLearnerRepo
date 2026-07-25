const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { gotoApp, ensureOskVisible } = require('./helpers');

// color-contrast is disabled for now: the white-on-pastel-gradient palette
// needs a design pass (tracked in docs/plans/05-testing-tooling.md).
async function scan(page) {
    const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast'])
        .analyze();
    return results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
}

test.describe('Accessibility (axe)', () => {
    for (const mode of ['free', 'piano', 'letters', 'numbers', 'math', 'words']) {
        test(`${mode} mode has no serious/critical violations`, async ({ page }) => {
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
