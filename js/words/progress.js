import {
    FOUNDATION_WORD_SKILLS, PATTERN_WORD_SKILLS, WORD_PATHS, WORD_PATH_LABELS,
    WORD_SKILLS, wordByID
} from './curriculum.js';

/** @typedef {import('../types.js').WordsProgress} WordsProgress */

export const WORDS_PROGRESS_KEY = 'lls-words-progress';
export const WORD_MASTERY_WINDOW = 6;
export const WORD_MASTERY_REQUIRED = 5;

const SKILL_IDS = WORD_SKILLS.map(skill => skill.id);
const PATH_IDS = Object.keys(WORD_PATHS);

/** @returns {WordsProgress} */
export function emptyWordsProgress() {
    return {
        version: /** @type {1} */ (1),
        currentSkill: FOUNDATION_WORD_SKILLS[0],
        selectedPath: 'soundBuilding',
        currentActivity: null,
        skills: {},
        lessons: {
            firstSoundsIntro: { status: 'unseen', scene: 0 },
            wordBuildingIntro: { status: 'unseen', scene: 0 }
        }
    };
}

function stateFor(progress, skillId) {
    if (!progress.skills[skillId]) {
        progress.skills[skillId] = { recentIndependent: [], mastered: false };
    }
    return progress.skills[skillId];
}

export function wordSkillMastered(progress, skillId) {
    return !!progress.skills[skillId]?.mastered;
}

function firstUnmastered(skills, progress) {
    return skills.find(skill => !wordSkillMastered(progress, skill)) || skills[skills.length - 1];
}

export function wordForkUnlocked(progress) {
    return wordSkillMastered(progress, 'shortVowelCvc');
}

export function currentWordSkill(progress) {
    if (!wordForkUnlocked(progress)) return firstUnmastered(FOUNDATION_WORD_SKILLS, progress);
    if (!progress.selectedPath || progress.selectedPath === 'soundBuilding') return null;
    if (progress.selectedPath === 'practice') return progress.currentSkill || 'shortVowelCvc';
    return firstUnmastered(WORD_PATHS[progress.selectedPath], progress);
}

export function selectWordPath(progress, pathId) {
    if (!PATH_IDS.includes(pathId) || !wordForkUnlocked(progress)) return progress;
    progress.selectedPath = pathId;
    progress.currentSkill = pathId === 'practice'
        ? 'shortVowelCvc' : firstUnmastered(WORD_PATHS[pathId], progress);
    progress.currentActivity = null;
    return progress;
}

function pathComplete(progress) {
    if (!progress.selectedPath || !WORD_PATHS[progress.selectedPath]
        || progress.selectedPath === 'practice') return false;
    return WORD_PATHS[progress.selectedPath].every(skill => wordSkillMastered(progress, skill));
}

export function recordWordResult(progress, skillId, independent) {
    const state = stateFor(progress, skillId);
    const wasMastered = state.mastered;
    state.recentIndependent.push(!!independent);
    state.recentIndependent = state.recentIndependent.slice(-WORD_MASTERY_WINDOW);
    if (!state.mastered
        && state.recentIndependent.length === WORD_MASTERY_WINDOW
        && state.recentIndependent.filter(Boolean).length >= WORD_MASTERY_REQUIRED) {
        state.mastered = true;
    }

    const becameMastered = !wasMastered && state.mastered;
    const forkReady = skillId === 'shortVowelCvc' && becameMastered;
    if (becameMastered && !forkReady && progress.selectedPath !== 'practice') {
        progress.currentSkill = currentWordSkill(progress) || skillId;
    }
    const completedPath = becameMastered && pathComplete(progress);
    if (completedPath) {
        progress.selectedPath = 'soundBuilding';
        progress.currentSkill = 'shortVowelCvc';
    }
    progress.currentActivity = null;
    return { becameMastered, forkReady, pathComplete: completedPath, nextSkill: currentWordSkill(progress) };
}

export function normalizeWordsProgress(raw) {
    const progress = emptyWordsProgress();
    if (!raw || typeof raw !== 'object' || raw.version !== 1) return progress;

    if (PATH_IDS.includes(raw.selectedPath) || raw.selectedPath === 'soundBuilding') {
        progress.selectedPath = raw.selectedPath;
    }
    if (SKILL_IDS.includes(raw.currentSkill)) progress.currentSkill = raw.currentSkill;

    if (raw.skills && typeof raw.skills === 'object') {
        for (const [skillId, value] of Object.entries(raw.skills)) {
            if (!SKILL_IDS.includes(skillId) || !value || typeof value !== 'object') continue;
            const recent = Array.isArray(value.recentIndependent)
                ? value.recentIndependent.filter(item => typeof item === 'boolean').slice(-WORD_MASTERY_WINDOW)
                : [];
            progress.skills[skillId] = { recentIndependent: recent, mastered: !!value.mastered };
        }
    }

    if (raw.lessons && typeof raw.lessons === 'object') {
        for (const id of Object.keys(progress.lessons)) {
            const value = raw.lessons[id];
            if (!value || typeof value !== 'object') continue;
            progress.lessons[id] = {
                status: ['unseen', 'inProgress', 'complete'].includes(value.status) ? value.status : 'unseen',
                scene: Math.max(0, Math.floor(Number(value.scene) || 0))
            };
        }
    }

    const activity = raw.currentActivity;
    if (activity && typeof activity === 'object'
        && SKILL_IDS.includes(activity.skillId) && wordByID(activity.wordId)
        && ['active', 'complete'].includes(activity.status)) {
        progress.currentActivity = {
            skillId: activity.skillId,
            wordId: activity.wordId,
            mode: typeof activity.mode === 'string' ? activity.mode : 'build',
            placements: Array.isArray(activity.placements)
                ? activity.placements.map(value => typeof value === 'string' ? value : null).slice(0, 12)
                : [],
            tray: Array.isArray(activity.tray)
                ? activity.tray.filter(value => typeof value === 'string').slice(0, 16)
                : [],
            fixed: Array.isArray(activity.fixed)
                ? activity.fixed.map(Number).filter(Number.isInteger).filter(value => value >= 0).slice(0, 12)
                : [],
            guided: Array.isArray(activity.guided)
                ? activity.guided.map(Number).filter(Number.isInteger).filter(value => value >= 0).slice(0, 12)
                : [],
            fromWordId: typeof activity.fromWordId === 'string' && wordByID(activity.fromWordId)
                ? activity.fromWordId : null,
            misses: Math.max(0, Math.floor(Number(activity.misses) || 0)),
            hadWrong: !!activity.hadWrong,
            hintUsed: !!activity.hintUsed,
            status: activity.status
        };
    }

    if (!wordForkUnlocked(progress) && progress.selectedPath !== 'soundBuilding') {
        progress.selectedPath = 'soundBuilding';
    }
    return progress;
}

export function loadWordsProgress() {
    try {
        return normalizeWordsProgress(JSON.parse(localStorage.getItem(WORDS_PROGRESS_KEY) || '{}'));
    } catch (err) {
        return emptyWordsProgress();
    }
}

export function saveWordsProgress(progress) {
    try {
        localStorage.setItem(WORDS_PROGRESS_KEY, JSON.stringify(progress));
    } catch (err) { /* private mode etc. */ }
}

export function clearWordsProgress() {
    try {
        localStorage.removeItem(WORDS_PROGRESS_KEY);
    } catch (err) { /* ignore */ }
}

export function describeWordsProgress(progress) {
    if (wordForkUnlocked(progress) && (!progress.selectedPath || progress.selectedPath === 'soundBuilding')) {
        return 'Ready to choose a word path';
    }
    const skillId = currentWordSkill(progress) || progress.currentSkill;
    const label = WORD_SKILLS.find(skill => skill.id === skillId)?.label || 'Word building';
    const ready = progress.skills[skillId]?.recentIndependent?.filter(Boolean).length || 0;
    const path = progress.selectedPath && WORD_PATH_LABELS[progress.selectedPath]
        ? `${WORD_PATH_LABELS[progress.selectedPath]} — ` : '';
    return `${path}${label} (${Math.min(ready, WORD_MASTERY_REQUIRED)} of ${WORD_MASTERY_REQUIRED} ready)`;
}

export function patternPracticePool(progress) {
    const mastered = PATTERN_WORD_SKILLS.filter(skill => wordSkillMastered(progress, skill));
    return mastered.length ? mastered : ['shortVowelCvc'];
}
