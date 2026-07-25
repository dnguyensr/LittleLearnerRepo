import { getLetterInfo } from '../data/letters.js';
import { playKeyTone } from '../audio.js';
import { randomBackground, createBubble, randomStar, setScoreVisible } from '../effects.js';
import { speak, cancelSpeech } from '../speech.js';

const lettersContainer = document.getElementById('letters-container');
const letterDisplay = document.getElementById('letter-display');
const letterExample = document.getElementById('letter-example');

function showLetter(letter) {
    const info = getLetterInfo(letter);
    if (!info) return;

    letterDisplay.textContent = info.letter;
    letterDisplay.style.animation = 'none';
    letterDisplay.offsetHeight;
    letterDisplay.style.animation = 'pop 0.3s ease-out';
    letterExample.textContent = `${info.emoji} ${info.word}`;

    playKeyTone(letter);
    speak(`${info.letter}! ${info.phonic}! ${info.word}!`, { interrupt: true });
    randomBackground();
    createBubble();
    randomStar();
    randomStar();
}

export const lettersMode = {
    id: 'letters',
    label: 'Letters',
    icon: '🔤',
    oskLayout: 'qwerty',
    instructions: 'Press any letter to meet it! 🔤',

    activate() {
        lettersContainer.classList.add('active');
        setScoreVisible(false);
        letterDisplay.textContent = 'ABC';
        letterExample.textContent = 'Press a letter!';
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
