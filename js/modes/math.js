import { mathItems } from '../data/math-items.js';
import { playKeyTone, playWrongSound } from '../audio.js';
import { randomBackground, createBubble, randomStar, celebrate, setScoreVisible } from '../effects.js';

const mathContainer = document.getElementById('math-container');
const mathQuestion = document.getElementById('math-question');
const mathEmojis = document.getElementById('math-emojis');
const mathAnswerDisplay = document.getElementById('math-answer-display');

let currentMathProblem = null;
let mathAnswer = '';

function emojiGroup(item, count, prefix = '') {
    let html = '<div class="emoji-group">' + prefix;
    for (let i = 0; i < count; i++) {
        html += item.emoji;
    }
    return html + '</div>';
}

function generateMathProblem() {
    const item = mathItems[Math.floor(Math.random() * mathItems.length)];
    const isSubtraction = item.isFood && Math.random() > 0.75;

    let answer, questionText, emojiDisplay;

    if (isSubtraction) {
        const num1 = Math.floor(Math.random() * 8) + 2;
        const num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
        answer = num1 - num2;

        const eatenName = num2 === 1 ? item.singular : item.name;
        questionText = `${item.eater} ${item.eaterName} eats ${num2} ${eatenName}!<br>How many ${item.name} are left?`;
        emojiDisplay = emojiGroup(item, num1)
            + '<span class="math-operator">−</span>'
            + emojiGroup(item, num2, item.eater);
    } else {
        const num1 = Math.floor(Math.random() * 5) + 1;
        const num2 = Math.floor(Math.random() * 5) + 1;
        answer = num1 + num2;

        questionText = `Count all the ${item.name}!<br>How many ${item.name} are there?`;
        emojiDisplay = emojiGroup(item, num1)
            + '<span class="math-operator">+</span>'
            + emojiGroup(item, num2);
    }

    currentMathProblem = {
        answer: answer,
        isSubtraction: isSubtraction,
        item: item
    };
    mathAnswer = '';

    mathQuestion.innerHTML = questionText;
    mathEmojis.innerHTML = emojiDisplay;
    mathAnswerDisplay.textContent = '?';
}

function celebrateMathCorrect() {
    celebrate();
    mathAnswerDisplay.style.color = '#4CAF50';

    if (currentMathProblem.isSubtraction) {
        let resultEmojis = '';
        for (let i = 0; i < currentMathProblem.answer; i++) {
            resultEmojis += currentMathProblem.item.emoji;
        }
        mathEmojis.innerHTML = `<div class="emoji-group">${resultEmojis || '(none left!)'}</div>`;
        mathQuestion.innerHTML = `${currentMathProblem.answer} ${currentMathProblem.answer === 1 ? currentMathProblem.item.singular : currentMathProblem.item.name} left! 🎉`;
    }

    setTimeout(() => {
        mathAnswerDisplay.style.color = 'white';
        generateMathProblem();
    }, 1500);
}

function checkMathAnswer(digit) {
    mathAnswer += digit;
    mathAnswerDisplay.textContent = mathAnswer;

    if (parseInt(mathAnswer) === currentMathProblem.answer) {
        celebrateMathCorrect();
    } else if (mathAnswer.length >= String(currentMathProblem.answer).length) {
        mathAnswerDisplay.style.color = '#ff6b6b';
        playWrongSound();
        setTimeout(() => {
            mathAnswer = '';
            mathAnswerDisplay.textContent = '?';
            mathAnswerDisplay.style.color = 'white';
        }, 800);
    }
}

export const mathMode = {
    id: 'math',
    label: 'Math',
    icon: '🔢',
    oskLayout: 'numpad',
    instructions: 'Type or tap the number answer! 🔢',

    activate() {
        mathContainer.classList.add('active');
        setScoreVisible(true);
        generateMathProblem();
    },

    deactivate() {
        mathContainer.classList.remove('active');
    },

    onKey(key) {
        if (/^[0-9]$/.test(key)) {
            playKeyTone(key);
            randomBackground();
            createBubble();
            randomStar();
            checkMathAnswer(key);
        } else if (key === 'Backspace' && mathAnswer.length > 0) {
            mathAnswer = mathAnswer.slice(0, -1);
            mathAnswerDisplay.textContent = mathAnswer || '?';
        }
    }
};
