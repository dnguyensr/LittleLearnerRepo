/** @typedef {import('../types.js').NumbersProgress} NumbersProgress */

// An observation record for a grown-up, not a score for a child. Numbers stays
// score-free: nothing in here is ever rendered inside the play area.
//
// It deliberately does NOT write into Math Lab's LabProgress. That ladder is
// explicit that assistance "cannot silently push a child into a new concept";
// mastery earned in a different module against different evidence would break
// the contract. A grown-up who wants to act on this pins a Math stage by hand.

export const NUMBERS_PROGRESS_KEY = 'edamame-numbers-progress';

/** @returns {NumbersProgress} */
export function emptyNumbersProgress() {
    return { version: /** @type {1} */ (1), digits: {} };
}

function observationCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function normalizeDigits(value) {
    const digits = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return digits;

    for (const [key, entry] of Object.entries(value)) {
        if (!/^[0-9]$/.test(key) || !entry || typeof entry !== 'object' || Array.isArray(entry)) {
            continue;
        }
        digits[key] = {
            modeled: entry.modeled === true,
            counted: observationCount(entry.counted),
            conserved: observationCount(entry.conserved)
        };
    }
    return digits;
}

/** @returns {NumbersProgress} */
export function loadNumbersProgress() {
    try {
        const stored = JSON.parse(localStorage.getItem(NUMBERS_PROGRESS_KEY) || 'null');
        if (!stored || stored.version !== 1) {
            return emptyNumbersProgress();
        }
        return { version: 1, digits: normalizeDigits(stored.digits) };
    } catch (err) {
        return emptyNumbersProgress();
    }
}

/** @param {NumbersProgress} progress */
export function saveNumbersProgress(progress) {
    try {
        localStorage.setItem(NUMBERS_PROGRESS_KEY, JSON.stringify(progress));
    } catch (err) { /* private mode etc. */ }
}

export function clearNumbersProgress() {
    try {
        localStorage.removeItem(NUMBERS_PROGRESS_KEY);
    } catch (err) { /* ignore */ }
}

function entryFor(progress, digit) {
    const key = String(digit);
    const entry = progress.digits[key];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        progress.digits[key] = { modeled: false, counted: 0, conserved: 0 };
    }
    return progress.digits[key];
}

/** The app counted this set for the child. */
export function recordModeled(progress, digit) {
    entryFor(progress, digit).modeled = true;
    return progress;
}

/** The child counted every object in this set themselves. */
export function recordIndependentCount(progress, digit) {
    entryFor(progress, digit).counted++;
    return progress;
}

/** The child re-counted the same set after it was rearranged. */
export function recordConserved(progress, digit) {
    entryFor(progress, digit).conserved++;
    return progress;
}

function digitsWhere(progress, test) {
    return Object.keys(progress.digits)
        .filter(key => test(progress.digits[key]))
        .sort((a, b) => Number(a) - Number(b));
}

/**
 * One line for the grown-up panel. Reports what has been *seen*, never a level
 * or a percentage — there is no ladder here to be behind on.
 *
 * @param {NumbersProgress} progress
 */
export function describeNumbersProgress(progress) {
    const counted = digitsWhere(progress, entry => entry.counted > 0);
    const conserved = digitsWhere(progress, entry => entry.conserved > 0);
    const watched = digitsWhere(progress, entry => entry.modeled && !entry.counted);

    if (!counted.length && !watched.length) return 'nothing yet';

    const parts = [];
    if (counted.length) parts.push(`counted alone: ${counted.join(', ')}`);
    if (conserved.length) parts.push(`after moving: ${conserved.join(', ')}`);
    if (watched.length) parts.push(`watched only: ${watched.join(', ')}`);
    return parts.join(' · ');
}
