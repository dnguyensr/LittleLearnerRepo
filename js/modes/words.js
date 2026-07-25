import { easyWords } from '../data/words.js';
import { playKeyTone, playWrongSound } from '../audio.js';
import { randomBackground, createBubble, randomStar, celebrate, setScoreVisible } from '../effects.js';

const wordContainer = document.getElementById('word-container');
const targetWordEl = document.getElementById('target-word');
const wordEmojiEl = document.getElementById('word-emoji');

let currentWord = '';
let currentLetterIndex = 0;

function pickNewWord() {
    const wordObj = easyWords[Math.floor(Math.random() * easyWords.length)];
    currentWord = wordObj.word;
    currentLetterIndex = 0;
    wordEmojiEl.textContent = wordObj.emoji;
    renderWord();
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
    celebrate();
    targetWordEl.classList.add('celebrate');
    setTimeout(() => {
        targetWordEl.classList.remove('celebrate');
        pickNewWord();
    }, 1000);
}

export const wordsMode = {
    id: 'words',
    label: 'Words',
    icon: '📚',
    oskLayout: 'qwerty',
    instructions: 'Type or tap the letters to spell the word! 📝',

    activate() {
        wordContainer.classList.add('active');
        setScoreVisible(true);
        pickNewWord();
    },

    deactivate() {
        wordContainer.classList.remove('active');
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

            playKeyTone(letter);
            randomBackground();

            for (let i = 0; i < 2; i++) {
                createBubble();
                randomStar();
            }

            if (currentLetterIndex >= currentWord.length) {
                celebrateWordComplete();
            } else {
                letterBoxes[currentLetterIndex].classList.add('current');
            }
        } else {
            letterBoxes[currentLetterIndex].classList.add('wrong');
            playWrongSound();
            setTimeout(() => {
                letterBoxes[currentLetterIndex].classList.remove('wrong');
            }, 500);
        }
    }
};
