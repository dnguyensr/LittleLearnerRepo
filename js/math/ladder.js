import { skills } from './problems.js';

/** @typedef {import('../types.js').LabProgress} LabProgress */

export const MASTERY_WINDOW = 6;
export const MASTERY_REQUIRED = 5;

export const FOUNDATION = [
    'count5', 'subitize', 'count10', 'numeralMatch',
    'addWithin5', 'countOn', 'addWithin10'
];

export const PATHS = {
    additionPractice: [
        'addWithin5', 'countOn', 'addWithin10', 'doubles', 'factFamily', 'bondTo10'
    ],
    subtraction: ['subWithin5', 'countBack', 'partWhole', 'subWithin10'],
    bigAddition: [
        'tensAndOnes', 'tenAndSome', 'makeTen', 'addWithin20', 'addTens', 'addWithin100'
    ]
};

export const PATH_LABELS = {
    additionPractice: 'Keep Adding',
    subtraction: 'Learn Take Away',
    bigAddition: 'Big Addition'
};

export const LESSON_FOR_PATH = {
    subtraction: 'subtractionIntro',
    bigAddition: 'placeValueAdditionIntro'
};

/** Kept for exact-skill settings, migration, and advanced parent stages. */
export const SPINE = [
    'count5', 'count10', 'addWithin5', 'addWithin10', 'subWithin5', 'subWithin10',
    'makeTen', 'addWithin20', 'subWithin20', 'missingAddend', 'addTens',
    'addWithin100', 'subWithin100', 'addRegroup', 'subRegroup'
];

export const STAGES = [
    { id: 'counting', label: 'Counting' },
    { id: 'adding10', label: 'Addition to 10' },
    { id: 'subtracting10', label: 'Subtraction to 10' },
    { id: 'teens', label: 'Teen numbers' },
    { id: 'twodigitadd', label: 'Two-digit addition' },
    { id: 'twodigitsub', label: 'Two-digit subtraction' },
    { id: 'twodigit', label: 'Two-digit math' }
];

export const LEGACY_STAGE = {
    1: 'counting', 2: 'adding10', 3: 'subtracting10', 4: 'twodigit'
};

const PROGRESS_KEY = 'edamame-mathlab-progress';
const PATH_IDS = Object.keys(PATHS);
const LESSON_IDS = Object.values(LESSON_FOR_PATH);

/** @returns {{status: 'unseen'|'inProgress'|'complete', scene: number}} */
function emptyLesson() {
    return { status: 'unseen', scene: 0 };
}

/** @returns {LabProgress} */
export function emptyProgress() {
    return {
        version: /** @type {2} */ (2),
        selectedPath: null,
        currentSkill: FOUNDATION[0],
        skills: {},
        lessons: Object.fromEntries(LESSON_IDS.map(id => [id, emptyLesson()]))
    };
}

function skillState(progress, skillId) {
    if (!progress.skills[skillId]) {
        progress.skills[skillId] = { recentIndependent: [], mastered: false };
    }
    return progress.skills[skillId];
}

export function isMastered(progress, skillId) {
    return !!progress.skills[skillId]?.mastered;
}

export function isForkUnlocked(progress) {
    return isMastered(progress, 'addWithin10');
}

function firstUnmastered(route, progress) {
    return route.find(skill => !isMastered(progress, skill)) || route[route.length - 1];
}

export function currentSkillForProgress(progress) {
    if (!isForkUnlocked(progress)) return firstUnmastered(FOUNDATION, progress);
    if (!progress.selectedPath) return null;
    if (progress.selectedPath === 'additionPractice') return progress.currentSkill || 'addWithin10';
    return firstUnmastered(PATHS[progress.selectedPath], progress);
}

export function isPathComplete(progress) {
    if (!progress.selectedPath || progress.selectedPath === 'additionPractice') return false;
    return PATHS[progress.selectedPath].every(skill => isMastered(progress, skill));
}

export function selectPath(progress, pathId) {
    if (!PATH_IDS.includes(pathId) || !isForkUnlocked(progress)) return progress;
    progress.selectedPath = pathId;
    progress.currentSkill = pathId === 'additionPractice'
        ? 'addWithin10' : firstUnmastered(PATHS[pathId], progress);
    return progress;
}

export function recordSkillResult(progress, skillId, independent) {
    const state = skillState(progress, skillId);
    const wasMastered = state.mastered;
    state.recentIndependent.push(!!independent);
    state.recentIndependent = state.recentIndependent.slice(-MASTERY_WINDOW);
    if (!state.mastered
        && state.recentIndependent.length === MASTERY_WINDOW
        && state.recentIndependent.filter(Boolean).length >= MASTERY_REQUIRED) {
        state.mastered = true;
    }

    const becameMastered = !wasMastered && state.mastered;
    const forkReady = skillId === 'addWithin10' && becameMastered;
    if (becameMastered && !forkReady && progress.selectedPath !== 'additionPractice') {
        progress.currentSkill = currentSkillForProgress(progress) || skillId;
    }
    const pathComplete = becameMastered && isPathComplete(progress);
    if (pathComplete) {
        progress.selectedPath = null;
        progress.currentSkill = 'addWithin10';
    }
    return {
        becameMastered,
        forkReady,
        pathComplete,
        nextSkill: currentSkillForProgress(progress)
    };
}

export function practicePool(progress) {
    const pool = PATHS.additionPractice.filter(skill => isMastered(progress, skill));
    for (const skill of ['doubles', 'factFamily', 'bondTo10']) {
        if (!pool.includes(skill)) pool.push(skill);
    }
    return pool.length ? pool : ['addWithin10'];
}

export function lessonState(progress, lessonId) {
    if (!progress.lessons[lessonId]) progress.lessons[lessonId] = emptyLesson();
    return progress.lessons[lessonId];
}

export function startLesson(progress, lessonId, { replay = false } = {}) {
    const lesson = lessonState(progress, lessonId);
    if (replay || lesson.status !== 'inProgress') lesson.scene = 0;
    lesson.status = 'inProgress';
    return lesson;
}

export function advanceLesson(progress, lessonId, sceneCount) {
    const lesson = lessonState(progress, lessonId);
    if (lesson.scene + 1 >= sceneCount) {
        lesson.status = 'complete';
        lesson.scene = 0;
        return true;
    }
    lesson.status = 'inProgress';
    lesson.scene++;
    return false;
}

export function saveProgress(progress) {
    try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (err) { /* private mode etc. */ }
}

export function clearProgress() {
    try {
        localStorage.removeItem(PROGRESS_KEY);
    } catch (err) { /* ignore */ }
}

export function loadProgress() {
    try {
        const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
        const progress = normalizeProgress(raw);
        if (raw?.version !== 2 && localStorage.getItem(PROGRESS_KEY) !== null) saveProgress(progress);
        return progress;
    } catch (err) {
        return emptyProgress();
    }
}

function inferPath(skillId) {
    if (PATHS.subtraction.includes(skillId)
        || ['subWithin20', 'missingAddend', 'subWithin100', 'subRegroup'].includes(skillId)) {
        return 'subtraction';
    }
    if (PATHS.bigAddition.includes(skillId) || skillId === 'addRegroup') return 'bigAddition';
    if (PATHS.additionPractice.includes(skillId)) return 'additionPractice';
    return null;
}

function migrateLegacy(raw) {
    const progress = emptyProgress();
    const rawSpine = Number(raw?.spine);
    const legacyLevel = Number(raw?.level);
    const legacyMap = { 1: 0, 2: 2, 3: 4, 4: 10 };
    const index = Number.isFinite(rawSpine)
        ? Math.min(SPINE.length - 1, Math.max(0, Math.floor(rawSpine)))
        : (legacyMap[Math.min(4, Math.max(1, Math.floor(legacyLevel)))] || 0);

    for (const skill of SPINE.slice(0, index)) {
        progress.skills[skill] = {
            recentIndependent: Array(MASTERY_WINDOW).fill(true), mastered: true
        };
    }
    for (const list of Object.values(raw?.done || {})) {
        if (!Array.isArray(list)) continue;
        for (const skill of list) {
            if (skill in skills) {
                progress.skills[skill] = {
                    recentIndependent: Array(MASTERY_WINDOW).fill(true), mastered: true
                };
            }
        }
    }
    progress.currentSkill = SPINE[index];
    progress.selectedPath = isForkUnlocked(progress) ? inferPath(progress.currentSkill) : null;
    return progress;
}

export function normalizeProgress(raw) {
    if (!raw || typeof raw !== 'object' || raw.version !== 2) return migrateLegacy(raw);
    const progress = emptyProgress();
    if (PATH_IDS.includes(raw.selectedPath)) progress.selectedPath = raw.selectedPath;

    if (raw.skills && typeof raw.skills === 'object') {
        for (const [skillId, value] of Object.entries(raw.skills)) {
            if (!(skillId in skills) || !value || typeof value !== 'object') continue;
            const recent = Array.isArray(value.recentIndependent)
                ? value.recentIndependent.filter(item => typeof item === 'boolean').slice(-MASTERY_WINDOW)
                : [];
            progress.skills[skillId] = {
                recentIndependent: recent, mastered: !!value.mastered
            };
        }
    }
    if (raw.lessons && typeof raw.lessons === 'object') {
        for (const id of LESSON_IDS) {
            const value = raw.lessons[id];
            if (!value || typeof value !== 'object') continue;
            const status = ['unseen', 'inProgress', 'complete'].includes(value.status)
                ? value.status : 'unseen';
            progress.lessons[id] = {
                status,
                scene: Math.max(0, Math.floor(Number(value.scene) || 0))
            };
        }
    }
    const requested = typeof raw.currentSkill === 'string' && raw.currentSkill in skills
        ? raw.currentSkill : null;
    progress.currentSkill = requested || currentSkillForProgress(progress) || FOUNDATION[0];
    if (!isForkUnlocked(progress)) progress.selectedPath = null;
    return progress;
}

export function describeProgress(progress) {
    if (isForkUnlocked(progress) && !progress.selectedPath) return 'Ready to choose a math path';
    const skillId = currentSkillForProgress(progress) || progress.currentSkill;
    const state = progress.skills[skillId];
    const ready = state?.recentIndependent?.filter(Boolean).length || 0;
    return `${labelOf(skillId)} (${Math.min(ready, MASTERY_REQUIRED)} of ${MASTERY_REQUIRED} ready)`;
}

export function skillsInStage(stageId) {
    if (stageId === 'twodigitadd') return ['addTens', 'addWithin100', 'addRegroup'];
    if (stageId === 'twodigitsub') return ['subWithin100', 'subRegroup'];
    const inStage = Object.keys(skills).filter(id => skills[id].stage === stageId);
    return inStage.length ? inStage : ['count5'];
}

export function skillsForSetting(setting) {
    return skills[setting] ? [setting] : skillsInStage(setting);
}

export function stageOf(skillId) {
    return skills[skillId]?.stage || 'counting';
}

export function labelOf(skillId) {
    return skills[skillId]?.label || '';
}
