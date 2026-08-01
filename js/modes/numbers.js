import { playKeyTone } from '../audio.js';
import { randomBackground, createBubble, randomStar, setScoreVisible } from '../effects.js';
import { speak, speakEach, cancelSpeech } from '../speech.js';

/** @typedef {import('../types.js').Mode} Mode */

const numbersContainer = document.getElementById('numbers-container');
const numberDisplay = document.getElementById('number-display');
const numberObjects = document.getElementById('number-objects');

const objectEmojis = ['🍎', '⭐', '🎈', '🐸', '🌸', '🍪', '🚗', '🐤'];

// Pace used only when there is no voice to follow.
const SILENT_PACE_MS = 650;
// Longest a single spoken number should take before we stop waiting for it.
// Comfortably above a slow voice (~1.3s) but short enough that a stalled
// engine costs one beat rather than freezing the count.
const PHRASE_STALL_MS = 2000;

let revealToken = 0;

function addObject(emoji) {
    const span = document.createElement('span');
    span.className = 'count-object';
    span.textContent = emoji;
    numberObjects.appendChild(span);
}

// Reveal the objects still missing, on a timer. Used whenever there's no voice
// to pace against — speech off, unsupported, or silently not working.
function countOnTimer(n, emoji, token, alreadyShown) {
    for (let i = alreadyShown; i < n; i++) {
        setTimeout(() => {
            if (token !== revealToken) return;
            addObject(emoji);
        }, (i - alreadyShown + 1) * SILENT_PACE_MS);
    }
}

function showNumber(digit) {
    const n = Number(digit);
    const token = ++revealToken;
    const emoji = objectEmojis[Math.floor(Math.random() * objectEmojis.length)];

    numberDisplay.textContent = digit;
    numberDisplay.style.animation = 'none';
    numberDisplay.offsetHeight;
    numberDisplay.style.animation = 'pop 0.3s ease-out';
    numberObjects.innerHTML = '';

    playKeyTone(digit);
    randomBackground();
    createBubble();
    randomStar();

    if (n === 0) {
        speak('Zero! Nothing at all!', { interrupt: true });
        return;
    }

    // The announcement and the whole count are queued in one go, so nothing
    // interrupts anything and each object lands exactly as its number is
    // spoken. Phrase 0 is the announcement; phrase i>0 reveals object i.
    const phrases = [`${n}!`, ...Array.from({ length: n }, (_, i) => String(i + 1))];
    let shown = 0;

    // Guarded so the voice and the safety net below can never double-count:
    // whichever reaches an object first reveals it, and the total is capped.
    const revealNext = () => {
        if (token !== revealToken || shown >= n) return;
        shown++;
        addObject(emoji);
    };

    const spoke = speakEach(phrases, {
        interrupt: true,
        onPhraseStart: index => {
            if (index > 0) revealNext();
        }
    });

    if (!spoke) {
        countOnTimer(n, emoji, token, 0);
        return;
    }

    // Speech events are not guaranteed — a backgrounded tab or a busy engine
    // can simply stop delivering them. One net per object keeps the count
    // moving at worst a beat late, instead of freezing part-way.
    for (let i = 0; i < n; i++) {
        setTimeout(revealNext, (i + 1) * PHRASE_STALL_MS);
    }
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
    },

    deactivate() {
        numbersContainer.classList.remove('active');
        revealToken++;
        cancelSpeech();
    },

    onKey(key) {
        if (/^[0-9]$/.test(key)) {
            showNumber(key);
        }
    }
};
