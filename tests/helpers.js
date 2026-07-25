const { expect } = require('@playwright/test');

// Load the app and click once (audio unlock + settles focus).
async function gotoApp(page) {
    await page.goto('/');
    await expect(page.locator('#free-btn')).toBeVisible();
    await page.locator('#play-area').click();
}

// The OSK defaults to visible on coarse-pointer devices and hidden on
// desktop; toggle it on if needed.
async function ensureOskVisible(page) {
    const osk = page.locator('#osk');
    if (!(await osk.evaluate(el => el.classList.contains('visible')))) {
        await page.locator('#keyboard-btn').click();
    }
    await expect(osk).toHaveClass(/visible/);
}

module.exports = { gotoApp, ensureOskVisible };
