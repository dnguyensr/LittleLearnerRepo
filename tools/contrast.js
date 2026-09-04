#!/usr/bin/env node
// WCAG contrast checker for the app's background palette.
//
// The play-area background is reassigned at random on almost every keypress
// (js/effects.js), so "does this text pass" is not a question about one screen
// — it is a question about every gradient stop the palette can land on. axe can
// only see whichever gradient happens to be showing when it scans, which is why
// the palette gets checked here, deterministically, as well.
//
//   node tools/contrast.js          check the shipped palette
//   node tools/contrast.js #aabbcc  check one colour
//
// Exits non-zero if anything fails, so it can gate CI.

const fs = require('fs');
const path = require('path');

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

/** @param {string} hex @returns {number[]} */
function parseHex(hex) {
    const value = hex.replace('#', '').trim();
    const full = value.length === 3 ? [...value].map(c => c + c).join('') : value;
    return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
}

/**
 * sRGB → relative luminance, per WCAG 2.x.
 * @param {number[]} rgb
 */
function luminance([r, g, b]) {
    const channel = value => {
        const s = value / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Composite a translucent foreground over an opaque background.
 * @param {number[]} fg @param {number} alpha @param {number[]} bg
 */
function over(fg, alpha, bg) {
    return fg.map((c, i) => Math.round(alpha * c + (1 - alpha) * bg[i]));
}

function contrast(a, b) {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
}

/** Every colour stop in a `linear-gradient(...)` declaration. */
function stopsOf(gradient) {
    return (gradient.match(/#[0-9a-f]{3,6}/gi) || []);
}

// Text that is painted directly onto the gradient, with the alpha it is painted
// at. Anything on an opaque panel of its own is not listed: its contrast is a
// property of that panel, and axe checks those per mode.
const TEXT_ON_GRADIENT = [
    // #app-title starts at 1.1rem, below the 18.66px bold threshold for large
    // text, so it is held to the normal-text ratio.
    { name: '#app-title', alpha: 1, minimum: AA_NORMAL },
    { name: '#tagline', alpha: 1, minimum: AA_NORMAL },
    { name: '#instructions', alpha: 1, minimum: AA_NORMAL },
    { name: '#key-display / numerals / letters', alpha: 1, minimum: AA_LARGE },
    { name: '#number-total, prompts, labels', alpha: 1, minimum: AA_NORMAL }
];

// Panels and buttons drawn as a translucent wash over the gradient, with white
// text on top. The alpha a surface uses is a contrast decision, not a styling
// one: a *white* wash lightens the background while the text stays white, so it
// lowers contrast on every gradient — at alpha 0.12 the app's lightest stop was
// already at 3.97:1. These are all dark washes for that reason, which raise
// contrast instead. Listed as the alpha and the rules that use it.
const DARK_SURFACES = [
    { alpha: 0.18, name: '.tf-cell, .nl-tick' },
    { alpha: 0.20, name: '#letter-example, .emoji-group' },
    { alpha: 0.24, name: '#number-controls button, .number-view-btn' },
    { alpha: 0.26, name: '.top-btn, .ol-stop, .word-sound-box' },
    { alpha: 0.28, name: '.math-path-card, .word-tile, .bm-seg' },
    { alpha: 0.30, name: '.osk-key, .speak-btn, .eater-btn' },
    { alpha: 0.34, name: '.history-key' },
    { alpha: 0.42, name: '.top-btn:hover' }
];

// Opaque accents that carry white text. #4CAF50 gave 3.1:1 at best and was
// used translucently, which made it worse; these are the replacements.
const OPAQUE_ACCENTS = [
    { hex: '#2e7d32', name: 'confirm / active green' },
    { hex: '#b3261e', name: 'wrong-answer red' }
];

const BLACK = [0, 0, 0];

const WHITE = [255, 255, 255];

function readPalette() {
    const source = fs.readFileSync(
        path.join(__dirname, '..', 'js', 'effects.js'), 'utf8');
    const block = source.slice(source.indexOf('const colors = ['));
    return stopsOf(block.slice(0, block.indexOf(']')));
}

function report(stops) {
    let failures = 0;
    const width = Math.max(...TEXT_ON_GRADIENT.map(t => t.name.length));

    for (const stop of [...new Set(stops)]) {
        const bg = parseHex(stop);
        const lines = [];
        for (const text of TEXT_ON_GRADIENT) {
            const fg = text.alpha === 1 ? WHITE : over(WHITE, text.alpha, bg);
            const ratio = contrast(fg, bg);
            const ok = ratio >= text.minimum;
            if (!ok) failures++;
            lines.push(`    ${ok ? 'ok  ' : 'FAIL'}  ${text.name.padEnd(width)}  `
                + `${ratio.toFixed(2)}:1  (needs ${text.minimum.toFixed(1)})`);
        }
        console.log(`${stop}`);
        console.log(lines.join('\n'));
    }

    console.log(failures
        ? `\n${failures} failing text-on-gradient combination(s).`
        : '\nEvery gradient stop clears its threshold against white text.');

    // axe cannot judge any of this: it returns "incomplete" for text over a
    // gradient rather than a pass or a fail, so a translucent panel over the
    // gradient is invisible to the automated scan. This is the only check it
    // gets.
    console.log('\nWhite text on a translucent dark surface, worst stop:');
    const unique = [...new Set(stops)];
    const backgrounds = unique.map(parseHex);
    for (const surface of DARK_SURFACES) {
        let worst = Infinity;
        let worstStop = '';
        for (const [index, bg] of backgrounds.entries()) {
            const ratio = contrast(WHITE, over(BLACK, surface.alpha, bg));
            if (ratio < worst) {
                worst = ratio;
                worstStop = unique[index];
            }
        }
        const ok = worst >= AA_NORMAL;
        if (!ok) failures++;
        console.log(`    ${ok ? 'ok  ' : 'FAIL'}  alpha ${surface.alpha.toFixed(2)}  `
            + `${worst.toFixed(2)}:1 on ${worstStop}  — ${surface.name}`);
    }

    console.log('\nWhite text on an opaque accent:');
    for (const accent of OPAQUE_ACCENTS) {
        const ratio = contrast(WHITE, parseHex(accent.hex));
        const ok = ratio >= AA_NORMAL;
        if (!ok) failures++;
        console.log(`    ${ok ? 'ok  ' : 'FAIL'}  ${accent.hex}  `
            + `${ratio.toFixed(2)}:1  — ${accent.name}`);
    }

    return failures;
}

const argument = process.argv[2];
const stops = argument ? [argument] : readPalette();
process.exit(report(stops) ? 1 : 0);
