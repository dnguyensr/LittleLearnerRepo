import { playKeyTone } from '../audio.js';
import { celebrate, setScoreVisible, setScoreMode } from '../effects.js';
import { closestEl } from '../dom.js';
import { speak, speakPaced, cancelSpeech } from '../speech.js';
import { getSetting, onSettingChange } from '../settings.js';
import { playWordPhoneme, stopWordAudio } from '../words/audio.js';
import {
    WORD_PATH_LABELS, WORD_PATHS, cueForGrapheme, phonemeCue,
    wordByID, wordSkill, wordsForSkill
} from '../words/curriculum.js';
import {
    currentWordSkill, emptyWordsProgress, loadWordsProgress, recordWordResult,
    saveWordsProgress, selectWordPath, wordForkUnlocked
} from '../words/progress.js';

/** @typedef {import('../types.js').Mode} Mode */
/** @typedef {import('../types.js').WordDefinition} WordDefinition */
/** @typedef {import('../types.js').WordsActivityState} WordsActivityState */
/** @typedef {import('../types.js').WordsProgress} WordsProgress */

const wordContainer = document.getElementById('word-container');
const wordActivityEl = document.getElementById('word-activity');
const wordPictureEl = /** @type {HTMLButtonElement} */ (document.getElementById('word-picture'));
const promptEl = document.getElementById('word-prompt');
const speakBtn = document.getElementById('word-speak-btn');
const soundsBtn = document.getElementById('word-sounds-btn');
const boxesEl = document.getElementById('word-sound-boxes');
const feedbackEl = document.getElementById('word-feedback');
const trayEl = document.getElementById('word-tile-tray');
const learnBtn = /** @type {HTMLButtonElement} */ (document.getElementById('word-learn-together'));
const revealEl = document.getElementById('word-reveal');
const nextActionsEl = document.getElementById('word-next-actions');
const againBtn = document.getElementById('word-again-btn');
const nextBtn = document.getElementById('word-next-btn');
const pathsBtn = /** @type {HTMLButtonElement} */ (document.getElementById('word-paths-btn'));
const pathChooserEl = document.getElementById('word-path-chooser');

const DISTRACTOR_TILES = ['M', 'S', 'F', 'N', 'R', 'L', 'P', 'T', 'C', 'B', 'D', 'G', 'H', 'V', 'Z', 'K'];
const SOUND_CONTRASTS = {
    M: ['N', 'B'], N: ['M', 'L'], S: ['F', 'Z'], F: ['S', 'V'], R: ['L', 'W'], L: ['R', 'N'],
    P: ['B', 'T'], B: ['P', 'D'], T: ['D', 'C'], D: ['T', 'G'], C: ['G', 'T'], K: ['G', 'T'],
    G: ['C', 'D'], H: ['F', 'W'], V: ['F', 'Z'], Z: ['S', 'V'],
    A: ['E', 'U'], E: ['I', 'A'], I: ['E', 'U'], O: ['U', 'A'], U: ['O', 'A'],
    SH: ['CH', 'S'], CH: ['SH', 'T'], TH: ['F', 'T']
};
const PATH_DETAILS = {
    practice: { emoji: '🧱', note: 'Build familiar short words.' },
    patterns: { emoji: '🔗', note: 'Change words and learn new patterns.' },
    wordStars: { emoji: '⭐', note: 'Remember special everyday words.' }
};
const WORD_SPEECH_PAUSE_MS = 450;

/** @type {WordsProgress} */
let progress = emptyWordsProgress();
/** @type {WordsActivityState|null} */
let activity = null;
/** @type {WordDefinition|null} */
let word = null;
let active = false;
let locked = false;
let keyBuffer = '';
let lastWordId = '';
let lastTransition = null;

function shuffled(list) {
    const copy = [...list];
    for (let index = copy.length - 1; index > 0; index--) {
        const swap = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
}

function pinnedSkill() {
    const setting = String(getSetting('wordStage') || 'auto');
    return setting === 'auto' ? null : wordSkill(setting)?.id || null;
}

function skillForActivity() {
    return pinnedSkill() || currentWordSkill(progress);
}

function targetValues(targetWord = word, mode = activity?.mode) {
    if (!targetWord) return [];
    if (mode === 'wordStar') return targetWord.spelling || [...targetWord.word];
    if (mode === 'firstSound') return [targetWord.phonemes[0].grapheme];
    if (mode === 'finalSound') return [targetWord.phonemes[targetWord.phonemes.length - 1].grapheme];
    if (mode === 'segment') return targetWord.phonemes.map(() => '●');
    return targetWord.phonemes.map(phoneme => phoneme.grapheme);
}

function targetSequences(targetWord = word, mode = activity?.mode) {
    if (!targetWord) return [];
    if (mode === 'wordStar') return targetWord.spelling || [...targetWord.word];
    if (mode === 'firstSound') return [targetWord.phonemes[0].sequence];
    if (mode === 'finalSound') return [targetWord.phonemes[targetWord.phonemes.length - 1].sequence];
    if (mode === 'segment') return ['●'];
    return targetWord.phonemes.map(phoneme => phoneme.sequence);
}

function firstEmptyIndex() {
    return activity ? activity.placements.findIndex(value => value === null) : -1;
}

function buildTray(targetWord, mode, placements) {
    if (mode === 'segment') return ['●'];
    const values = targetValues(targetWord, mode);
    const needed = mode === 'missing'
        ? values.filter((value, index) => placements[index] === null)
        : values;
    const tray = [...new Set(needed)];
    const contrasts = needed.flatMap(tile => SOUND_CONTRASTS[tile] || []);
    const distractors = [...new Set([...contrasts, ...DISTRACTOR_TILES])].filter(tile => !tray.includes(tile));
    while (tray.length < Math.min(needed.length + 2, 7) && distractors.length) {
        tray.push(distractors.splice(Math.floor(Math.random() * distractors.length), 1)[0]);
    }
    return shuffled(tray);
}

function chooseWord(skillId) {
    let pool = wordsForSkill(skillId);
    if (skillId === 'wordChains' && lastWordId) {
        const previous = wordByID(lastWordId);
        const chain = previous?.chain;
        const neighbors = chain ? pool.filter(candidate => candidate.chain === chain && candidate.id !== lastWordId) : [];
        if (neighbors.length) pool = neighbors;
    } else if (pool.length > 1) {
        pool = pool.filter(candidate => candidate.id !== lastWordId);
    }
    return pool[Math.floor(Math.random() * pool.length)] || wordsForSkill('shortVowelCvc')[0];
}

function makeActivity(skillId, requestedWordId = null) {
    const definition = requestedWordId && wordByID(requestedWordId)
        ? wordByID(requestedWordId) : chooseWord(skillId);
    const mode = wordSkill(skillId)?.activity || 'build';
    const length = targetValues(definition, mode).length;
    const placements = Array(length).fill(null);
    const fixed = [];
    let fromWordId = null;
    if (mode === 'missing' && length) {
        const missing = Math.floor(Math.random() * length);
        const values = targetValues(definition, mode);
        for (let index = 0; index < length; index++) {
            if (index !== missing) {
                placements[index] = values[index];
                fixed.push(index);
            }
        }
    }
    if (mode === 'chain' && length) {
        const chainPool = wordsForSkill(skillId).filter(candidate => (
            candidate.chain === definition.chain && candidate.id !== definition.id
        ));
        const previous = wordByID(lastWordId);
        const from = previous?.chain === definition.chain && previous.id !== definition.id
            ? previous : chainPool[Math.floor(Math.random() * chainPool.length)];
        if (from) {
            fromWordId = from.id;
            const fromValues = targetValues(from, mode);
            for (let index = 0; index < length; index++) {
                if (fromValues[index] === targetValues(definition, mode)[index]) {
                    placements[index] = fromValues[index];
                    fixed.push(index);
                }
            }
        }
    }
    return {
        skillId,
        wordId: definition.id,
        mode,
        placements,
        tray: buildTray(definition, mode, placements),
        fixed,
        guided: [],
        fromWordId,
        misses: 0,
        hadWrong: false,
        hintUsed: false,
        status: /** @type {'active'} */ ('active')
    };
}

function saveActivity() {
    progress.currentActivity = activity;
    if (activity) progress.currentSkill = activity.skillId;
    saveWordsProgress(progress);
}

function lessonForActivity() {
    if (!activity) return null;
    if (activity.mode === 'firstSound' || activity.mode === 'finalSound') return 'firstSoundsIntro';
    if (['build', 'missing', 'chain'].includes(activity.mode)) return 'wordBuildingIntro';
    return null;
}

function promptForActivity() {
    if (!activity || !word) return '';
    if (activity.status === 'complete') return `You built ${word.word}!`;
    if (activity.mode === 'firstSound') return 'Which letter starts the word?';
    if (activity.mode === 'finalSound') return 'Which letter ends the word?';
    if (activity.mode === 'segment') return 'Tap once for each sound you hear.';
    if (activity.mode === 'missing') return 'Which sound finishes the word?';
    if (activity.mode === 'chain') {
        const from = activity.fromWordId ? wordByID(activity.fromWordId) : null;
        return from ? `Change ${from.word} to ${word.word}.` : 'Change one sound to build the new word.';
    }
    if (activity.mode === 'wordStar') return 'Build this special Word Star.';
    return 'Build the word you hear.';
}

function speakWord({ model = false } = {}) {
    if (!word || !activity) return;
    if (activity.mode === 'wordStar') {
        const spelling = (word.spelling || [...word.word]).map(letter => letter.toLowerCase());
        speakPaced([
            word.label,
            'This is a special Word Star.',
            ...spelling,
            `Now build ${word.label}.`
        ], { interrupt: true, pauseMs: WORD_SPEECH_PAUSE_MS });
        return;
    }
    if (model && !word.irregular) {
        speakPaced([word.label, ...word.phonemes.map(item => item.cue), word.label], {
            interrupt: true, pauseMs: WORD_SPEECH_PAUSE_MS
        });
        return;
    }
    const addition = activity.mode === 'firstSound' ? 'Listen for the first sound.'
        : activity.mode === 'finalSound' ? 'Listen for the last sound.'
            : activity.mode === 'segment' ? 'Tap once for each sound.'
                : activity.mode === 'wordStar' ? 'This is a special Word Star.'
                    : 'Build the word you hear.';
    speak(`${word.label}. ${addition}`, { interrupt: true });
}

function replaySounds() {
    if (!word) return;
    speakPaced([...word.phonemes.map(item => item.cue), word.label], {
        interrupt: true, pauseMs: WORD_SPEECH_PAUSE_MS
    });
}

function replayPhoneme(index) {
    if (!word) return;
    const phoneme = word.phonemes[Math.min(index, word.phonemes.length - 1)];
    if (!phoneme) return;
    playWordPhoneme(phoneme, {
        enabled: !!getSetting('speech'),
        fallback: () => speak(phoneme.cue, { interrupt: true })
    });
}

function renderBoxes() {
    boxesEl.innerHTML = '';
    if (!activity || !word) return;
    const values = targetValues();
    const current = firstEmptyIndex();
    for (let index = 0; index < activity.placements.length; index++) {
        const box = document.createElement('button');
        box.type = 'button';
        box.className = 'word-sound-box';
        const placed = activity.placements[index];
        if (placed !== null) {
            box.textContent = placed;
            box.classList.add('placed');
            if (activity.guided.includes(index)) box.classList.add('guided');
            if (activity.status === 'complete' && word.unexpected?.includes(index)) box.classList.add('irregular');
        } else if (index === current) {
            box.classList.add('current');
        }
        const kind = activity.mode === 'wordStar' ? 'letter' : 'sound';
        const guided = activity.guided.includes(index) ? ', placed together' : '';
        const irregular = activity.status === 'complete' && word.unexpected?.includes(index)
            ? ', Word Star part to remember' : '';
        box.setAttribute('aria-label', placed === null
            ? `${kind} ${index + 1}, empty${index === current ? ', current' : ''}`
            : `${kind} ${index + 1}, ${placed}${guided}${irregular}`);
        box.dataset.index = String(index);
        box.dataset.wordSoundBox = String(index);
        // The authored value is deliberately not placed in data attributes on
        // an empty box: hidden DOM answers turn this back into a copying task.
        if (placed !== null && placed === values[index]) box.dataset.placed = 'true';
        boxesEl.appendChild(box);
    }
}

function usedCounts() {
    const counts = {};
    if (!activity) return counts;
    for (const value of activity.placements) {
        if (value !== null) counts[value] = (counts[value] || 0) + 1;
    }
    return counts;
}

function renderTray() {
    trayEl.innerHTML = '';
    if (!activity || activity.status === 'complete') return;
    const used = usedCounts();
    const availableCounts = Object.fromEntries(activity.tray.map(tile => [tile, (activity.tray.filter(item => item === tile).length)]));
    for (const tile of activity.tray) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'word-tile';
        button.dataset.wordTile = tile;
        button.textContent = tile;
        button.disabled = tile !== '●' && (used[tile] || 0) >= (availableCounts[tile] || 1);
        button.setAttribute('aria-label', tile === '●'
            ? 'Move one sound counter'
            : `${tile.length > 1 ? 'Letters' : 'Letter'} ${tile.replace('…', ' through ')}`);
        trayEl.appendChild(button);
    }
}

function renderActivity() {
    if (!activity) return;
    word = wordByID(activity.wordId);
    if (!word) return;
    locked = activity.status === 'complete';
    keyBuffer = '';
    wordPictureEl.textContent = word.emoji;
    wordPictureEl.setAttribute('aria-label', `Picture of ${word.label}. Hear the word again.`);
    promptEl.textContent = promptForActivity();
    feedbackEl.textContent = activity.status === 'complete'
        ? (activity.hintUsed || activity.hadWrong ? 'You kept trying and built it!' : 'You built it by yourself!')
        : '';
    renderBoxes();
    renderTray();
    learnBtn.hidden = activity.status === 'complete' || activity.misses < 2;
    revealEl.hidden = activity.status !== 'complete';
    revealEl.textContent = activity.status === 'complete' ? word.word : '';
    nextActionsEl.hidden = activity.status !== 'complete';
    pathsBtn.hidden = !wordForkUnlocked(progress);
    pathChooserEl.hidden = true;
    wordActivityEl.hidden = false;
}

function announceNewActivity() {
    const lessonId = lessonForActivity();
    const lesson = lessonId ? progress.lessons[lessonId] : null;
    const firstEncounter = lesson?.status === 'unseen';
    const model = firstEncounter && activity?.mode !== 'firstSound' && activity?.mode !== 'finalSound';
    if (lesson && lesson.status === 'unseen') {
        lesson.status = 'inProgress';
        lesson.scene = 1;
        saveWordsProgress(progress);
    }
    if (firstEncounter && (activity?.mode === 'firstSound' || activity?.mode === 'finalSound') && word) {
        const index = activity.mode === 'firstSound' ? 0 : word.phonemes.length - 1;
        const relationship = word.phonemes[index];
        const place = activity.mode === 'firstSound' ? 'starts' : 'ends';
        speakPaced([
            word.label,
            relationship.cue,
            `${relationship.grapheme.toLowerCase()} ${place} ${word.label}. Now you try.`
        ], { interrupt: true, pauseMs: WORD_SPEECH_PAUSE_MS });
    } else {
        speakWord({ model });
    }
}

function beginActivity({ wordId = null } = {}) {
    stopWordAudio();
    lastTransition = null;
    const skillId = skillForActivity();
    if (!skillId) {
        showPathChooser();
        return;
    }
    activity = makeActivity(skillId, wordId);
    word = wordByID(activity.wordId);
    if (word) lastWordId = word.id;
    saveActivity();
    renderActivity();
    announceNewActivity();
}

function setPlacement(index, value, guided = false) {
    if (!activity) return;
    activity.placements[index] = value;
    if (guided && !activity.guided.includes(index)) activity.guided.push(index);
    activity.misses = 0;
    keyBuffer = '';
    saveActivity();
    renderActivity();
}

function finishActivity() {
    if (!activity || !word || activity.status === 'complete') return;
    const independent = !activity.hadWrong && !activity.hintUsed;
    activity.status = 'complete';
    const completedActivity = activity;
    lastTransition = recordWordResult(progress, activity.skillId, independent);
    progress.currentActivity = completedActivity;
    const lessonId = lessonForActivity();
    if (lessonId) {
        progress.lessons[lessonId].status = 'complete';
        progress.lessons[lessonId].scene = 2;
    }
    saveWordsProgress(progress);
    celebrate();
    renderActivity();
    replaySounds();
}

function expectedTile() {
    if (!activity) return null;
    const index = firstEmptyIndex();
    return index < 0 ? null : targetValues()[index];
}

function expectedSequence() {
    if (!activity) return null;
    const index = firstEmptyIndex();
    return index < 0 ? null : targetSequences()[index];
}

function handleCorrect(tile, { guided = false } = {}) {
    if (!activity || !word) return;
    const index = firstEmptyIndex();
    if (index < 0) return;
    setPlacement(index, tile, guided);
    if (tile !== '●') playKeyTone(tile[0]);
    const cue = activity.mode === 'wordStar'
        ? tile.split('').join(', ')
        : word.phonemes[Math.min(index, word.phonemes.length - 1)]?.cue;
    if (cue) {
        if (activity.mode === 'wordStar') speak(cue, { interrupt: true });
        else replayPhoneme(index);
    }
    if (firstEmptyIndex() < 0) finishActivity();
}

function handleMismatch(tile) {
    if (!activity || !word) return;
    activity.misses++;
    activity.hadWrong = true;
    keyBuffer = '';
    const cue = cueForGrapheme(tile);
    feedbackEl.textContent = `That tile says “${cue}.” Listen to the word again.`;
    speakPaced([cue, word.label], { interrupt: true, pauseMs: WORD_SPEECH_PAUSE_MS });
    saveActivity();
    learnBtn.hidden = activity.misses < 2;
}

function chooseTile(tile) {
    if (locked || !activity || activity.status === 'complete') return;
    const expect = expectedTile();
    if (!expect) return;
    if (tile === expect) handleCorrect(tile);
    else handleMismatch(tile);
}

function learnTogether() {
    if (locked || !activity || !word) return;
    const index = firstEmptyIndex();
    const expect = expectedTile();
    if (index < 0 || !expect) return;
    activity.hintUsed = true;
    feedbackEl.textContent = expect === '●'
        ? 'Move one counter for this sound.'
        : `${expect} represents this sound. Now you try the next one.`;
    speak(expect === '●' ? 'Move one sound counter.' : `${phonemeCue(word.phonemes[Math.min(index, word.phonemes.length - 1)]?.id)}. ${expect}.`, { interrupt: true });
    handleCorrect(expect, { guided: true });
}

function backspace() {
    if (!activity || locked) return;
    for (let index = activity.placements.length - 1; index >= 0; index--) {
        if (activity.placements[index] !== null) {
            // In missing-letter activities, authored starting tiles are fixed;
            // only the originally empty (and therefore guided/child-filled)
            // slot may be returned.
            if (activity.fixed.includes(index)) continue;
            activity.placements[index] = null;
            activity.guided = activity.guided.filter(value => value !== index);
            activity.hadWrong = true;
            saveActivity();
            renderActivity();
            return;
        }
    }
}

function handlePhysicalLetter(letter) {
    const expected = expectedSequence();
    if (!expected) return;
    const normalized = letter.toUpperCase();
    if (expected.length === 1) {
        chooseTile(normalized);
        return;
    }
    keyBuffer += normalized;
    if (expected.startsWith(keyBuffer)) {
        feedbackEl.textContent = keyBuffer.length < expected.length ? 'Keep going…' : '';
        if (keyBuffer === expected) chooseTile(expectedTile());
        return;
    }
    handleMismatch(normalized);
}

function showPathChooser() {
    if (!wordForkUnlocked(progress) && !pinnedSkill()) return;
    cancelSpeech();
    activity = null;
    progress.currentActivity = null;
    saveWordsProgress(progress);
    wordActivityEl.hidden = true;
    pathChooserEl.hidden = false;
    pathsBtn.hidden = false;
    pathChooserEl.innerHTML = '';
    for (const pathId of Object.keys(WORD_PATHS)) {
        const detail = PATH_DETAILS[pathId];
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'word-path-card';
        card.dataset.wordPath = pathId;
        card.innerHTML = `<span class="path-picture" aria-hidden="true">${detail.emoji}</span>`
            + `<span>${WORD_PATH_LABELS[pathId]}</span><span class="path-note">${detail.note}</span>`;
        card.setAttribute('aria-label', `${WORD_PATH_LABELS[pathId]}. ${detail.note}`);
        pathChooserEl.appendChild(card);
    }
    speak('Choose a word path. Keep Building, New Patterns, or Word Stars.', { interrupt: true });
}

function choosePath(pathId) {
    selectWordPath(progress, pathId);
    saveWordsProgress(progress);
    const detail = PATH_DETAILS[pathId];
    speak(`${WORD_PATH_LABELS[pathId]}. ${detail.note}`, { interrupt: true });
    beginActivity();
}

function replayBox(index) {
    if (!activity || !word || index < 0 || index >= activity.placements.length) return;
    if (activity.mode === 'segment') {
        replayPhoneme(index);
        return;
    }
    if (activity.mode === 'wordStar') {
        const placed = activity.placements[index];
        speak(placed ? placed.split('').join(', ') : `Listen to ${word.label}.`, { interrupt: true });
        return;
    }
    replayPhoneme(index);
}

wordContainer.addEventListener('click', event => {
    const tile = closestEl(event.target, '[data-word-tile]');
    if (tile) {
        chooseTile(tile.dataset.wordTile);
        return;
    }
    const path = closestEl(event.target, '[data-word-path]');
    if (path) {
        choosePath(path.dataset.wordPath);
        return;
    }
    const box = closestEl(event.target, '[data-word-sound-box]');
    if (box) replayBox(Number(box.dataset.wordSoundBox));
});

wordPictureEl.addEventListener('click', () => speakWord());
speakBtn.addEventListener('click', () => speakWord());
soundsBtn.addEventListener('click', replaySounds);
learnBtn.addEventListener('click', learnTogether);
againBtn.addEventListener('click', () => beginActivity({ wordId: word?.id || null }));
nextBtn.addEventListener('click', () => {
    progress.currentActivity = null;
    saveWordsProgress(progress);
    if (lastTransition?.forkReady || lastTransition?.pathComplete || !skillForActivity()) showPathChooser();
    else beginActivity();
});
pathsBtn.addEventListener('click', showPathChooser);

onSettingChange(key => {
    if (key !== 'wordStage' || !active) return;
    progress.currentActivity = null;
    saveWordsProgress(progress);
    beginActivity();
});

window.addEventListener('edamame-words-progress-reset', () => {
    progress = loadWordsProgress();
    activity = null;
    if (active) beginActivity();
});

/** @type {Mode} */
export const wordsMode = {
    id: 'words',
    label: 'Words',
    icon: '📚',
    // Words owns a small, relevant tile tray. Physical keys still route to the
    // mode even when the shared on-screen keyboard is hidden.
    oskLayout: null,
    instructions: 'Listen, tap the sounds, and build a word! 🧱',

    activate() {
        active = true;
        wordContainer.classList.add('active');
        setScoreMode('words');
        setScoreVisible(true);
        progress = loadWordsProgress();
        const pin = pinnedSkill();
        if (progress.currentActivity && (!pin || progress.currentActivity.skillId === pin)) {
            activity = progress.currentActivity;
            renderActivity();
            if (activity.status !== 'complete') speakWord();
        } else {
            if (progress.currentActivity) {
                progress.currentActivity = null;
                saveWordsProgress(progress);
            }
            beginActivity();
        }
    },

    deactivate() {
        active = false;
        wordContainer.classList.remove('active');
        cancelSpeech();
        stopWordAudio();
        keyBuffer = '';
    },

    onKey(key) {
        if (key === 'Backspace') {
            backspace();
            return;
        }
        if (/^[a-z]$/i.test(key)) handlePhysicalLetter(key);
    }
};
