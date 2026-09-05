const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings, ensureOskVisible } = require('./helpers');

// P15 — keyboard access. The rule under test, in one sentence: if focus is on a
// control, the keyboard drives the control; if focus is on the page, the
// keyboard drives the mode.
//
// Both halves matter. The first is the accessibility fix; the second is the
// kiosk behaviour a toddler depends on, and it must not have moved.
//
// See docs/plans/15-keyboard-access.md.

/** What has focus, as something readable in a failure message. */
function focused(page) {
    return page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return 'body';
        return el.id || el.className || el.tagName;
    });
}

/**
 * Start navigating by keyboard, the way a person does: press Tab.
 *
 * The app only routes Enter and Space to a focused control once it has seen a
 * Tab, and any tap hands the keyboard back to the mode. That is deliberate —
 * without it, tapping a mode button left focus on it and the next Enter
 * re-triggered the button instead of submitting a Math Lab answer. So a test
 * that reaches a control with `.focus()` alone is not describing a real user.
 */
async function enterKeyboardNav(page) {
    await page.keyboard.press('Tab');
}

/** Tab until `predicate` holds, up to a bound. Returns how many presses it took. */
async function tabUntil(page, predicate, limit = 40) {
    for (let i = 1; i <= limit; i++) {
        await page.keyboard.press('Tab');
        if (predicate(await focused(page))) return i;
    }
    return null;
}

test.describe('Keyboard can reach the app', () => {
    test('Tab moves focus, which it never used to', async ({ page }) => {
        await gotoApp(page);
        // From a known control rather than from body: clicking the play area
        // sets the sequential-navigation start point there, and with the
        // on-screen keyboard out of the tab order there is nothing after it, so
        // one Tab leaves the page entirely. That is correct browser behaviour
        // and not what this test is about.
        await page.locator('#free-btn').focus();
        await page.keyboard.press('Tab');
        expect(await focused(page)).not.toBe('free-btn');
        expect(await focused(page)).not.toBe('body');
    });

    test('Tab reaches the mode buttons and the grown-up settings', async ({ page }) => {
        await gotoApp(page);
        // Starting from the first mode button rather than from body, for the
        // reason given above: after a click in the play area there is nothing
        // tabbable left in the document, so Tab exits to the browser. Where the
        // walk starts is a browser behaviour; that it walks at all is ours.
        // P16 put the learning modes first, so the walk starts at Letters and
        // Free Play is now the last mode button rather than the first.
        await page.locator('#letters-btn').focus();

        expect(await tabUntil(page, id => id === 'free-btn')).not.toBeNull();
        expect(await tabUntil(page, id => id === 'settings-btn')).not.toBeNull();
    });

    test('Tab reaches the objects a child counts', async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'tap' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await page.keyboard.press('3');
        await expect(page.locator('.count-object')).toHaveCount(3);

        await page.evaluate(() => document.body.focus());
        expect(await tabUntil(page, id => id.includes('count-object'))).not.toBeNull();
    });

    test('the on-screen keyboard is skipped, not walked through', async ({ page }) => {
        await gotoApp(page);
        await ensureOskVisible(page);
        await expect(page.locator('.osk-key').first()).toBeVisible();

        // The board is a substitute for a keyboard. Someone who has one should
        // never have to tab across thirty of its keys.
        const tabbable = await page.locator('.osk-key').evaluateAll(nodes =>
            nodes.filter(node => node.tabIndex >= 0).length);
        expect(tabbable).toBe(0);
    });
});

test.describe('Keyboard can operate the app', () => {
    test('Enter counts the focused object in Numbers', async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'tap' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await page.keyboard.press('3');
        await expect(page.locator('.count-object')).toHaveCount(3);

        await enterKeyboardNav(page);
        await page.locator('.count-object').first().focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.count-object.is-counted')).toHaveCount(1);
    });

    test('Space counts the focused object too', async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'tap' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await page.keyboard.press('3');
        await expect(page.locator('.count-object')).toHaveCount(3);

        await enterKeyboardNav(page);
        await page.locator('.count-object').first().focus();
        // Space activates a button on key*up*, so this also proves keyup is
        // routed by focus and not swallowed on the way out.
        await page.keyboard.press(' ');
        await expect(page.locator('.count-object.is-counted')).toHaveCount(1);
    });

    test('a whole set can be counted without a pointer', async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'tap' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await page.keyboard.press('3');
        await expect(page.locator('.count-object')).toHaveCount(3);

        await enterKeyboardNav(page);
        const objects = page.locator('.count-object');
        for (let index = 0; index < 3; index++) {
            await objects.nth(index).focus();
            await page.keyboard.press('Enter');
        }
        await expect(page.locator('#number-total')).toHaveText(/^3 /);
    });

    test('a pattern can be answered without a pointer', async ({ page }) => {
        await seedSettings(page, { speech: false });
        await gotoApp(page);
        await page.locator('#patterns-btn').click();
        await expect(page.locator('.pattern-choice')).not.toHaveCount(0);

        const answer = await page.evaluate(() => {
            const shown = [...document.querySelectorAll('#pattern-sequence .pattern-tile')]
                .filter(tile => !tile.classList.contains('is-slot'))
                .map(tile => tile.textContent);
            for (let unit = 1; unit <= 3; unit++) {
                if (shown.every((item, index) => item === shown[index % unit])) {
                    return shown[shown.length % unit];
                }
            }
            return null;
        });

        await enterKeyboardNav(page);
        await page.locator(`.pattern-choice[data-emoji="${answer}"]`).first().focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#pattern-slot')).toHaveText(answer);
    });

    test('a letter can be made without a pointer', async ({ page }) => {
        await seedSettings(page, { speech: false });
        await gotoApp(page);
        await page.locator('#letters-btn').click();
        await page.keyboard.press('l');

        await enterKeyboardNav(page);
        await page.locator('#letter-make-btn').focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.trace-dot.is-active')).toHaveCount(1, { timeout: 15000 });

        for (let step = 0; step < 4; step++) {
            // Only the live dot is enabled, so it is also the only one focus can
            // land on — the tracing design and the focus rule agree by accident.
            await page.locator('.trace-dot.is-active').focus();
            await page.keyboard.press('Enter');
        }
        await expect(page.locator('#letter-trace')).toHaveClass(/is-complete/);
    });

    test('a word can be built without a pointer', async ({ page }) => {
        await seedSettings(page, { speech: false });
        await gotoApp(page);
        await page.locator('#words-btn').click();
        await expect(page.locator('#word-container')).toHaveClass(/active/);
        await expect(page.locator('.word-tile')).not.toHaveCount(0);

        const target = await page.evaluate(async () => {
            const progress = JSON.parse(localStorage.getItem('edamame-words-progress'));
            const path = '/js/words/curriculum.js';
            const curriculum = await import(path);
            const word = curriculum.wordByID(progress.currentActivity.wordId);
            return word.phonemes[0].grapheme;
        });

        await enterKeyboardNav(page);
        await page.locator('.word-tile')
            .filter({ hasText: new RegExp(`^${target}$`) }).first().focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.word-sound-box').first()).toContainText(target);
    });

    test('Escape gets a keyboard user back to answering in Math Lab', async ({ page }) => {
        await seedSettings(page, { mathMethod: 'classical', mathLabLevel: 'count10' });
        await gotoApp(page);
        await page.locator('#mathlab-btn').click();

        // Tabbing into the workspace means Enter now belongs to whatever has
        // focus, so a typed answer would not submit. Escape is the documented
        // way back, and this is the case that makes it matter.
        await enterKeyboardNav(page);
        await page.keyboard.press('Escape');

        const answer = await page.locator('#mathlab-workspace .math-emoji').count();
        for (const digit of String(answer)) await page.keyboard.press(digit);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('Escape hands the keyboard back to the mode', async ({ page }) => {
        await seedSettings(page, { speech: false, numbersCounting: 'tap' });
        await gotoApp(page);
        await page.locator('#numbers-btn').click();
        await page.keyboard.press('3');
        await enterKeyboardNav(page);
        await page.locator('.count-object').first().focus();
        expect(await focused(page)).toContain('count-object');

        await page.keyboard.press('Escape');
        expect(await focused(page)).toBe('body');
    });
});

test.describe('The kiosk still holds', () => {
    test('with focus on the page, Free Play still receives Space', async ({ page }) => {
        await gotoApp(page);
        await page.evaluate(() => document.body.focus());
        await page.keyboard.press(' ');
        await expect(page.locator('#key-display')).toHaveText('␣');
    });

    test('with focus on the page, Math Lab still submits on Enter', async ({ page }) => {
        await seedSettings(page, { mathMethod: 'classical', mathLabLevel: 'count10' });
        await gotoApp(page);
        await page.locator('#mathlab-btn').click();
        await page.evaluate(() => document.body.focus());

        const answer = await page.locator('#mathlab-workspace .math-emoji').count();
        for (const digit of String(answer)) await page.keyboard.press(digit);
        await page.keyboard.press('Enter');
        await expect(page.locator('#word-count')).toHaveText('1');
    });

    test('letters and digits are still swallowed, never reaching the page', async ({ page }) => {
        await gotoApp(page);
        await page.evaluate(() => {
            /** @type {any} */ (window).__leaked = [];
            document.addEventListener('keydown', event => /** @type {any} */ (window).__leaked.push(event.key));
        });
        for (const key of ['a', '5', 'Backspace', 'F5', 'ArrowRight']) {
            await page.keyboard.press(key);
        }
        expect(await page.evaluate(() => /** @type {any} */ (window).__leaked)).toEqual([]);
    });

    test('Enter and Space are swallowed too when nothing is focused', async ({ page }) => {
        await gotoApp(page);
        await page.evaluate(() => {
            /** @type {any} */ (window).__leaked = [];
            document.addEventListener('keydown', event => /** @type {any} */ (window).__leaked.push(event.key));
        });
        await page.evaluate(() => document.body.focus());
        await page.keyboard.press('Enter');
        await page.keyboard.press(' ');
        expect(await page.evaluate(() => /** @type {any} */ (window).__leaked)).toEqual([]);
    });

    test('the grown-up panel keeps its own keyboard behaviour', async ({ page }) => {
        await gotoApp(page);
        const gear = page.locator('#settings-btn');
        await gear.click();
        await expect(page.locator('#settings-panel')).toBeVisible();

        await page.keyboard.press('Tab');
        expect(await focused(page)).not.toBe('body');

        await page.keyboard.press('Escape');
        await expect(page.locator('#settings-panel')).toBeHidden();
        await expect(gear).toBeFocused();
    });
});

test.describe('Focus is always visible', () => {
    // A ring nobody can see is the same as no ring. Checked per mode because
    // each renders a different set of controls.
    for (const mode of ['free', 'piano', 'letters', 'numbers', 'patterns', 'mathlab', 'words']) {
        test(`every focusable control in ${mode} shows a ring`, async ({ page }) => {
            await seedSettings(page, { speech: false });
            await gotoApp(page);
            await page.locator(`#${mode}-btn`).click();
            if (mode === 'letters') await page.keyboard.press('a');
            if (mode === 'numbers') await page.keyboard.press('4');
            // :focus-visible only matches programmatic focus once the browser
            // believes the user is navigating by keyboard. One Tab establishes
            // that, which is exactly the state a keyboard user is in.
            await page.keyboard.press('Tab');

            const unringed = await page.evaluate(() => {
                const missing = [];
                const controls = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('button, select, input')])
                    .filter(node => {
                        const element = /** @type {HTMLElement} */ (node);
                        if (element.tabIndex < 0) return false;
                        if (/** @type {HTMLButtonElement} */ (element).disabled) return false;
                        if (element.closest('[hidden]') || element.hidden) return false;
                        // A visibility:hidden control cannot take focus at all,
                        // so it has no focus appearance to check. Numbers parks
                        // its inactive controls this way to keep the row height
                        // stable.
                        if (getComputedStyle(element).visibility === 'hidden') return false;
                        return !!element.offsetParent;
                    });
                for (const control of controls) {
                    control.focus();
                    // If focus did not land, the ring question is meaningless —
                    // and something else is wrong, so say so rather than pass.
                    if (document.activeElement !== control) {
                        missing.push(`${control.id || control.className} (unfocusable)`);
                        continue;
                    }
                    const style = getComputedStyle(control);
                    const hasRing = style.outlineStyle !== 'none'
                        && parseFloat(style.outlineWidth) > 0;
                    if (!hasRing) missing.push(control.id || control.className || control.tagName);
                }
                return [...new Set(missing)];
            });

            expect(unringed, unringed.join(', ')).toEqual([]);
        });
    }
});
