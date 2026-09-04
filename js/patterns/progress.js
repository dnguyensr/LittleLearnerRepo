import { PATTERN_TYPES } from './curriculum.js';

/** @typedef {import('../types.js').PatternsProgress} PatternsProgress */

// Readiness uses the same 5-of-6 window Math Lab and Words use, deliberately:
// three modules agreeing on what "ready" means is worth more than each one
// tuning its own threshold, and a grown-up only has to learn the rule once.

export const PATTERNS_PROGRESS_KEY = 'lls-patterns-progress';
export const PATTERN_MASTERY_WINDOW = 6;
export const PATTERN_MASTERY_REQUIRED = 5;

const TYPE_IDS = PATTERN_TYPES.map(type => type.id);

/** @returns {PatternsProgress} */
export function emptyPatternsProgress() {
    return {
        version: /** @type {1} */ (1),
        currentType: TYPE_IDS[0],
        types: {}
    };
}

/** @returns {PatternsProgress} */
export function loadPatternsProgress() {
    try {
        const stored = JSON.parse(localStorage.getItem(PATTERNS_PROGRESS_KEY) || 'null');
        if (!stored || stored.version !== 1) return emptyPatternsProgress();
        return normalize(stored);
    } catch (err) {
        return emptyPatternsProgress();
    }
}

// Anything stored can be missing, stale or corrupt — a type id that no longer
// exists, a history that is not an array. Normalising on read means the rest of
// the module never has to ask.
function normalize(stored) {
    const progress = emptyPatternsProgress();
    if (TYPE_IDS.includes(stored.currentType)) progress.currentType = stored.currentType;
    const types = stored.types && typeof stored.types === 'object' ? stored.types : {};
    for (const id of TYPE_IDS) {
        const state = types[id];
        if (!state) continue;
        progress.types[id] = {
            recentIndependent: Array.isArray(state.recentIndependent)
                ? state.recentIndependent.slice(-PATTERN_MASTERY_WINDOW).map(Boolean)
                : [],
            mastered: !!state.mastered
        };
    }
    return progress;
}

/** @param {PatternsProgress} progress */
export function savePatternsProgress(progress) {
    try {
        localStorage.setItem(PATTERNS_PROGRESS_KEY, JSON.stringify(progress));
    } catch (err) { /* private mode etc. */ }
}

export function clearPatternsProgress() {
    try {
        localStorage.removeItem(PATTERNS_PROGRESS_KEY);
    } catch (err) { /* ignore */ }
}

function stateFor(progress, typeId) {
    if (!progress.types[typeId]) {
        progress.types[typeId] = { recentIndependent: [], mastered: false };
    }
    return progress.types[typeId];
}

export function patternMastered(progress, typeId) {
    return !!progress.types[typeId]?.mastered;
}

/** The first type not yet mastered, or the last one once everything is. */
export function currentPatternType(progress) {
    return TYPE_IDS.find(id => !patternMastered(progress, id)) || TYPE_IDS[TYPE_IDS.length - 1];
}

/**
 * Record one completed pattern. `independent` is false when the child needed a
 * re-read first — help still finishes the puzzle and still celebrates, it just
 * cannot count towards moving on.
 *
 * @param {PatternsProgress} progress
 */
export function recordPatternResult(progress, typeId, independent) {
    const state = stateFor(progress, typeId);
    const wasMastered = state.mastered;
    state.recentIndependent.push(!!independent);
    state.recentIndependent = state.recentIndependent.slice(-PATTERN_MASTERY_WINDOW);
    if (!state.mastered
        && state.recentIndependent.length === PATTERN_MASTERY_WINDOW
        && state.recentIndependent.filter(Boolean).length >= PATTERN_MASTERY_REQUIRED) {
        state.mastered = true;
    }

    const becameMastered = !wasMastered && state.mastered;
    if (becameMastered) progress.currentType = currentPatternType(progress);
    return { becameMastered, nextType: progress.currentType };
}

/** One line for the grown-up panel. */
export function describePatternsProgress(progress) {
    const mastered = PATTERN_TYPES.filter(type => patternMastered(progress, type.id));
    if (!mastered.length) {
        const current = PATTERN_TYPES.find(type => type.id === progress.currentType);
        return current ? `working on “${current.label}”` : 'nothing yet';
    }
    if (mastered.length === PATTERN_TYPES.length) return 'all pattern types';
    const current = PATTERN_TYPES.find(type => type.id === progress.currentType);
    return `${mastered.length} of ${PATTERN_TYPES.length} · now “${current ? current.label : ''}”`;
}
