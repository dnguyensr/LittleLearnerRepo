import { getLetterInfo, spokenLetter } from '../data/letters.js';
import { playKeyTone } from '../audio.js';
import { randomBackground, createBubble, randomStar, setScoreVisible } from '../effects.js';
import { speak, cancelSpeech } from '../speech.js';
import { getSetting } from '../settings.js';

/** @typedef {import('../types.js').Mode} Mode */

const lettersContainer = document.getElementById('letters-container');
const letterDisplay = /** @type {HTMLButtonElement} */ (document.getElementById('letter-display'));
const letterExample = /** @type {HTMLButtonElement} */ (document.getElementById('letter-example'));
const letterSoundBtn = /** @type {HTMLButtonElement} */ (document.getElementById('letter-sound-btn'));

let currentInfo = null;

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

/** @type {Mode} */
export const lettersMode = {
    id: 'letters',
    label: 'Letters',
    icon: '🔤',
    oskLayout: 'letters',
    instructions: 'Press a letter, then tap it or its picture to hear it again! 🔤',

    activate() {
        lettersContainer.classList.add('active');
        setScoreVisible(false);
        resetLetter();
    },

    deactivate() {
        lettersContainer.classList.remove('active');
        cancelSpeech();
    },

    onKey(key) {
        const letter = key.length === 1 ? key.toUpperCase() : '';
        if (/^[A-Z]$/.test(letter)) {
            showLetter(letter);
        }
    }
};
