import { easyWords } from '../data/words.js';
import { getLetterInfo } from '../data/letters.js';
import { playKeyTone, playWrongSound } from '../audio.js';
import { randomBackground, createBubble, randomStar, celebrate, setScoreVisible, setScoreMode } from '../effects.js';
import { setOskHint } from '../input.js';
import { speak, cancelSpeech } from '../speech.js';
import { getSetting } from '../settings.js';

const wordContainer = document.getElementById('word-container');
const targetWordEl = document.getElementById('target-word');
const wordEmojiEl = document.getElementById('word-emoji');

const WORDS_PER_TIER = 5;

// Difficulty tiers by word length: short words first
const tiers = [
    easyWords.filter(w => w.word.length <= 3),
    easyWords.filter(w => w.word.length === 4),
    easyWords.filter(w => w.word.length >= 5)
];

let currentWord = '';
let currentLetterIndex = 0;
let completedThisSession = 0;
let letterMisses = 0;
let queue = [];
let queueTier = -1;
let lastWord = '';

function tierIndex() {
    return Math.min(tiers.length - 1, Math.floor(completedThisSession / WORDS_PER_TIER));
}

function shuffled(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function nextWordFromQueue() {
    const tier = tierIndex();
    if (tier !== queueTier || queue.length === 0) {
        queue = shuffled(tiers[tier]);
        queueTier = tier;
    }
    if (queue[queue.length - 1].word === lastWord && queue.length > 1) {
        queue.unshift(queue.pop());
    }
    return queue.pop();
}

function speakLetter(letter) {
    const info = getLetterInfo(letter);
    if (getSetting('phonics') && info) {
        speak(info.phonic, { interrupt: true });
    } else {
        speak(letter, { interrupt: true });
    }
}

function updateHint() {
    setOskHint(currentWord[currentLetterIndex] || null, letterMisses >= 2);
}

function pickNewWord() {
    const wordObj = nextWordFromQueue();
    currentWord = wordObj.word;
    lastWord = wordObj.word;
    currentLetterIndex = 0;
    letterMisses = 0;
    wordEmojiEl.textContent = wordObj.emoji;
    renderWord();
    updateHint();
    speak(`Spell ${currentWord}!`, { interrupt: true });
}

function renderWord() {
    targetWordEl.innerHTML = '';
    for (let i = 0; i < currentWord.length; i++) {
        const letterBox = document.createElement('div');
        letterBox.className = 'letter-box';
        letterBox.textContent = currentWord[i];
        if (i < currentLetterIndex) {
            letterBox.classList.add('completed');
        } else if (i === currentLetterIndex) {
            letterBox.classList.add('current');
        }
        targetWordEl.appendChild(letterBox);
    }
}

function celebrateWordComplete() {
    completedThisSession++;
    celebrate();
    speak(`${currentWord}! Great job!`, { interrupt: true });
    targetWordEl.classList.add('celebrate');
    setTimeout(() => {
        targetWordEl.classList.remove('celebrate');
        pickNewWord();
    }, 1200);
}

export const wordsMode = {
    id: 'words',
    label: 'Words',
    icon: '📚',
    oskLayout: 'qwerty',
    instructions: 'Type or tap the letters to spell the word! 📝',

    activate() {
        wordContainer.classList.add('active');
        setScoreMode('words');
        setScoreVisible(true);
        completedThisSession = 0;
        pickNewWord();
    },

    deactivate() {
        wordContainer.classList.remove('active');
        setOskHint(null);
        cancelSpeech();
    },

    onKey(key) {
        const letter = key.length === 1 ? key.toUpperCase() : '';
        if (!/^[A-Z]$/.test(letter)) return;

        const expectedLetter = currentWord[currentLetterIndex];
        const letterBoxes = targetWordEl.children;

        if (letter === expectedLetter) {
            letterBoxes[currentLetterIndex].classList.remove('current');
            letterBoxes[currentLetterIndex].classList.add('completed');
            currentLetterIndex++;
            letterMisses = 0;

            playKeyTone(letter);
            speakLetter(letter);
            randomBackground();

            for (let i = 0; i < 2; i++) {
                createBubble();
                randomStar();
            }

            if (currentLetterIndex >= currentWord.length) {
                celebrateWordComplete();
            } else {
                letterBoxes[currentLetterIndex].classList.add('current');
                updateHint();
            }
        } else {
            letterMisses++;
            letterBoxes[currentLetterIndex].classList.add('wrong');
            playWrongSound();
            updateHint();
            setTimeout(() => {
                letterBoxes[currentLetterIndex]?.classList.remove('wrong');
            }, 500);
        }
    }
};
