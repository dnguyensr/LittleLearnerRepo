import { mathItems } from '../data/math-items.js';
import { playKeyTone, playWrongSound } from '../audio.js';
import { randomBackground, createBubble, randomStar, celebrate, setScoreVisible, setScoreMode } from '../effects.js';
import { speak, cancelSpeech } from '../speech.js';
import { getSetting } from '../settings.js';

/** @typedef {import('../types.js').Mode} Mode */

const mathContainer = document.getElementById('math-container');
const mathQuestion = document.getElementById('math-question');
const mathEmojis = document.getElementById('math-emojis');
const mathEquation = document.getElementById('math-equation');
const mathAnswerDisplay = document.getElementById('math-answer-display');
const mathSpeakBtn = document.getElementById('math-speak-btn');

const PROBLEMS_PER_TIER = 5;
const MAX_TIER = 4;

let problem = null;
let mathAnswer = '';
let wrongAttempts = 0;
let correctThisSession = 0;
let hintToken = 0;
let locked = false;

function currentTier() {
    const setting = getSetting('mathTier');
    if (setting && setting !== 'auto') return Number(setting);
    return Math.min(MAX_TIER, 1 + Math.floor(correctThisSession / PROBLEMS_PER_TIER));
}

function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function emojiGroup(item, count, prefix = '') {
    let html = '<div class="emoji-group">' + prefix;
    for (let i = 0; i < count; i++) {
        html += `<span class="math-emoji">${item.emoji}</span>`;
    }
    return html + '</div>';
}

function generateMathProblem() {
    hintToken++;
    const tier = currentTier();
    const item = mathItems[rand(0, mathItems.length - 1)];

    let answer, questionText, speakText, emojiDisplay, equation, hint;

    if (tier === 1) {
        const n = rand(1, 5);
        answer = n;
        questionText = `Count the ${item.name}!<br>How many are there?`;
        speakText = `Count the ${item.name.toLowerCase()}! How many are there?`;
        emojiDisplay = emojiGroup(item, n);
        equation = null;
        hint = { type: 'count' };
    } else if (tier === 2) {
        const a = rand(1, 5);
        const b = rand(1, 5);
        answer = a + b;
        questionText = `Count all the ${item.name}!<br>How many ${item.name} are there?`;
        speakText = `${a} plus ${b}! Count all the ${item.name.toLowerCase()}!`;
        emojiDisplay = emojiGroup(item, a) + '<span class="math-operator">+</span>' + emojiGroup(item, b);
        equation = `${a} + ${b} = ?`;
        hint = { type: 'count' };
    } else if (tier === 3) {
        const eaterItem = item.isFood ? item : mathItems[rand(0, 7)];
        const a = rand(2, 9);
        const b = rand(1, a - 1);
        answer = a - b;
        const eatenName = b === 1 ? eaterItem.singular : eaterItem.name;
        questionText = `${eaterItem.eater} ${eaterItem.eaterName} eats ${b} ${eatenName}!<br>How many ${eaterItem.name} are left?`;
        speakText = `The ${eaterItem.eaterName.toLowerCase()} eats ${b} ${eatenName.toLowerCase()}! How many ${eaterItem.name.toLowerCase()} are left?`;
        emojiDisplay = emojiGroup(eaterItem, a) + '<span class="math-operator">−</span>' + emojiGroup(eaterItem, b, eaterItem.eater);
        equation = `${a} − ${b} = ?`;
        hint = { type: 'subtract', take: b, item: eaterItem };
    } else if (Math.random() < 0.5) {
        const a = rand(5, 10);
        const b = rand(5, 10);
        answer = a + b;
        questionText = `Count all the ${item.name}!<br>Big numbers now!`;
        speakText = `${a} plus ${b}! You can do it!`;
        emojiDisplay = emojiGroup(item, a) + '<span class="math-operator">+</span>' + emojiGroup(item, b);
        equation = `${a} + ${b} = ?`;
        hint = { type: 'count' };
    } else {
        const total = rand(5, 10);
        const a = rand(1, total - 1);
        answer = total - a;
        questionText = `How many more ${item.name} to make ${total}?`;
        speakText = `${a} plus how many makes ${total}?`;
        emojiDisplay = emojiGroup(item, a)
            + '<span class="math-operator">+</span>'
            + '<div class="emoji-group missing">?</div>'
            + '<span class="math-operator">=</span>'
            + emojiGroup(item, total);
        equation = `${a} + ? = ${total}`;
        hint = { type: 'countUp', from: a, to: total };
    }

    problem = { answer, speakText, equation, hint };
    mathAnswer = '';
    wrongAttempts = 0;
    locked = false;

    mathQuestion.innerHTML = questionText;
    mathEmojis.innerHTML = emojiDisplay;
    mathEquation.textContent = equation || '';
    mathEquation.style.display = equation ? 'block' : 'none';
    mathAnswerDisplay.textContent = '?';

    speak(speakText, { interrupt: true });
}

function updateDisplays() {
    mathAnswerDisplay.textContent = mathAnswer || '?';
    if (problem.equation) {
        mathEquation.textContent = problem.equation.replace('?', mathAnswer || '?');
    }
}

function showHint() {
    const token = ++hintToken;
    const spans = [...mathEmojis.querySelectorAll('.math-emoji')];
    const hint = problem.hint;

    if (hint.type === 'countUp') {
        speak(`Count up from ${hint.from} to ${hint.to}!`, { interrupt: true });
        return;
    }

    cancelSpeech();
    let countTargets = spans;

    if (hint.type === 'subtract') {
        // Dim the eaten ones first, then count what's left in the first group
        const groups = mathEmojis.querySelectorAll('.emoji-group');
        const firstGroup = [...groups[0].querySelectorAll('.math-emoji')];
        for (let i = 0; i < hint.take; i++) {
            firstGroup[i].classList.add('eaten');
        }
        for (const span of groups[1].querySelectorAll('.math-emoji')) {
            span.classList.add('eaten');
        }
        speak(`Take away ${hint.take}!`);
        countTargets = firstGroup.slice(hint.take);
    }

    countTargets.forEach((span, i) => {
        setTimeout(() => {
            if (token !== hintToken) return;
            span.classList.add('counted');
            speak(String(i + 1), { interrupt: true });
        }, 600 + i * 600);
    });
}

function submitAnswer() {
    if (!mathAnswer || locked) return;

    if (parseInt(mathAnswer) === problem.answer) {
        locked = true;
        correctThisSession++;
        celebrate();
        speak(`${problem.answer}! Great job!`, { interrupt: true });
        mathAnswerDisplay.style.color = '#4CAF50';
        setTimeout(() => {
            mathAnswerDisplay.style.color = 'white';
            generateMathProblem();
        }, 1800);
    } else {
        wrongAttempts++;
        // Locked through the red flash so a fast tapper can't stack up several
        // wrong answers on digits typed before they saw the first one land.
        locked = true;
        mathAnswerDisplay.style.color = '#ff6b6b';
        playWrongSound();
        setTimeout(() => {
            mathAnswer = '';
            locked = false;
            updateDisplays();
            mathAnswerDisplay.style.color = 'white';
        }, 800);
        if (wrongAttempts >= 2) {
            showHint();
        }
    }
}

/**
 * No ✓ needed: judge as soon as the digits so far can only be right or can only
 * be wrong. "1" when the answer is 12 is still on its way, so it waits; "3" is
 * not, so it's marked immediately. ✓ still works for the rare case where a
 * child stops on a valid prefix and wants to commit to it.
 */
function judgeIfDecided() {
    const expected = String(problem.answer);
    if (mathAnswer === expected || !expected.startsWith(mathAnswer)) {
        submitAnswer();
    }
}

/** @type {Mode} */
export const mathMode = {
    id: 'math',
    label: 'Math',
    icon: '🔢',
    oskLayout: 'numpad',
    instructions: 'Type the answer! 🔢',

    activate() {
        mathContainer.classList.add('active');
        setScoreMode('math');
        setScoreVisible(true);
        correctThisSession = 0;
        generateMathProblem();
    },

    deactivate() {
        mathContainer.classList.remove('active');
        hintToken++;
        cancelSpeech();
    },

    onKey(key) {
        if (locked) return;
        if (/^[0-9]$/.test(key)) {
            if (mathAnswer.length >= 2) return;
            mathAnswer += key;
            playKeyTone(key);
            randomBackground();
            createBubble();
            randomStar();
            updateDisplays();
            judgeIfDecided();
        } else if (key === 'Backspace') {
            mathAnswer = mathAnswer.slice(0, -1);
            updateDisplays();
        } else if (key === 'Enter') {
            submitAnswer();
        }
    }
};

mathSpeakBtn.addEventListener('click', () => {
    if (problem) speak(problem.speakText, { interrupt: true });
});
