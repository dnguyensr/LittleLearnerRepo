import { speak, cancelSpeech } from '../speech.js';
import { tapCounter, countAloud, eaterButton, eatOne, el } from './manipulatives.js';

/** @typedef {import('../types.js').Problem} Problem */
/** @typedef {import('../types.js').MathMethod} MathMethod */

// Classical: count, memorize the facts, work the column algorithm.
// Implements the MathMethod contract in js/types.js.

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

/** @param {Problem} problem */
function regroups(problem) {
    const onesA = problem.a % 10;
    const onesB = problem.b % 10;
    return problem.op === 'add' ? onesA + onesB >= 10 : onesA < onesB;
}

/** @type {MathMethod} */
export const classicalMethod = {
    id: 'classical',
    label: 'Classical',

    render(problem, container) {
        container.innerHTML = '';
        const workspace = el('div', 'lab-workspace');

        if (problem.level === 1) {
            workspace.appendChild(tapCounter(problem.item.emoji, problem.a, {
                label: problem.item.singular.toLowerCase()
            }));
        } else if (problem.level === 2) {
            const objects = el('div', 'lab-objects');
            objects.appendChild(tapCounter(problem.item.emoji, problem.a));
            objects.appendChild(el('span', 'math-operator', '+'));
            objects.appendChild(tapCounter(problem.item.emoji, problem.b));
            workspace.appendChild(objects);
            workspace.appendChild(verticalSum(problem.a, problem.b, '+'));
        } else if (problem.level === 3) {
            const objects = el('div', 'lab-objects');
            const group = tapCounter(problem.item.emoji, problem.a);
            objects.appendChild(group);
            objects.appendChild(eaterButton(problem.item.eater, problem.item.eaterName));
            workspace.appendChild(objects);
            workspace.appendChild(verticalSum(problem.a, problem.b, '−'));
        } else {
            workspace.appendChild(columnSum(problem));
        }

        container.appendChild(workspace);
    },

    steps(problem) {
        if (problem.level < 4) {
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
        if (problem.level !== 3) return;
        if (!target.closest('.eater-btn')) return;

        const group = container.querySelector('.tap-counter');
        const eaten = eatOne(group);
        speak(eaten >= problem.b ? 'All gone! Now count what is left.' : 'Yum!', { interrupt: true });
    },

    // Animate the regroup between the ones and tens steps: a little "1" flies
    // up into the tens carry box (or across for a borrow).
    onStepDone(step, problem, container) {
        if (step.id !== 'ones' || !regroups(problem)) return 0;

        const carry = container.querySelector('[data-carry="tens"]');
        if (!carry) return 0;
        carry.textContent = '1';
        carry.classList.add(problem.op === 'add' ? 'carry-in' : 'borrow-in');
        speak(problem.op === 'add' ? 'Carry the one!' : 'Borrow a ten!', { interrupt: true });
        return 1200;
    },

    celebrationText(problem) {
        if (problem.level === 2 && problem.a !== problem.b) {
            return `${problem.a} plus ${problem.b}, and ${problem.b} plus ${problem.a}! Same answer!`;
        }
        return null;
    },

    hint(problem, container, stillValid) {
        cancelSpeech();

        if (problem.level === 1) {
            speak('Let us count together!');
            countAloud(container.querySelector('.tap-counter'), stillValid);
        } else if (problem.level === 2) {
            const groups = container.querySelectorAll('.tap-counter');
            speak('Count them all!');
            countAloud(groups[0], stillValid);
            countAloud(groups[1], stillValid, { from: problem.a, delay: 600 });
        } else if (problem.level === 3) {
            const group = container.querySelector('.tap-counter');
            for (let i = 0; i < problem.b; i++) eatOne(group);
            speak(`The ${problem.item.eaterName.toLowerCase()} ate ${problem.b}. Count what is left!`);
            countAloud(group, stillValid);
        } else if (problem.op === 'add') {
            speak(`${problem.a % 10} plus ${problem.b % 10} is ${(problem.a % 10) + (problem.b % 10)}.`
                + (regroups(problem) ? ` Write ${problem.answer % 10}, carry the one!` : ''));
        } else {
            speak(regroups(problem)
                ? `${problem.a % 10} is too small. Borrow a ten to make ${(problem.a % 10) + 10}!`
                : `${problem.a % 10} take away ${problem.b % 10}.`);
        }
    }
};
