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

/* ---------- Speech recorder ---------- */

/**
 * Replace the platform speech engine with a recorder, before the app's modules
 * evaluate — js/speech.js captures `window.speechSynthesis` at module scope, so
 * this must be installed ahead of navigation.
 *
 * Substituting the engine rather than wrapping it is what lets the speech specs
 * run on **every** project. Playwright's WebKit ships no speechSynthesis at all
 * (the object is absent, not empty), so a spec that hooks the real one has to
 * skip there — and skipping is what kept webkit out of these assertions. It
 * also takes the real engine out of the loop on the browsers that do have one:
 * it's a single shared service that stalls under parallel workers, which is the
 * flakiness `learning.spec.js` works around by turning speech off.
 *
 * None of this can test how a voice *sounds* — see docs/plans/07-speech-quality.md.
 * It tests what the app hands the engine and in what order, which is the part
 * that is ours.
 *
 * Speaks and cancels land in one ordered log so their interleaving can be
 * asserted: `[{ type: 'speak', text }, { type: 'cancel' }, …]`.
 */
async function stubSpeech(page) {
    await page.addInitScript(() => {
        const win = /** @type {any} */ (window);
        win.__speechLog = [];

        class FakeUtterance extends EventTarget {
            constructor(text) {
                super();
                this.text = text;
            }
        }

        // defineProperty, not assignment: in Chromium these are accessors with
        // no setter on the prototype, so `window.x = …` fails silently in
        // sloppy mode and the real engine stays in place.
        Object.defineProperty(window, 'SpeechSynthesisUtterance', {
            value: FakeUtterance, configurable: true, writable: true
        });
        Object.defineProperty(window, 'speechSynthesis', {
            configurable: true,
            value: {
                speak(utterance) {
                    win.__speechLog.push({ type: 'speak', text: utterance.text });
                    // Fired inline: callers pace visuals off these, and a stub
                    // that never fires them would strand the fallback timers.
                    utterance.dispatchEvent(new Event('start'));
                    utterance.dispatchEvent(new Event('end'));
                },
                cancel() {
                    win.__speechLog.push({ type: 'cancel' });
                },
                getVoices: () => [],
                addEventListener() {}
            }
        });
    });
}

/** The ordered log: `[{ type: 'speak', text }, { type: 'cancel' }, …]`. */
function speechLog(page) {
    return page.evaluate(() => /** @type {any} */ (window).__speechLog);
}

/** Just the spoken strings, in order. */
async function spokenTexts(page) {
    return (await speechLog(page)).filter(e => e.type === 'speak').map(e => e.text);
}

async function clearSpeechLog(page) {
    await page.evaluate(() => { /** @type {any} */ (window).__speechLog.length = 0; });
}

module.exports = {
    gotoApp, ensureOskVisible, seedSettings, openSettings,
    stubSpeech, speechLog, spokenTexts, clearSpeechLog
};
