import { playKeyTone, playTone, playDrum, notes } from '../audio.js';
import { randomBackground, createBubble, createStar, randomStar, createFlyingKey, setScoreVisible } from '../effects.js';
import { displayLabel } from '../input.js';

const keyDisplay = document.getElementById('key-display');
const keyHistory = document.getElementById('key-history');

const drumTypes = ['kick', 'snare', 'hihat', 'tom'];

let previousKey = null;

function updateKeyHistory(key) {
    const historyKey = document.createElement('div');
    historyKey.className = 'history-key';
    historyKey.textContent = key;
    keyHistory.insertBefore(historyKey, keyHistory.firstChild);

    while (keyHistory.children.length > 8) {
        keyHistory.removeChild(keyHistory.lastChild);
    }
}

function playFreePlaySound(key) {
    const fKeyMatch = /^F([1-9]|1[0-2])$/i.exec(key);
    if (fKeyMatch) {
        const fNum = parseInt(fKeyMatch[1]);
        playDrum(drumTypes[(fNum - 1) % drumTypes.length]);
    } else {
        playKeyTone(key);
    }
}

export const freeplayMode = {
    id: 'free',
    label: 'Free Play',
    icon: '🎮',
    oskLayout: 'qwerty',
    instructions: 'Tap the screen or smash the keyboard! 🎉 F1-F12 = 🥁 Drums!',

    activate() {
        keyDisplay.style.display = 'block';
        keyHistory.style.display = 'flex';
        setScoreVisible(false);
    },

    deactivate() {
        keyDisplay.style.display = 'none';
        keyHistory.style.display = 'none';
    },

    onKey(key) {
        const shownKey = displayLabel(key);

        if (previousKey) {
            createFlyingKey(previousKey);
        }
        previousKey = shownKey;

        keyDisplay.textContent = shownKey;
        keyDisplay.style.animation = 'none';
        keyDisplay.offsetHeight;
        keyDisplay.style.animation = 'pop 0.2s ease-out';

        randomBackground();
        playFreePlaySound(key);

        for (let i = 0; i < 3; i++) {
            createBubble();
        }

        for (let i = 0; i < 5; i++) {
            randomStar();
        }

        updateKeyHistory(shownKey);
    },

    onTap(x, y) {
        const frequency = notes[Math.floor((x / window.innerWidth) * notes.length) % notes.length];
        playTone(frequency);
        randomBackground();
        createBubble(x, y);
        createStar(x - 20, y - 20);
        randomStar();
    }
};
