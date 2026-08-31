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

// Write grown-up settings straight into localStorage before the app boots, so
// a spec can pin a mode/level without driving the panel.
async function seedSettings(page, settings) {
    await page.addInitScript(value => {
        localStorage.setItem('lls-settings', JSON.stringify(value));
    }, settings);
}

// The clearly labelled ⚙️ control opens the grown-up panel with one tap.
async function openSettings(page) {
    await page.locator('#settings-btn').click();
    await expect(page.locator('#settings-panel')).toBeVisible();
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
async function stubSpeech(page, { autoComplete = true } = {}) {
    await page.addInitScript(({ autoComplete }) => {
        const win = /** @type {any} */ (window);
        win.__speechLog = [];
        win.__speechUtterances = [];

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
                    win.__speechLog.push({
                        type: 'speak',
                        text: utterance.text,
                        at: performance.now(),
                        revealed: document.querySelectorAll('#number-objects .is-revealed').length
                    });
                    win.__speechUtterances.push(utterance);
                    utterance.dispatchEvent(new Event('start'));
                    if (autoComplete) utterance.dispatchEvent(new Event('end'));
                },
                cancel() {
                    win.__speechLog.push({ type: 'cancel' });
                },
                getVoices: () => [],
                addEventListener() {}
            }
        });
    }, { autoComplete });
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
