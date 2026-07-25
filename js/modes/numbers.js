import { playKeyTone } from '../audio.js';
import { randomBackground, createBubble, randomStar, setScoreVisible } from '../effects.js';
import { speak, cancelSpeech } from '../speech.js';

const numbersContainer = document.getElementById('numbers-container');
const numberDisplay = document.getElementById('number-display');
const numberObjects = document.getElementById('number-objects');

const objectEmojis = ['🍎', '⭐', '🎈', '🐸', '🌸', '🍪', '🚗', '🐤'];

let revealToken = 0;

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

    speak(`${n}!`, { interrupt: true });

    // Objects appear one by one with a counting voice-over
    for (let i = 0; i < n; i++) {
        setTimeout(() => {
            if (token !== revealToken) return;
            const span = document.createElement('span');
            span.className = 'count-object';
            span.textContent = emoji;
            numberObjects.appendChild(span);
            speak(String(i + 1), { interrupt: true });
        }, 500 + i * 500);
    }
}

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
