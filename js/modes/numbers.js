import { playKeyTone } from '../audio.js';
import { randomBackground, createBubble, randomStar, setScoreVisible } from '../effects.js';
import { speak, cancelSpeech } from '../speech.js';

/** @typedef {import('../types.js').Mode} Mode */

const numbersContainer = document.getElementById('numbers-container');
const numberDisplay = document.getElementById('number-display');
const numberObjects = document.getElementById('number-objects');
const numberTotal = document.getElementById('number-total');

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

let revealToken = 0;
let sequenceTimer = null;

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

function prepareSet(n, choice) {
    numberObjects.innerHTML = '';
    numberObjects.className = n === 0 ? 'is-zero' : '';
    numberObjects.style.setProperty('--count-columns', String(Math.min(Math.max(n, 1), 5)));
    numberObjects.setAttribute('aria-label', n === 0
        ? `An empty set for zero ${choice.plural}`
        : `Counting ${n} ${n === 1 ? choice.singular : choice.plural}`);
    numberTotal.textContent = '';

    for (let index = 0; index < n; index++) {
        const slot = document.createElement('span');
        slot.className = 'count-object';
        slot.textContent = choice.emoji;
        slot.setAttribute('aria-hidden', 'true');
        numberObjects.appendChild(slot);
    }
}

function revealObject(index) {
    const slots = numberObjects.querySelectorAll('.count-object');
    slots.forEach(slot => slot.classList.remove('is-current'));
    const slot = slots[index];
    if (!slot) return;
    // Visibility changes before the speech request below. The scale transition
    // reinforces the pairing but, unlike opacity, cannot delay seeing the item.
    slot.classList.add('is-revealed', 'is-current');
}

function quantityLabel(n, choice) {
    return `${n} ${n === 1 ? choice.singular : choice.plural}`;
}

function cardinalityPhrase(n, choice) {
    const word = NUMBER_WORDS[n];
    if (n === 0) return `Zero. There are no ${choice.plural}.`;
    if (n === 1) return `One. There is one ${choice.singular}.`;
    return `${word[0].toUpperCase()}${word.slice(1)}. There are ${word} ${choice.plural}.`;
}

function completeSet(n, choice, token) {
    if (token !== revealToken) return;
    numberObjects.querySelectorAll('.count-object').forEach(slot => slot.classList.remove('is-current'));
    numberObjects.classList.add('is-complete');
    const label = quantityLabel(n, choice);
    numberObjects.setAttribute('aria-label', label);
    numberTotal.textContent = label;
    createBubble();
    randomStar();
    speak(cardinalityPhrase(n, choice));
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
    const word = NUMBER_WORDS[index + 1];
    afterSpeech(`${word[0].toUpperCase()}${word.slice(1)}`, token,
        () => countSet(n, choice, token, index + 1));
}

function showNumber(digit) {
    const n = Number(digit);
    stopSequence();
    const token = revealToken;
    const choice = chooseObjects();

    numberDisplay.textContent = digit;
    numberDisplay.style.animation = 'none';
    numberDisplay.offsetHeight;
    numberDisplay.style.animation = 'pop 0.3s ease-out';
    prepareSet(n, choice);

    playKeyTone(digit);
    randomBackground();

    if (n === 0) {
        completeSet(n, choice, token);
        return;
    }

    const word = NUMBER_WORDS[n];
    const announcement = `${word[0].toUpperCase()}${word.slice(1)}. Let's count.`;
    afterSpeech(announcement, token, () => countSet(n, choice, token));
}

/** @type {Mode} */
export const numbersMode = {
    id: 'numbers',
    label: 'Numbers',
    icon: '🔟',
    oskLayout: 'numpad',
    instructions: 'Press a number and count along! 🔟',

    activate() {
        numbersContainer.classList.add('active');
        setScoreVisible(false);
        numberDisplay.textContent = '123';
        numberObjects.innerHTML = '';
        numberObjects.className = '';
        numberObjects.style.removeProperty('--count-columns');
        numberObjects.setAttribute('aria-label', 'Choose a number to see a set');
        numberTotal.textContent = '';
    },

    deactivate() {
        numbersContainer.classList.remove('active');
        stopSequence();
    },

    onKey(key) {
        if (/^[0-9]$/.test(key)) showNumber(key);
    }
};
