import { speak, cancelSpeech } from '../speech.js';
import {
    tapCounter, countAloud, eaterButton, eatOne, numeralCard, el
} from './manipulatives.js';

/** @typedef {import('../types.js').Problem} Problem */
/** @typedef {import('../types.js').MathMethod} MathMethod */

// Classical: count, memorize the facts, work the column algorithm.
// Implements the MathMethod contract in js/types.js.
//
// Dispatch is on problem SHAPE, never on skill id, so a new rung on the ladder
// renders correctly here without this file being edited.

// Plain counting asks for what's on screen; "what comes before 7?" and "how
// many tens in 47?" also have op 'count' but want a different answer, so they
// get the numeral rather than a pile of objects to miscount.
function isPlainCount(problem) {
    return problem.op === 'count' && problem.answer === problem.a && !problem.twoDigit;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {string} op
 */
function verticalSum(a, b, op) {
    const wrap = el('div', 'vertical-sum');
    wrap.appendChild(el('div', 'v-row', `<span class="v-num">${a}</span>`));
    wrap.appendChild(el('div', 'v-row', `<span class="v-op">${op}</span><span class="v-num">${b}</span>`));
    wrap.appendChild(el('div', 'v-rule'));
    wrap.appendChild(el('div', 'v-row', '<span class="v-num v-slot" data-slot="total">?</span>'));
    return wrap;
}

/** `3 + ? = 8` reads far better across than stacked. */
function missingEquation(a, total) {
    return el('div', 'vertical-sum horizontal', ''
        + `<span class="v-num">${a}</span>`
        + '<span class="v-op">+</span>'
        + '<span class="v-num v-slot" data-slot="total">?</span>'
        + '<span class="v-op">=</span>'
        + `<span class="v-num">${total}</span>`);
}

/** @param {Problem} problem */
function columnSum(problem) {
    const { a, b, op } = problem;
    const sign = op === 'add' ? '+' : '−';
    const wrap = el('div', 'column-sum');

    wrap.appendChild(el('div', 'c-row c-carry-row',
        '<span class="c-op"></span>'
        + '<span class="c-carry" data-carry="tens"></span>'
        + '<span class="c-carry" data-carry="ones"></span>'));
    wrap.appendChild(el('div', 'c-row',
        `<span class="c-op"></span><span class="c-digit">${Math.floor(a / 10)}</span><span class="c-digit">${a % 10}</span>`));
    wrap.appendChild(el('div', 'c-row',
        `<span class="c-op">${sign}</span><span class="c-digit">${Math.floor(b / 10)}</span><span class="c-digit">${b % 10}</span>`));
    wrap.appendChild(el('div', 'c-rule'));
    wrap.appendChild(el('div', 'c-row c-answer',
        '<span class="c-op"></span>'
        + '<span class="c-digit c-slot" data-slot="tens">?</span>'
        + '<span class="c-digit c-slot" data-slot="ones">?</span>'));
    return wrap;
}

/** @type {MathMethod} */
export const classicalMethod = {
    id: 'classical',
    label: 'Classical',

    render(problem, container) {
        container.innerHTML = '';
        const workspace = el('div', 'lab-workspace');

        if (isPlainCount(problem)) {
            workspace.appendChild(tapCounter(problem.item.emoji, problem.a, {
                label: problem.item.singular.toLowerCase()
            }));
        } else if (problem.op === 'count') {
            workspace.appendChild(numeralCard(problem.a));
        } else if (problem.op === 'missing') {
            const objects = el('div', 'lab-objects');
            objects.appendChild(tapCounter(problem.item.emoji, problem.a));
            objects.appendChild(el('span', 'math-operator', '+'));
            objects.appendChild(el('div', 'emoji-group missing', '?'));
            workspace.appendChild(objects);
            workspace.appendChild(missingEquation(problem.a, problem.total));
        } else if (problem.twoDigit) {
            workspace.appendChild(columnSum(problem));
        } else if (problem.op === 'add') {
            const objects = el('div', 'lab-objects');
            objects.appendChild(tapCounter(problem.item.emoji, problem.a));
            objects.appendChild(el('span', 'math-operator', '+'));
            objects.appendChild(tapCounter(problem.item.emoji, problem.b));
            workspace.appendChild(objects);
            workspace.appendChild(verticalSum(problem.a, problem.b, '+'));
        } else {
            const objects = el('div', 'lab-objects');
            objects.appendChild(tapCounter(problem.item.emoji, problem.a));
            objects.appendChild(eaterButton(problem.item.eater, problem.item.eaterName));
            workspace.appendChild(objects);
            workspace.appendChild(verticalSum(problem.a, problem.b, '−'));
        }

        container.appendChild(workspace);
    },

    steps(problem) {
        if (!problem.twoDigit || problem.op === 'count') {
            return [{ id: 'total', expect: problem.answer, speak: null }];
        }
        return [
            {
                id: 'ones',
                expect: problem.answer % 10,
                speak: problem.op === 'add'
                    ? `First the ones. ${problem.a % 10} plus ${problem.b % 10}.`
                    : `First the ones. ${problem.a % 10} take away ${problem.b % 10}.`
            },
            {
                id: 'tens',
                expect: Math.floor(problem.answer / 10),
                speak: 'Now the tens!'
            }
        ];
    },

    onTap(target, problem, container) {
        if (problem.op !== 'sub' || problem.twoDigit) return;
        if (!target.closest('.eater-btn')) return;

        const group = container.querySelector('.tap-counter');
        const eaten = eatOne(group);
        speak(eaten >= problem.b ? 'All gone! Now count what is left.' : 'Yum!', { interrupt: true });
    },

    // Animate the regroup between the ones and tens steps: a little "1" flies
    // up into the tens carry box (or across for a borrow).
    onStepDone(step, problem, container) {
        if (step.id !== 'ones' || !problem.regroups) return 0;

        const carry = container.querySelector('[data-carry="tens"]');
        if (!carry) return 0;
        carry.textContent = '1';
        carry.classList.add(problem.op === 'add' ? 'carry-in' : 'borrow-in');
        speak(problem.op === 'add' ? 'Carry the one!' : 'Borrow a ten!', { interrupt: true });
        return 1200;
    },

    celebrationText(problem) {
        if (problem.op === 'add' && !problem.twoDigit && problem.a !== problem.b) {
            return `${problem.a} plus ${problem.b}, and ${problem.b} plus ${problem.a}! Same answer!`;
        }
        return null;
    },

    hint(problem, container, stillValid) {
        cancelSpeech();

        if (isPlainCount(problem)) {
            speak('Let us count together!');
            countAloud(container.querySelector('.tap-counter'), stillValid);
        } else if (problem.op === 'count') {
            speak(problem.answer === problem.a - 1
                ? `Count down: ${problem.a}, then what?`
                : `Look at ${problem.a}. Say the tens, then the ones.`);
        } else if (problem.op === 'missing') {
            speak(`Start at ${problem.a} and count up to ${problem.total}.`);
            countAloud(container.querySelector('.tap-counter'), stillValid);
        } else if (!problem.twoDigit && problem.op === 'add') {
            const groups = container.querySelectorAll('.tap-counter');
            speak('Count them all!');
            countAloud(groups[0], stillValid);
            countAloud(groups[1], stillValid, { from: problem.a, delay: 600 });
        } else if (!problem.twoDigit) {
            const group = container.querySelector('.tap-counter');
            for (let i = 0; i < problem.b; i++) eatOne(group);
            speak(`The ${problem.item.eaterName.toLowerCase()} ate ${problem.b}. Count what is left!`);
            countAloud(group, stillValid);
        } else if (problem.op === 'add') {
            speak(`${problem.a % 10} plus ${problem.b % 10} is ${(problem.a % 10) + (problem.b % 10)}.`
                + (problem.regroups ? ` Write ${problem.answer % 10}, carry the one!` : ''));
        } else {
            speak(problem.regroups
                ? `${problem.a % 10} is too small. Borrow a ten to make ${(problem.a % 10) + 10}!`
                : `${problem.a % 10} take away ${problem.b % 10}.`);
        }
    }
};
