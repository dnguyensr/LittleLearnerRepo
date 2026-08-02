import { speak, cancelSpeech } from '../speech.js';
import { closestEl } from '../dom.js';
import {
    tapCounter, countAloud, eaterButton, eatOne, numeralCard, el, numberLine, hopTo,
    baseTenBlocks, blockCounts, snapTen, breakRod
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

// "What comes just before 7?" — the one count shape that asks for a number the
// child cannot get by counting what is on screen.
function isCountBack(problem) {
    return problem.op === 'count' && !problem.twoDigit && problem.answer === problem.a - 1;
}

// Take-away is the only shape with a tappable animal, and it is the only thing
// on screen the child is meant to press.
function hasEater(problem) {
    return problem.op === 'sub' && !problem.twoDigit;
}

/**
 * A row of objects, told how hard it has to work. Eight objects at a 44px
 * target already wrap to two lines on a phone, and each extra line comes
 * straight out of the space the answer needs — so past that the target gives
 * way instead. A mistap here costs nothing (tap again to un-count), which is
 * what makes trading target size for keeping every object on screen the right
 * way round.
 */
function objectRow(count) {
    const row = el('div', 'lab-objects');
    if (count > 10) row.dataset.crowded = 'packed';
    else if (count > 6) row.dataset.crowded = 'tight';
    return row;
}

/**
 * `8 + 8 = ?` on one line. Single-digit work has no column to stack, and the
 * stacked form cost 130px of a 350px play area — three times this one — which
 * is what pushed the objects (or the answer) off a phone. The stacked form is
 * still where it earns its keep: the two-digit columnSum below.
 *
 * @param {number} a
 * @param {number} b
 * @param {string} op
 */
function equation(a, b, op) {
    return el('div', 'vertical-sum horizontal', ''
        + `<span class="v-num">${a}</span>`
        + `<span class="v-op">${op}</span>`
        + `<span class="v-num">${b}</span>`
        + '<span class="v-op">=</span>'
        + '<span class="v-num v-slot" data-slot="total">?</span>');
}

/** `3 + ? = 8` — the unknown sits in the middle rather than at the end. */
function missingEquation(a, total) {
    return el('div', 'vertical-sum horizontal', ''
        + `<span class="v-num">${a}</span>`
        + '<span class="v-op">+</span>'
        + '<span class="v-num v-slot" data-slot="total">?</span>'
        + '<span class="v-op">=</span>'
        + `<span class="v-num">${total}</span>`);
}

const tens = n => Math.floor(n / 10);
const ones = n => n % 10;

/**
 * Blocks for the column to explain itself with.
 *
 * Common Core hands the child these blocks *instead of* the written algorithm.
 * Classical is the curriculum that works the algorithm, so here they sit under
 * it: the child snaps ten loose ones into a rod and writes the 1 they just
 * made, or breaks a rod open and takes the ten they just freed. Same blocks,
 * opposite job — which is the difference between the two curriculums rather
 * than a copy of one.
 *
 * @param {Problem} problem
 */
function placeValueBlocks(problem) {
    if (problem.op === 'add') {
        // Both numbers in one pile, so the ones column is a heap the child can
        // actually see pass ten.
        return baseTenBlocks(tens(problem.a) + tens(problem.b), ones(problem.a) + ones(problem.b));
    }
    // Take-away starts from the whole; the rods are what you break to borrow.
    return baseTenBlocks(tens(problem.a), ones(problem.a), { tappableRods: true });
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
        } else if (isCountBack(problem)) {
            // Counting backwards used to be the one rung with nothing to touch:
            // a numeral card and a spoken hint. The track gives the child the
            // order to walk, which is the whole idea being taught.
            workspace.appendChild(numeralCard(problem.a));
            workspace.appendChild(numberLine(problem.a, problem.a, {
                min: Math.max(0, problem.a - 5)
            }));
        } else if (problem.op === 'count') {
            workspace.appendChild(numeralCard(problem.a));
        } else if (problem.op === 'missing') {
            const objects = objectRow(problem.a);
            objects.appendChild(tapCounter(problem.item.emoji, problem.a));
            objects.appendChild(el('span', 'math-operator', '+'));
            objects.appendChild(el('div', 'emoji-group missing', '?'));
            workspace.appendChild(objects);
            workspace.appendChild(missingEquation(problem.a, problem.total));
        } else if (problem.twoDigit) {
            // Side by side, not stacked: the column is narrow and the play area
            // is short, so the blocks cost no height at all this way.
            const column = el('div', 'lab-column');
            column.appendChild(columnSum(problem));
            column.appendChild(placeValueBlocks(problem));
            workspace.appendChild(column);
        } else if (problem.op === 'add') {
            const objects = objectRow(problem.a + problem.b);
            objects.appendChild(tapCounter(problem.item.emoji, problem.a));
            objects.appendChild(el('span', 'math-operator', '+'));
            objects.appendChild(tapCounter(problem.item.emoji, problem.b));
            workspace.appendChild(objects);
            workspace.appendChild(equation(problem.a, problem.b, '+'));
        } else {
            const objects = objectRow(problem.a);
            objects.appendChild(tapCounter(problem.item.emoji, problem.a));
            objects.appendChild(eaterButton(problem.item.eater, problem.item.eaterName));
            workspace.appendChild(objects);
            workspace.appendChild(equation(problem.a, problem.b, '−'));
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

    /**
     * The eater story only works if the child knows the animal is the thing to
     * press, so `question` says so out loud — see below.
     */
    question(problem) {
        if (hasEater(problem)) {
            const { item, a, b } = problem;
            const eaten = b === 1 ? item.singular : item.name;
            // One line, not two: "how many are left?" is exactly what the
            // `8 − 4 = ?` underneath already asks, and the second line cost a
            // row of objects on a phone. It stays in the spoken version, where
            // it costs nothing and is the half a pre-reader actually gets.
            return {
                html: `${item.eater} Tap the ${item.eaterName} to eat ${b} ${eaten}!`,
                speak: `There are ${a} ${item.name.toLowerCase()}. `
                    + `Tap the ${item.eaterName.toLowerCase()} to eat ${b}. How many are left?`
            };
        }
        // Likewise: the equation is drawn below, so the question asks the
        // question rather than restating it.
        if (problem.op === 'missing') {
            return { html: `How many more to make ${problem.total}?`, speak: problem.speakText };
        }
        if (isCountBack(problem)) {
            return {
                html: problem.questionText,
                speak: `${problem.speakText} Hop back on the number track.`
            };
        }
        return { html: problem.questionText, speak: problem.speakText };
    },

    onTap(target, problem, container) {
        const tick = closestEl(target, '.nl-tick');
        if (tick) {
            speak(String(hopTo(closestEl(tick, '.number-line'), Number(tick.dataset.value))), {
                interrupt: true
            });
            return;
        }

        // Ten loose ones become a rod: the carry, made of something.
        const cube = closestEl(target, '.btb-one');
        if (cube) {
            cube.classList.toggle('selected');
            const wrap = closestEl(cube, '.base-ten');
            if (snapTen(wrap)) {
                speak('Ten ones make a ten! That is the one you carry.', { interrupt: true });
            } else {
                speak(String(blockCounts(wrap).selected), { interrupt: true });
            }
            return;
        }

        // ...and a rod becomes ten loose ones: the borrow.
        const rod = closestEl(target, '.btb-rod');
        if (rod && problem.op === 'sub') {
            if (breakRod(closestEl(rod, '.base-ten'))) {
                speak('One ten breaks into ten ones. That is how you borrow!', { interrupt: true });
            }
            return;
        }

        if (!hasEater(problem)) return;
        if (!closestEl(target, '.eater-btn')) return;

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
        } else if (isCountBack(problem)) {
            // Walk it on the track rather than just saying it: one hop back is
            // the whole skill.
            const line = container.querySelector('.number-line');
            speak(`Start at ${problem.a} and hop back one.`);
            setTimeout(() => {
                if (!stillValid() || !line) return;
                speak(String(hopTo(line, problem.answer)), { interrupt: true });
            }, 1400);
        } else if (problem.op === 'count') {
            speak(`Look at ${problem.a}. Say the tens, then the ones.`);
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
            // The blocks are the point of the hint when there is a carry: the
            // child can make the ten rather than be told to write a 1.
            speak(`${ones(problem.a)} plus ${ones(problem.b)} is ${ones(problem.a) + ones(problem.b)}.`
                + (problem.regroups
                    ? ` Tap ten loose ones to snap them into a ten, then write ${ones(problem.answer)}.`
                    : ''));
        } else {
            speak(problem.regroups
                ? `${ones(problem.a)} is too small. Tap a ten rod to break it open, `
                    + `and you have ${ones(problem.a) + 10}!`
                : `${ones(problem.a)} take away ${ones(problem.b)}.`);
        }
    }
};
