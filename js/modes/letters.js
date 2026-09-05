import { getLetterInfo, spokenLetter } from '../data/letters.js';
import { pathFor } from '../data/letter-paths.js';
import { closestEl } from '../dom.js';
import { playKeyTone } from '../audio.js';
import { randomBackground, createBubble, randomStar, setScoreVisible } from '../effects.js';
import { speak, cancelSpeech } from '../speech.js';
import { getSetting } from '../settings.js';

/** @typedef {import('../types.js').Mode} Mode */

const lettersContainer = document.getElementById('letters-container');
const letterDisplay = /** @type {HTMLButtonElement} */ (document.getElementById('letter-display'));
const letterExample = /** @type {HTMLButtonElement} */ (document.getElementById('letter-example'));
const letterSoundBtn = /** @type {HTMLButtonElement} */ (document.getElementById('letter-sound-btn'));
const makeBtn = /** @type {HTMLButtonElement} */ (document.getElementById('letter-make-btn'));
const watchBtn = /** @type {HTMLButtonElement} */ (document.getElementById('letter-watch-btn'));
const traceWrap = document.getElementById('letter-trace');
const guidePath = document.getElementById('letter-guide');
const inkPath = document.getElementById('letter-ink');
const waypointsEl = document.getElementById('letter-waypoints');

let currentInfo = null;

// Which letters have already been modelled in this sitting. Session-scoped, the
// same as Numbers: a child returning tomorrow is shown the strokes again.
const modelledThisSession = new Set();

function displayWord(word) {
    return word[0] + word.slice(1).toLowerCase();
}

function namePhrase(info) {
    const name = spokenLetter(info.letter);
    const relation = info.position === 'end' ? 'is in' : 'is for';
    return `${name}. ${name} ${relation} ${info.word.toLowerCase()}.`;
}

function soundPhrase(info) {
    const word = info.word.toLowerCase();
    const position = info.position === 'end' ? 'end' : 'start';
    return `${spokenLetter(info.letter)} says ${info.phonic}, at the ${position} of ${word}.`;
}

function renderExample(info) {
    letterExample.textContent = '';
    letterExample.append(`${info.emoji} ${info.letter} ${info.position === 'end' ? 'is in ' : 'is for '}`);

    const word = displayWord(info.word);
    const highlightedIndex = info.position === 'end' ? word.length - 1 : 0;
    letterExample.append(word.slice(0, highlightedIndex));
    const highlighted = document.createElement('span');
    highlighted.className = 'letter-highlight';
    highlighted.textContent = word[highlightedIndex];
    letterExample.append(highlighted, word.slice(highlightedIndex + 1));
}

function animateLetter() {
    letterDisplay.style.animation = 'none';
    letterDisplay.offsetHeight;
    letterDisplay.style.animation = 'pop 0.3s ease-out';
}

function resetLetter() {
    currentInfo = null;
    letterDisplay.textContent = 'ABC';
    letterDisplay.setAttribute('aria-label', 'Choose a letter first');
    letterDisplay.disabled = true;
    letterExample.textContent = 'Press a letter!';
    letterExample.setAttribute('aria-label', 'Choose a letter first');
    letterExample.disabled = true;
    letterSoundBtn.hidden = true;
    stopTracing();
    makeBtn.hidden = true;
    watchBtn.hidden = true;
}

/* ---------- Making the letter (P13) ----------
 *
 * A guided stroke-order path, made tappable. The letter paths come from
 * js/data/letter-paths.js as waypoints in a 0-100 box; the child taps them in
 * order and the letter draws itself under their finger.
 *
 * Only the next waypoint is ever operable. That is what teaches stroke order —
 * by construction rather than by correction — and it means the touch target is
 * always one large dot instead of a dozen small ones competing for a toddler's
 * aim. There is nothing to get wrong here, so there is no wrong answer to
 * report and nothing is scored.
 */

// Flattened [strokeIndex, pointIndex] pairs, in tap order.
let sequence = [];
let placed = 0;
let watchTimer = null;
let watchToken = 0;
// True while the app is drawing the letter for the child. No dot is live during
// the demonstration: a tap that landed then would be undone by the hand-over
// that follows it, which is the worst kind of unresponsive.
let watching = false;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function clearWatch() {
    watchToken++;
    if (watchTimer !== null) {
        clearTimeout(watchTimer);
        watchTimer = null;
    }
}

function stopTracing() {
    clearWatch();
    watching = false;
    sequence = [];
    placed = 0;
    traceWrap.hidden = true;
    lettersContainer.classList.remove('is-tracing');
    waypointsEl.textContent = '';
    guidePath.setAttribute('d', '');
    inkPath.setAttribute('d', '');
}

/** One `M x y L …` subpath per stroke, so the pen lifts between strokes. */
function pathData(strokes, upTo = Infinity) {
    const parts = [];
    let drawn = 0;
    for (const stroke of strokes) {
        const points = [];
        for (const point of stroke) {
            if (drawn >= upTo) break;
            points.push(point);
            drawn++;
        }
        // A lone point is the start of a stroke with nothing drawn from it yet.
        if (points.length > 1) {
            parts.push(`M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')}`);
        }
        if (drawn >= upTo) break;
    }
    return parts.join(' ');
}

function waypointLabel(index) {
    const letter = currentInfo ? currentInfo.letter : '';
    return index === 0
        ? `Start ${letter} here`
        : `Next point, ${index + 1} of ${sequence.length}`;
}

function refreshWaypoints() {
    const dots = /** @type {HTMLButtonElement[]} */
        ([...waypointsEl.querySelectorAll('.trace-dot')]);
    dots.forEach((dot, index) => {
        const done = index < placed;
        const active = !watching && index === placed;
        dot.classList.toggle('is-done', done);
        dot.classList.toggle('is-active', active);
        dot.disabled = !active;
        // Only the live dot is announced. The rest are worksheet markings, and
        // a screen reader listing a dozen inert dots would bury the one that
        // matters.
        dot.setAttribute('aria-hidden', String(!active));
        if (active) dot.setAttribute('aria-label', waypointLabel(index));
    });
    inkPath.setAttribute('d', pathData(pathFor(currentInfo.letter) || [], placed));
}

function startTracing({ announce = true } = {}) {
    if (!currentInfo) return;
    const strokes = pathFor(currentInfo.letter);
    if (!strokes) return;

    clearWatch();
    watching = false;
    placed = 0;
    sequence = strokes.flatMap((stroke, strokeIndex) =>
        stroke.map((_, pointIndex) => [strokeIndex, pointIndex]));

    traceWrap.hidden = false;
    lettersContainer.classList.add('is-tracing');
    guidePath.setAttribute('d', pathData(strokes));
    inkPath.setAttribute('d', '');

    waypointsEl.textContent = '';
    let index = 0;
    for (const stroke of strokes) {
        for (const [x, y] of stroke) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'trace-dot';
            dot.dataset.index = String(index);
            dot.style.left = `${x}%`;
            dot.style.top = `${y}%`;
            dot.textContent = String(index + 1);
            waypointsEl.appendChild(dot);
            index++;
        }
    }

    refreshWaypoints();
    if (announce) speak(`Let's make ${spokenLetter(currentInfo.letter)}. Start at the one.`);
}

function completeTrace() {
    inkPath.setAttribute('d', pathData(pathFor(currentInfo.letter) || []));
    waypointsEl.querySelectorAll('.trace-dot').forEach(dot => {
        dot.classList.add('is-done');
        dot.classList.remove('is-active');
        /** @type {HTMLButtonElement} */ (dot).disabled = true;
        dot.setAttribute('aria-hidden', 'true');
    });
    traceWrap.classList.add('is-complete');
    createBubble();
    randomStar();
    speak(`You followed the path for ${spokenLetter(currentInfo.letter)}!`);
}

function handleDotTap(dot) {
    if (Number(dot.dataset.index) !== placed) return;
    placed++;
    traceWrap.classList.remove('is-complete');
    refreshWaypoints();
    playKeyTone(currentInfo ? currentInfo.letter : 'A');
    if (placed >= sequence.length) completeTrace();
}

/**
 * Draw the whole path for the child before asking them to do it — the same
 * "model once, then hand over" rule Numbers uses, for the same reason: a child
 * cannot trace a path they have not seen drawn.
 */
function watchTrace() {
    if (!currentInfo) return;
    const strokes = pathFor(currentInfo.letter);
    if (!strokes) return;

    startTracing({ announce: false });
    watching = true;
    refreshWaypoints();
    const token = watchToken;
    const total = sequence.length;
    speak(`Watch how ${spokenLetter(currentInfo.letter)} is made.`);

    if (reducedMotion.matches) {
        // No animation, but the information is not withheld: the finished path
        // is shown, then handed straight back.
        inkPath.setAttribute('d', pathData(strokes));
        watchTimer = setTimeout(() => {
            watchTimer = null;
            if (token === watchToken) startTracing();
        }, 900);
        return;

    }

    let step = 0;
    const advance = () => {
        if (token !== watchToken) return;
        step++;
        inkPath.setAttribute('d', pathData(strokes, step));
        if (step < total) {
            watchTimer = setTimeout(advance, 260);
            return;
        }
        watchTimer = setTimeout(() => {
            watchTimer = null;
            if (token === watchToken) startTracing();
        }, 700);
    };
    watchTimer = setTimeout(advance, 400);
}

function showLetter(letter) {
    const info = getLetterInfo(letter);
    if (!info) return;

    currentInfo = info;
    letterDisplay.disabled = false;
    letterDisplay.textContent = `${info.letter} ${info.letter.toLowerCase()}`;
    letterDisplay.setAttribute('aria-label', `Hear the letter ${info.letter}`);
    animateLetter();

    letterExample.disabled = false;
    renderExample(info);
    letterExample.setAttribute('aria-label', `Hear ${displayWord(info.word)}`);

    letterSoundBtn.hidden = false;
    letterSoundBtn.setAttribute('aria-label', `Hear how ${info.letter} sounds in ${displayWord(info.word)}`);

    // Meeting the letter stays the default. Making it is offered, never forced:
    // P8's exploratory encounter is what a toddler gets first, every time.
    stopTracing();
    traceWrap.classList.remove('is-complete');
    const traceable = !!pathFor(info.letter);
    makeBtn.hidden = !traceable;
    watchBtn.hidden = true;
    makeBtn.setAttribute('aria-label', `Follow the stroke path for ${info.letter}`);

    playKeyTone(letter);
    // Names remain in both variants: combined name-and-sound instruction has
    // better evidence than replacing names with sounds. The parent option
    // changes which relationship receives emphasis on the first encounter.
    speak(getSetting('phonics') ? soundPhrase(info) : namePhrase(info), { interrupt: true });
    randomBackground();
    createBubble();
    randomStar();
}

letterDisplay.addEventListener('click', () => {
    if (!currentInfo) return;
    animateLetter();
    speak(spokenLetter(currentInfo.letter), { interrupt: true });
});

letterExample.addEventListener('click', () => {
    if (!currentInfo) return;
    speak(currentInfo.word.toLowerCase(), { interrupt: true });
});

letterSoundBtn.addEventListener('click', () => {
    if (!currentInfo) return;
    speak(soundPhrase(currentInfo), { interrupt: true });
});

makeBtn.addEventListener('click', () => {
    if (!currentInfo) return;
    watchBtn.hidden = false;
    watchBtn.setAttribute('aria-label', `Watch how ${currentInfo.letter} is made`);
    // The first visit to a letter is modelled; after that, tapping Follow
    // goes straight to the child's turn.
    if (modelledThisSession.has(currentInfo.letter)) {
        startTracing();
    } else {
        modelledThisSession.add(currentInfo.letter);
        watchTrace();
    }
});

watchBtn.addEventListener('click', watchTrace);

waypointsEl.addEventListener('click', event => {
    const dot = closestEl(event.target, '.trace-dot');
    if (dot) handleDotTap(dot);
});

/** @type {Mode} */
export const lettersMode = {
    id: 'letters',
    label: 'Letters',
    icon: '🔤',
    oskLayout: 'letters',
    instructions: 'Press a letter, hear it, then follow its stroke path! 🔤',

    activate() {
        lettersContainer.classList.add('active');
        setScoreVisible(false);
        resetLetter();
    },

    deactivate() {
        lettersContainer.classList.remove('active');
        stopTracing();
        cancelSpeech();
    },

    onKey(key) {
        const letter = key.length === 1 ? key.toUpperCase() : '';
        if (/^[A-Z]$/.test(letter)) {
            showLetter(letter);
        }
    }
};
