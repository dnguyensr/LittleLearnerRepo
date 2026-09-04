import { playKeyTone } from '../audio.js';
import { celebrate, setScoreVisible, setScoreMode, randomBackground } from '../effects.js';
import { speak, speakPaced, cancelSpeech } from '../speech.js';
import { getSetting } from '../settings.js';
import { closestEl } from '../dom.js';
import { buildPattern, itemByEmoji, PATTERN_TYPES } from '../patterns/curriculum.js';
import {
    loadPatternsProgress, savePatternsProgress, recordPatternResult,
    currentPatternType, emptyPatternsProgress
} from '../patterns/progress.js';

/** @typedef {import('../types.js').Mode} Mode */

// Patterns: what comes next. The one pre-K mathematical skill the app did not
// touch — Math Lab is quantity and arithmetic, Numbers is counting, Words is
// sound-to-print, and none of them is about noticing a repeating unit.
//
// The rule that shapes everything here: a choice that does not fit is not an
// error. The tile comes back, the app reads the pattern aloud pointing at each
// item, and the choice stays open. Nothing is recorded and nothing is deducted,
// because a child who has not yet seen the structure has not done anything
// wrong — they have just not seen it yet.
//
// See docs/plans/14-patterns.md.

const container = document.getElementById('patterns-container');
const sequenceEl = document.getElementById('pattern-sequence');
const choicesEl = document.getElementById('pattern-choices');
const promptEl = document.getElementById('pattern-prompt');
const speakBtn = document.getElementById('pattern-speak-btn');
const nextBtn = /** @type {HTMLButtonElement} */ (document.getElementById('pattern-next-btn'));

let progress = emptyPatternsProgress();
let puzzle = null;
let solved = false;
let usedHelp = false;
// Bumped by anything that invalidates a read-aloud in progress. The silent
// fallback below walks the row on timers, and a walk that outlived its puzzle
// would keep lighting tiles in the next one.
let readToken = 0;

function randomBelow(max) {
    return Math.floor(Math.random() * max);
}

function activeType() {
    const pinned = getSetting('patternStage');
    if (pinned && pinned !== 'auto' && PATTERN_TYPES.some(type => type.id === pinned)) {
        return pinned;
    }
    return currentPatternType(progress);
}

/* ---------- Rendering ---------- */

function tile(item, { className = '', slot = false } = {}) {
    const node = document.createElement('div');
    node.className = `pattern-tile ${className}`.trim();
    node.textContent = slot ? '❓' : item.emoji;
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', slot ? 'What comes next?' : item.name);
    return node;
}

function render() {
    sequenceEl.textContent = '';
    puzzle.shown.forEach((item, index) => {
        const node = tile(item);
        node.setAttribute('aria-label', `${item.name}, ${index + 1}`);
        sequenceEl.appendChild(node);
    });

    const slot = tile(null, { className: 'is-slot', slot: true });
    slot.id = 'pattern-slot';
    sequenceEl.appendChild(slot);
    sequenceEl.setAttribute('aria-label',
        `A pattern of ${puzzle.shown.length} things, with one missing at the end`);

    choicesEl.textContent = '';
    for (const item of puzzle.choices) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pattern-choice';
        btn.dataset.emoji = item.emoji;
        btn.textContent = item.emoji;
        btn.setAttribute('aria-label', item.name);
        choicesEl.appendChild(btn);
    }

    promptEl.textContent = 'What comes next?';
    nextBtn.hidden = true;
}

function clearReading() {
    readToken++;
    for (const node of sequenceEl.querySelectorAll('.is-reading')) {
        node.classList.remove('is-reading');
    }
}

/** The row read aloud, one item at a time, with the tiles lighting in step. */
function readPattern({ interrupt = true } = {}) {
    if (!puzzle) return;
    clearReading();
    const token = readToken;
    const tiles = [...sequenceEl.querySelectorAll('.pattern-tile')];

    const names = puzzle.shown.map(item => item.name);
    const spoke = speakPaced([...names, 'What comes next?'], {
        interrupt,
        pauseMs: 220,
        onPhraseStart: index => {
            if (token !== readToken) return;
            tiles.forEach(node => node.classList.remove('is-reading'));
            if (tiles[index]) tiles[index].classList.add('is-reading');
        }
    });

    // With speech off the highlight still walks the row, so the pattern is
    // still shown rather than only said.
    if (!spoke) {
        tiles.forEach((node, index) => setTimeout(() => {
            if (token !== readToken) return;
            tiles.forEach(other => other.classList.remove('is-reading'));
            if (index < puzzle.shown.length) node.classList.add('is-reading');
        }, 260 * index));
        // Leave the row unlit at the end rather than stuck on the last tile.
        setTimeout(() => {
            if (token === readToken) clearReading();
        }, 260 * tiles.length);
    }
}

function nextPuzzle({ announce = true } = {}) {
    cancelSpeech();
    clearReading();
    solved = false;
    usedHelp = false;
    puzzle = buildPattern(activeType(), randomBelow);
    render();
    randomBackground();
    if (announce) readPattern();
}

/* ---------- Answering ---------- */

function fits(emoji) {
    return puzzle && emoji === puzzle.answer.emoji;
}

function acceptAnswer(btn) {
    solved = true;
    // The row is finished. A read-aloud still in flight would keep moving
    // highlights around under a child who has already answered, and its
    // remaining phrases would talk over the celebration.
    clearReading();
    cancelSpeech();
    const slot = document.getElementById('pattern-slot');
    slot.textContent = puzzle.answer.emoji;
    slot.classList.remove('is-slot');
    slot.classList.add('is-filled');
    slot.setAttribute('aria-label', puzzle.answer.name);
    btn.classList.add('is-chosen');
    for (const choice of choicesEl.querySelectorAll('.pattern-choice')) {
        /** @type {HTMLButtonElement} */ (choice).disabled = true;
    }

    const result = recordPatternResult(progress, puzzle.type.id, !usedHelp);
    savePatternsProgress(progress);

    celebrate();
    promptEl.textContent = 'It keeps going!';
    nextBtn.hidden = false;

    const names = puzzle.unitItems.map(item => item.name).join(', ');
    speak(result.becameMastered
        ? `${names}. It keeps going! Let's try a new kind of pattern.`
        : `${names}. It keeps going!`);
}

/**
 * A choice that does not fit. The tile returns, the pattern is read again, and
 * the activity is left exactly as it was — no score, no sound of failure, and
 * nothing written to progress except that help was used, which only stops this
 * puzzle counting towards moving on.
 */
function offerHelp(btn) {
    usedHelp = true;
    btn.classList.remove('is-wrong');
    // Restart the animation rather than let a second wrong tap be silent.
    btn.offsetHeight;
    btn.classList.add('is-wrong');
    promptEl.textContent = 'Look at the pattern again.';
    readPattern();
}

function handleChoice(btn) {
    if (solved) return;
    const emoji = btn.dataset.emoji;
    playKeyTone(emoji);
    if (fits(emoji)) {
        acceptAnswer(btn);
    } else {
        const item = itemByEmoji(emoji);
        if (item) btn.setAttribute('aria-label', `${item.name}, not yet`);
        offerHelp(btn);
    }
}

choicesEl.addEventListener('click', event => {
    const btn = closestEl(event.target, '.pattern-choice');
    if (btn) handleChoice(/** @type {HTMLButtonElement} */ (btn));
});

speakBtn.addEventListener('click', () => readPattern());
nextBtn.addEventListener('click', () => nextPuzzle());

window.addEventListener('lls-patterns-progress-reset', () => {
    progress = loadPatternsProgress();
    nextPuzzle({ announce: false });
});

/** @type {Mode} */
export const patternsMode = {
    id: 'patterns',
    label: 'Patterns',
    icon: '🔺',
    // No keyboard at all: everything here is a tap, which makes this the most
    // accessible entry point in the app for the youngest children.
    oskLayout: null,
    instructions: 'Look at the pattern — what comes next? 🔺',

    activate() {
        container.classList.add('active');
        setScoreMode('patterns');
        setScoreVisible(true);
        progress = loadPatternsProgress();
        nextPuzzle();
    },

    deactivate() {
        container.classList.remove('active');
        clearReading();
        cancelSpeech();
    },

    onKey() {
        // Deliberately inert. A physical keyboard cannot answer a pattern, and
        // swallowing the key is better than having a stray press change what is
        // on screen under a child's hands.
    }
};
