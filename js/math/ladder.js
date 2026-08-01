import { skills } from './problems.js';

/** @typedef {import('../types.js').LadderRung} LadderRung */
/** @typedef {import('../types.js').LabProgress} LabProgress */

// The progression: one shared spine every method walks, plus detours each
// curriculum inserts where it genuinely teaches something the others don't.
//
// Why this shape: a single ladder makes the three methods directly comparable
// and lets a child switch without losing their place, which is the whole point
// of Math Lab. But flattening everything to one sequence would erase what makes
// each curriculum itself — Singapore's numeral matching, Common Core's
// subitizing, classical's fact families. Detours give each its own rungs while
// the spine keeps everyone honest about where they actually are.

/** The shared skill sequence, pre-K through 1st grade. */
export const SPINE = [
    'count5',
    'count10',
    'addWithin5',
    'addWithin10',
    'subWithin5',
    'subWithin10',
    'makeTen',
    'addWithin20',
    'subWithin20',
    'missingAddend',
    'addTens',
    'addWithin100',
    'subWithin100',
    'addRegroup',
    'subRegroup'
];

/**
 * Extra rungs, keyed by the spine skill they follow. A detour is only ever
 * offered while the child is passing that point in the spine.
 */
const DETOURS = {
    classical: {
        count10: ['countBack'],
        addWithin10: ['factFamily'],
        makeTen: ['tenAndSome']
    },
    commoncore: {
        count5: ['subitize'],
        addWithin5: ['countOn'],
        addWithin10: ['doubles'],
        subWithin20: ['tensAndOnes']
    },
    singapore: {
        count10: ['numeralMatch'],
        addWithin10: ['bondTo10'],
        subWithin10: ['partWhole'],
        subWithin20: ['tensAndOnes']
    }
};

/** Coarse groupings for the parent dropdown — nobody wants a 24-item select. */
export const STAGES = [
    { id: 'counting', label: 'Counting' },
    { id: 'adding10', label: 'Adding to 10' },
    { id: 'subtracting10', label: 'Taking away to 10' },
    { id: 'teens', label: 'Teen numbers' },
    { id: 'twodigit', label: 'Two-digit math' }
];

export const STREAK_TO_ADVANCE = 4;

/** Where each of the old four levels lands on the spine. */
const LEGACY_LEVEL_TO_SPINE = {
    1: 0,   // counting
    2: 2,   // adding within 5
    3: 4,   // taking away within 5
    4: 10   // two-digit, starting with whole tens
};

/** Stage ids the old numeric `mathLabLevel` values map onto. */
export const LEGACY_STAGE = {
    1: 'counting',
    2: 'adding10',
    3: 'subtracting10',
    4: 'twodigit'
};

/**
 * One curriculum's full ladder: the spine with that method's detours spliced in
 * after the rung they belong to.
 *
 * @param {string} methodId
 * @returns {LadderRung[]}
 */
export function ladderFor(methodId) {
    const detours = DETOURS[methodId] || {};
    const rungs = [];

    SPINE.forEach((skill, spineIndex) => {
        rungs.push({ skill, kind: 'spine', spineIndex });
        for (const detour of detours[skill] || []) {
            rungs.push({ skill: detour, kind: 'detour', spineIndex });
        }
    });

    return rungs;
}

export function emptyProgress() {
    return { spine: 0, streak: 0, done: {} };
}

/**
 * Tolerate anything that might be sitting in localStorage — an older shape, a
 * hand-edit, a half-written value — rather than letting it break the mode.
 *
 * @returns {LabProgress}
 */
export function normalizeProgress(raw) {
    const progress = emptyProgress();
    if (!raw || typeof raw !== 'object') return progress;

    const spine = Number(raw.spine);
    if (Number.isFinite(spine)) {
        progress.spine = Math.min(SPINE.length - 1, Math.max(0, Math.floor(spine)));
    } else if (Number.isFinite(Number(raw.level))) {
        // Carried over from the old four-level ladder, so a child already using
        // Math Lab doesn't get sent back to counting to five.
        progress.spine = LEGACY_LEVEL_TO_SPINE[Math.min(4, Math.max(1, Math.floor(Number(raw.level))))] ?? 0;
    }
    const streak = Number(raw.streak);
    if (Number.isFinite(streak)) {
        progress.streak = Math.max(0, Math.floor(streak));
    }
    if (raw.done && typeof raw.done === 'object') {
        for (const [methodId, list] of Object.entries(raw.done)) {
            if (Array.isArray(list)) {
                progress.done[methodId] = list.filter(id => typeof id === 'string' && id in skills);
            }
        }
    }
    return progress;
}

// A rung is behind the child if the spine has moved past it.
//
// The `+ 1` matters. A detour attached after spine rung k becomes due the
// moment rung k is mastered — which is exactly when `progress.spine` becomes
// k + 1. Comparing against `progress.spine` alone marks the detour passed at
// the same instant it becomes available, so it could never be offered at all.
// Only once the spine has moved *beyond* that point is a detour skipped, which
// is what stops a child arriving at rung 12 on a method they have never used
// from being dragged back through its rung-1 detour.
function isPassed(rung, progress, methodId) {
    if (rung.kind === 'spine') return rung.spineIndex < progress.spine;
    if (rung.spineIndex + 1 < progress.spine) return true;
    return (progress.done[methodId] || []).includes(rung.skill);
}

/**
 * The rung the child is on right now for this method.
 *
 * @param {LabProgress} progress
 * @param {string} methodId
 * @returns {LadderRung}
 */
export function currentRung(progress, methodId) {
    const rungs = ladderFor(methodId);
    return rungs.find(rung => !isPassed(rung, progress, methodId)) || rungs[rungs.length - 1];
}

/**
 * Mark the current rung mastered and move on. Mutates and returns the progress
 * object; returns null for `rung` when the child is already at the top.
 *
 * @param {LabProgress} progress
 * @param {string} methodId
 */
export function advance(progress, methodId) {
    const rung = currentRung(progress, methodId);
    progress.streak = 0;

    if (rung.kind === 'detour') {
        const done = progress.done[methodId] || (progress.done[methodId] = []);
        if (!done.includes(rung.skill)) done.push(rung.skill);
    } else if (progress.spine < SPINE.length - 1) {
        progress.spine++;
    } else {
        // Top of the ladder: stay here rather than inventing a rung, and say
        // nothing, since there is no new challenge to announce.
        return { progress, rung: null };
    }

    return { progress, rung: currentRung(progress, methodId) };
}

/** All skills belonging to a stage, in ladder order, across every method. */
export function skillsInStage(stageId) {
    const inStage = Object.keys(skills).filter(id => skills[id].stage === stageId);
    return inStage.length ? inStage : ['count5'];
}

/**
 * What a pinned `mathLabLevel` setting means. The dropdown only offers stages,
 * but an exact skill id is accepted too — it keeps the specs deterministic
 * without fishing for a skill, and leaves room for per-skill practice later.
 */
export function skillsForSetting(setting) {
    return skills[setting] ? [setting] : skillsInStage(setting);
}

export function stageOf(skillId) {
    return skills[skillId]?.stage || 'counting';
}

export function labelOf(skillId) {
    return skills[skillId]?.label || '';
}
