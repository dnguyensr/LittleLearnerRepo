const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

// axe cannot answer this question. Text painted over a CSS gradient comes back
// as "incomplete" from the color-contrast rule, not as a pass or a fail — 14
// nodes on the default screen alone — and the gradient is re-rolled at random
// on almost every keypress, so even if axe could judge one it would only ever
// judge the one that happened to be showing.
//
// So the palette is checked here instead, deterministically, against every stop
// it can land on. tools/contrast.js runs the same arithmetic from the command
// line; this spec is what stops a new gradient landing without it.
//
// See docs/plans/12-readable-contrast.md.

const AA_NORMAL = 4.5;

/** @param {number[]} rgb */
function luminance([r, g, b]) {
    const channel = value => {
        const s = value / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastWithWhite(hex) {
    const value = hex.replace('#', '');
    const full = value.length === 3 ? [...value].map(c => c + c).join('') : value;
    const rgb = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
    return 1.05 / (luminance(rgb) + 0.05);
}

// Read the palette out of the running app, the way emoji-roles.spec.js reads
// the content modules, so this cannot drift from what ships.
async function palette(page) {
    return await page.evaluate(async () => {
        const path = '/js/effects.js';
        const effects = await import(path);
        return effects.colors;
    });
}

test.describe('Background palette contrast', () => {
    test('every gradient stop carries white text at 4.5:1 or better', async ({ page }) => {
        await gotoApp(page);
        const gradients = await palette(page);
        expect(gradients.length).toBeGreaterThan(0);

        const failures = [];
        for (const gradient of gradients) {
            for (const stop of gradient.match(/#[0-9a-f]{3,6}/gi) || []) {
                const ratio = contrastWithWhite(stop);
                if (ratio < AA_NORMAL) {
                    failures.push(`${stop} in "${gradient}" is ${ratio.toFixed(2)}:1`);
                }
            }
        }
        expect(failures, failures.join('\n')).toEqual([]);
    });

    test('the CSS default background matches the first palette entry', async ({ page }) => {
        await gotoApp(page);
        const gradients = await palette(page);
        // A mismatch would mean the very first paint uses a colour that is not
        // in the checked palette.
        const stops = (gradients[0].match(/#[0-9a-f]{3,6}/gi) || [])
            .map(hex => hex.replace('#', '').match(/../g).map(c => parseInt(c, 16)));

        const painted = await page.evaluate(() => {
            const body = document.createElement('div');
            document.body.appendChild(body);
            // Read the stylesheet default rather than the inline style a
            // keypress may already have set.
            const declared = [...document.styleSheets]
                .flatMap(sheet => /** @type {CSSStyleRule[]} */ ([...sheet.cssRules]))
                .filter(rule => rule.selectorText === 'body')
                .map(rule => rule.style.background || rule.style.backgroundImage)
                .filter(Boolean);
            body.remove();
            return declared.join(' ');
        });

        for (const [r, g, b] of stops) {
            expect(painted).toContain(`rgb(${r}, ${g}, ${b})`);
        }
    });
});

test.describe('Mode changes are announced', () => {
    test('the instructions line is a polite live region that tracks the mode', async ({ page }) => {
        await gotoApp(page);
        const instructions = page.locator('#instructions');
        await expect(instructions).toHaveAttribute('role', 'status');
        await expect(instructions).toHaveAttribute('aria-live', 'polite');

        const free = await instructions.textContent();
        await page.locator('#numbers-btn').click();
        await expect(instructions).not.toHaveText(free);
        const numbers = await instructions.textContent();

        await page.locator('#letters-btn').click();
        await expect(instructions).not.toHaveText(numbers);
        // The buttons still carry selection state; the live region carries the
        // change. They are different jobs and both are needed.
        await expect(page.locator('#letters-btn')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('#numbers-btn')).toHaveAttribute('aria-pressed', 'false');
    });
});
