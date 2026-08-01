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

// Write parent settings straight into localStorage before the app boots, so a
// spec can pin a mode/level without driving the hold-to-open panel.
async function seedSettings(page, settings) {
    await page.addInitScript(value => {
        localStorage.setItem('lls-settings', JSON.stringify(value));
    }, settings);
}

// The ⚙️ button is hold-to-open (600ms) so toddlers can't stumble into it.
async function openSettings(page) {
    const btn = page.locator('#settings-btn');
    await btn.dispatchEvent('pointerdown', { pointerId: 1 });
    await expect(page.locator('#settings-panel')).toBeVisible({ timeout: 3000 });
    await btn.dispatchEvent('pointerup', { pointerId: 1 });
}

module.exports = { gotoApp, ensureOskVisible, seedSettings, openSettings };
