import { playKeyTone } from '../audio.js';
import { randomBackground, createBubble, randomStar, setScoreVisible } from '../effects.js';
import { speak, cancelSpeech } from '../speech.js';
import { getSetting } from '../settings.js';
import { closestEl } from '../dom.js';
import { tenFrame, dotCard } from '../math/manipulatives.js';
import {
    loadNumbersProgress, saveNumbersProgress, recordModeled,
    recordIndependentCount, recordConserved
} from '../numbers/progress.js';

/** @typedef {import('../types.js').Mode} Mode */

// Number Fun. P9 built the modeled count: stable slots, reveal before speech,
// and a guarded watchdog so a stalled voice can never freeze the activity. P11
// hands the counting itself to the child (docs/plans/11-interactive-counting.md).
//
// The organizing idea is "model once, then hand over". A child cannot tap to
// count before seeing what counting is, so the first encounter with a numeral
// still demonstrates; after that the same numeral goes straight to their turn.
//
// Every P9 guarantee below is load-bearing and must survive any change here:
// slots are reserved before counting starts, an object is visible before its
// number word is queued, one watchdog follows the active step, and a new
// numeral or a mode change cancels stale work.

const numbersContainer = document.getElementById('numbers-container');
const numberDisplay = document.getElementById('number-display');
const numberObjects = document.getElementById('number-objects');
const numberTotal = document.getElementById('number-total');
const controls = document.getElementById('number-controls');
const showBtn = document.getElementById('number-show-btn');
const countBtn = document.getElementById('number-count-btn');
const moveBtn = document.getElementById('number-move-btn');
const viewsRow = document.getElementById('number-views');

const objectChoices = [
    { emoji: '🍎', singular: 'apple', plural: 'apples' },
    { emoji: '⭐', singular: 'star', plural: 'stars' },
    { emoji: '🎈', singular: 'balloon', plural: 'balloons' },
    { emoji: '🐸', singular: 'frog', plural: 'frogs' },
    { emoji: '🌸', singular: 'flower', plural: 'flowers' },
    { emoji: '🍪', singular: 'cookie', plural: 'cookies' },
    { emoji: '🚗', singular: 'car', plural: 'cars' },
    { emoji: '🐤', singular: 'chick', plural: 'chicks' }
];

// Exported so tests/emoji-roles.spec.js can check nothing decorative counts as
// one of these.
export const objectEmojis = objectChoices.map(choice => choice.emoji);

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

// Pace used when there is no voice to follow.
const SILENT_PACE_MS = 650;
// Longest to wait for one speech event. A single watchdog follows the active
// step, so a stalled engine cannot freeze the count or race several reveals.
const PHRASE_STALL_MS = 2000;

// The Piagetian contrast: the same objects laid out normally, spread into one
// long row, and bunched tight. All three are plain layout changes, so nothing
// can drift outside the play area and no coordinates have to be computed.
const ARRANGEMENTS = ['grid', 'spread', 'bunch'];

let revealToken = 0;
let sequenceTimer = null;

/** @type {'idle'|'modeling'|'counting'|'complete'} */
let phase = 'idle';
let currentDigit = null;
let currentChoice = objectChoices[0];
let counted = 0;
let arrangement = 0;
/** @type {'objects'|'frame'|'dots'} */
let view = 'objects';
let movedThisSet = false;

// Which numerals have already been demonstrated in this sitting. Session-scoped
// on purpose: a child returning tomorrow gets the demonstration again, which is
// cheap, whereas a child mid-session does not have to sit through it twice.
const modeledThisSession = new Set();

let progress = loadNumbersProgress();

function capitalize(word) {
    return `${word[0].toUpperCase()}${word.slice(1)}`;
}

function clearSequenceTimer() {
    if (sequenceTimer !== null) {
        clearTimeout(sequenceTimer);
        sequenceTimer = null;
    }
}

function stopSequence() {
    revealToken++;
    clearSequenceTimer();
    cancelSpeech();
}

function chooseObjects() {
    return objectChoices[Math.floor(Math.random() * objectChoices.length)];
}

function countingMode() {
    return getSetting('numbersCounting') || 'auto';
}

/* ---------- Rendering the set ---------- */

function slots() {
    return /** @type {HTMLButtonElement[]} */ ([...numberObjects.querySelectorAll('.count-object')]);
}

function slotLabel(slot) {
    const index = Number(slot.dataset.index) + 1;
    const ordinal = slot.dataset.count;
    return ordinal
        ? `${capitalize(currentChoice.singular)} ${index}, counted ${NUMBER_WORDS[Number(ordinal)]}`
        : `${capitalize(currentChoice.singular)} ${index}, not counted yet`;
}

/**
 * Reserve every final slot before anything is revealed, so an object that
 * appears later never shifts one that is already on screen. This is P9's
 * central guarantee and the reason the grid is sized up front.
 */
function prepareSet(n, choice) {
    numberObjects.innerHTML = '';
    numberObjects.className = n === 0 ? 'is-zero' : '';
    numberObjects.classList.add(`view-${view}`, `arr-${ARRANGEMENTS[arrangement]}`);
    numberObjects.style.setProperty('--count-columns', String(Math.min(Math.max(n, 1), 5)));
    numberObjects.style.setProperty('--count-total', String(Math.max(n, 1)));
    numberObjects.style.setProperty('--bunch-columns', String(Math.min(Math.max(n, 1), 3)));
    numberObjects.setAttribute('aria-label', n === 0
        ? `An empty set for zero ${choice.plural}`
        : `Counting ${n} ${n === 1 ? choice.singular : choice.plural}`);
    numberTotal.textContent = '';

    if (view === 'frame' && n > 0) {
        // The ten frame's own cells are the structure; the counted objects sit
        // inside the first n of them.
        const frame = tenFrame(0, { name: 'numbers', interactive: false });
        frame.classList.add('numbers-frame');
        [...frame.children].forEach((cell, index) => {
            if (index < n) cell.appendChild(makeSlot(index, choice));
        });
        numberObjects.appendChild(frame);
        return;
    }

    if (view === 'dots' && n > 0) {
        const card = dotCard(0);
        card.classList.add('numbers-dots');
        for (let index = 0; index < n; index++) card.appendChild(makeSlot(index, choice));
        numberObjects.appendChild(card);
        return;
    }

    for (let index = 0; index < n; index++) {
        numberObjects.appendChild(makeSlot(index, choice));
    }
}

/**
 * One object. A real <button>, so js/input.js skips it when routing play-area
 * taps (no double-fire) and it carries its own role and name for a screen
 * reader. Reaching and activating it with a keyboard takes the focus routing in
 * js/input.js as well (docs/plans/15-keyboard-access.md).
 */
function makeSlot(index, choice) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'count-object';
    slot.dataset.index = String(index);
    slot.disabled = true;

    const face = document.createElement('span');
    face.className = 'count-face';
    face.textContent = view === 'dots' ? '' : choice.emoji;
    face.setAttribute('aria-hidden', 'true');

    // Filled in as the object is counted, so the one-to-one pairing stays
    // visible after the tap that made it.
    const badge = document.createElement('span');
    badge.className = 'count-badge';
    badge.setAttribute('aria-hidden', 'true');

    slot.append(face, badge);
    slot.setAttribute('aria-label', slotLabel(slot));
    return slot;
}

function setSlotsTappable(tappable) {
    for (const slot of slots()) {
        slot.disabled = !tappable;
        slot.setAttribute('aria-label', slotLabel(slot));
    }
    numberObjects.classList.toggle('is-tappable', tappable);
}

function clearCounts() {
    counted = 0;
    for (const slot of slots()) {
        delete slot.dataset.count;
        slot.classList.remove('is-counted', 'is-current', 'is-last');
        slot.querySelector('.count-badge').textContent = '';
        slot.setAttribute('aria-label', slotLabel(slot));
    }
    numberObjects.classList.remove('is-complete');
    numberTotal.textContent = '';
}

/* ---------- The modeled count (P9) ---------- */

function revealObject(index) {
    const all = slots();
    all.forEach(slot => slot.classList.remove('is-current'));
    const slot = all[index];
    if (!slot) return;
    // Visibility changes before the speech request below. The scale transition
    // reinforces the pairing but, unlike opacity, cannot delay seeing the item.
    slot.classList.add('is-revealed', 'is-current');
    markCounted(slot, index + 1);
}

function markCounted(slot, ordinal) {
    slot.dataset.count = String(ordinal);
    slot.classList.add('is-counted');
    slot.querySelector('.count-badge').textContent = String(ordinal);
    slot.setAttribute('aria-label', slotLabel(slot));
}

function quantityLabel(n, choice) {
    return `${n} ${n === 1 ? choice.singular : choice.plural}`;
}

function cardinalityPhrase(n, choice) {
    const word = NUMBER_WORDS[n];
    if (n === 0) return `Zero. There are no ${choice.plural}.`;
    if (n === 1) return `One. There is one ${choice.singular}.`;
    return `${capitalize(word)}. There are ${word} ${choice.plural}.`;
}

// After a rearrangement the point is not the quantity but that it did not
// change. Saying so is the whole conservation lesson.
function invariancePhrase(n, choice) {
    const word = NUMBER_WORDS[n];
    if (n === 1) return 'Still one. Moving it did not change how many.';
    return `Still ${word}. Moving them did not change how many.`;
}

function completeSet(n, choice, token, { byChild = false } = {}) {
    if (token !== revealToken) return;
    const all = slots();
    all.forEach(slot => slot.classList.remove('is-current'));
    if (all.length) all[all.length - 1].classList.add('is-last');
    numberObjects.classList.add('is-complete');

    const label = quantityLabel(n, choice);
    numberObjects.setAttribute('aria-label', label);
    numberTotal.textContent = label;
    createBubble();
    randomStar();

    phase = 'complete';
    if (byChild) {
        recordIndependentCount(progress, n);
        if (movedThisSet) recordConserved(progress, n);
        saveNumbersProgress(progress);
    }
    speak(movedThisSet ? invariancePhrase(n, choice) : cardinalityPhrase(n, choice));
    refreshControls();
}

/**
 * Continue after speech ends, or after one guarded fallback when speech is
 * unavailable or stalls. The callback and token guards make end/error/timer
 * races harmless.
 */
function afterSpeech(text, token, onComplete) {
    let settled = false;
    const finish = () => {
        if (settled) return;
        settled = true;
        clearSequenceTimer();
        if (token === revealToken) onComplete();
    };

    const spoke = speak(text, { onEnd: finish });
    if (settled || token !== revealToken) return;

    sequenceTimer = setTimeout(() => {
        sequenceTimer = null;
        if (token !== revealToken) return;
        // A voice that never reports completion may also be holding its queue.
        // Cancel only that stalled phase before moving to the next count word.
        if (spoke) cancelSpeech();
        finish();
    }, spoke ? PHRASE_STALL_MS : SILENT_PACE_MS);
}

function countSet(n, choice, token, index = 0) {
    if (token !== revealToken) return;
    if (index >= n) {
        completeSet(n, choice, token);
        return;
    }

    revealObject(index);
    afterSpeech(capitalize(NUMBER_WORDS[index + 1]), token,
        () => countSet(n, choice, token, index + 1));
}

/** Demonstrate the count. This is the shipped P9 sequence, unchanged. */
function modelCount({ restart = true } = {}) {
    if (currentDigit === null) return;
    if (restart) stopSequence();
    const token = revealToken;
    const n = currentDigit;
    const choice = currentChoice;

    phase = 'modeling';
    clearCounts();
    setSlotsTappable(false);
    for (const slot of slots()) slot.classList.remove('is-revealed');
    refreshControls();

    modeledThisSession.add(n);
    recordModeled(progress, n);
    saveNumbersProgress(progress);

    if (n === 0) {
        completeSet(n, choice, token);
        return;
    }

    afterSpeech(`${capitalize(NUMBER_WORDS[n])}. Let's count.`, token,
        () => countSet(n, choice, token));
}

/* ---------- The child's count ---------- */

function startChildCount({ announce = true, restart = true } = {}) {
    if (currentDigit === null) return;
    if (restart) stopSequence();
    const n = currentDigit;

    phase = 'counting';
    clearCounts();
    // Every object is on screen from the start: the child chooses what to touch
    // next, so nothing may be hidden from them.
    for (const slot of slots()) slot.classList.add('is-revealed');
    setSlotsTappable(true);
    refreshControls();

    if (n === 0) {
        completeSet(0, currentChoice, revealToken);
        return;
    }
    if (announce) {
        const target = n === 1 ? currentChoice.singular : `each ${currentChoice.singular}`;
        speak(movedThisSet ? 'Still how many? Touch them again.' : `Your turn. Touch ${target}.`);
    }
}

/**
 * Taps are accepted in any order — Gelman and Gallistel's order-irrelevance
 * principle. A second tap on an object that is already counted re-speaks its
 * number and changes nothing, so one-to-one correspondence is enforced by
 * construction and there is never a wrong answer to report.
 */
function handleObjectTap(slot) {
    if (phase !== 'counting' || currentDigit === null) return;

    if (slot.dataset.count) {
        speak(capitalize(NUMBER_WORDS[Number(slot.dataset.count)]), { interrupt: true });
        return;
    }

    counted++;
    for (const other of slots()) other.classList.remove('is-current');
    slot.classList.add('is-current');
    markCounted(slot, counted);
    playKeyTone(String(counted));
    speak(capitalize(NUMBER_WORDS[counted]), { interrupt: true });

    if (counted >= currentDigit) {
        // Let the count word land before the cardinality phrase follows it.
        const token = revealToken;
        clearSequenceTimer();
        sequenceTimer = setTimeout(() => {
            sequenceTimer = null;
            completeSet(currentDigit, currentChoice, token, { byChild: true });
        }, SILENT_PACE_MS);
    }
}

/* ---------- Conservation ---------- */

/**
 * Rearrange the same nodes. FLIP keeps the movement readable: measure, change
 * the layout class, measure again, apply the inverse offset, then release it.
 * The nodes are never removed and recreated, so the child sees these objects
 * move rather than a new set appear — which is the entire point.
 */
function rearrange() {
    if (currentDigit === null || currentDigit === 0) return;
    const all = slots();
    const before = all.map(slot => slot.getBoundingClientRect());

    numberObjects.classList.remove(`arr-${ARRANGEMENTS[arrangement]}`);
    arrangement = (arrangement + 1) % ARRANGEMENTS.length;
    numberObjects.classList.add(`arr-${ARRANGEMENTS[arrangement]}`);

    all.forEach((slot, index) => {
        const after = slot.getBoundingClientRect();
        const dx = before[index].left - after.left;
        const dy = before[index].top - after.top;
        if (!dx && !dy) return;
        slot.style.setProperty('--dx', `${dx}px`);
        slot.style.setProperty('--dy', `${dy}px`);
        slot.classList.add('is-shifting');
    });

    // Next frame, drop the inverse offset so the transition runs. Under reduced
    // motion the transition is ~0ms and the objects simply arrive — identity is
    // preserved either way, because these are the same elements.
    requestAnimationFrame(() => requestAnimationFrame(() => {
        for (const slot of all) {
            slot.style.removeProperty('--dx');
            slot.style.removeProperty('--dy');
            slot.classList.remove('is-shifting');
        }
    }));

    movedThisSet = true;
    startChildCount();
}

/* ---------- Representations ---------- */

function setView(next) {
    if (next === view || currentDigit === null) return;
    view = next;
    for (const btn of viewsRow.querySelectorAll('.number-view-btn')) {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-view') === view));
    }
    stopSequence();
    // A representation change re-renders the set, so the count starts over. The
    // arrangement resets with it: a ten frame's cells are fixed.
    arrangement = 0;
    prepareSet(currentDigit, currentChoice);
    startChildCount({ announce: false });
}

/* ---------- Controls ---------- */

function refreshControls() {
    const chosen = currentDigit !== null;
    controls.hidden = !chosen;
    viewsRow.hidden = !chosen || currentDigit === 0;

    // Toggled with a class that sets visibility, not the hidden property: a
    // button appearing or leaving would resize the control row and shift the
    // objects above it, breaking P9's promise that a slot never moves.
    countBtn.classList.toggle('is-blank', phase === 'counting');
    showBtn.classList.toggle('is-blank', phase === 'modeling');
    // Rearranging an empty set says nothing, and a ten frame's cells cannot
    // move. Both are hidden rather than disabled: a dead control a child can
    // press is worse than one that is not there.
    moveBtn.classList.toggle('is-blank',
        currentDigit === 0 || view !== 'objects' || phase !== 'complete');
}

/* ---------- Entry points ---------- */

function showNumber(digit) {
    const n = Number(digit);
    stopSequence();

    currentDigit = n;
    currentChoice = chooseObjects();
    arrangement = 0;
    movedThisSet = false;

    numberDisplay.textContent = digit;
    numberDisplay.style.animation = 'none';
    numberDisplay.offsetHeight;
    numberDisplay.style.animation = 'pop 0.3s ease-out';
    prepareSet(n, currentChoice);

    playKeyTone(digit);
    randomBackground();

    const mode = countingMode();
    const handOver = mode === 'tap' || (mode === 'auto' && modeledThisSession.has(n));
    // showNumber already stopped the previous sequence; a second stop here
    // would log a second cancel and break the speech-order contract.
    if (handOver && n > 0) {
        startChildCount({ restart: false });
    } else {
        modelCount({ restart: false });
    }
}

function reset() {
    stopSequence();
    phase = 'idle';
    currentDigit = null;
    counted = 0;
    arrangement = 0;
    view = 'objects';
    movedThisSet = false;
    numberDisplay.textContent = '123';
    numberObjects.innerHTML = '';
    numberObjects.className = '';
    numberObjects.style.removeProperty('--count-columns');
    numberObjects.style.removeProperty('--count-total');
    numberObjects.style.removeProperty('--bunch-columns');
    numberObjects.setAttribute('aria-label', 'Choose a number to see a set');
    numberTotal.textContent = '';
    for (const btn of viewsRow.querySelectorAll('.number-view-btn')) {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-view') === 'objects'));
    }
    refreshControls();
}

showBtn.addEventListener('click', () => modelCount());
countBtn.addEventListener('click', () => startChildCount());
moveBtn.addEventListener('click', rearrange);

viewsRow.addEventListener('click', event => {
    const btn = closestEl(event.target, '.number-view-btn');
    if (btn) setView(/** @type {any} */ (btn.getAttribute('data-view')));
});

numberObjects.addEventListener('click', event => {
    const slot = closestEl(event.target, '.count-object');
    if (slot) handleObjectTap(/** @type {HTMLElement} */ (slot));
});

window.addEventListener('lls-numbers-progress-reset', () => {
    progress = loadNumbersProgress();
    modeledThisSession.clear();
});

/** @type {Mode} */
export const numbersMode = {
    id: 'numbers',
    label: 'Numbers',
    icon: '🔟',
    oskLayout: 'numpad',
    instructions: 'Press a number, then touch each one to count! 🔟',

    activate() {
        numbersContainer.classList.add('active');
        setScoreVisible(false);
        progress = loadNumbersProgress();
        reset();
    },

    deactivate() {
        numbersContainer.classList.remove('active');
        stopSequence();
    },

    onKey(key) {
        if (/^[0-9]$/.test(key)) showNumber(key);
    }
};
