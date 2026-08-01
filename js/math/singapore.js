import { speak, cancelSpeech } from '../speech.js';
import { closestEl } from '../dom.js';
import {
    el, tapCounter, countAloud, dotCard, numeralCard, tenFrame, fillCell, frameCount,
    numberBond, splitPart, barModel, revealSegment
} from './manipulatives.js';

/** @typedef {import('../types.js').Problem} Problem */
/** @typedef {import('../types.js').MathMethod} MathMethod */

// Singapore: Concrete → Pictorial → Abstract, part-whole thinking throughout.
// Implements the MathMethod contract in js/types.js.
//
// Like Common Core, the chosen presentation is recorded on the container as
// `data-variant` so onTap, hint and question all read what render actually drew.

// The abstract step (numeral → quantity) is now its own ladder rung,
// `numeralMatch`, so the within-rung rotation is just concrete ↔ pictorial.
const CPA_STAGES = ['concrete', 'pictorial'];
const PROBLEMS_PER_STAGE = 2;

function variantOf(container) {
    return container.dataset.variant;
}

function tens(n) {
    return Math.floor(n / 10) * 10;
}

function ones(n) {
    return n % 10;
}

/**
 * Level 1 walks C → P → A and then starts over, so a child kept on level 1
 * meets every representation instead of parking on the last one.
 */
function cpaStage(session) {
    return CPA_STAGES[Math.floor(session.correct / PROBLEMS_PER_STAGE) % CPA_STAGES.length];
}

/**
 * Make-a-ten only has something to say when the first part is short of ten and
 * the second part is big enough to lend without emptying itself. One predicate
 * for the label, the tap and the hint, so they can't disagree.
 *
 * @param {Problem} problem
 */
function splitOf(problem) {
    const toTen = 10 - problem.a;
    if (toTen <= 0 || toTen >= problem.b) return null;
    return { toTen, rest: problem.b - toTen };
}

/**
 * Dispatch is on problem SHAPE, with one exception: Singapore's own detour rung
 * `numeralMatch` is keyed by skill id, because that rung exists precisely
 * because this curriculum teaches numeral → quantity as its own step. Spine
 * rungs stay shape-driven so a new one needs no edit here.
 *
 * @param {Problem} problem
 */
function pickVariant(problem, session) {
    if (problem.skill === 'numeralMatch') return 'numeralbuild';

    if (problem.op === 'count') {
        if (problem.twoDigit) return 'placevaluebar';
        // "What comes before 7?" isn't a counting task; showing 7 objects to
        // count would walk the child straight to the wrong answer.
        if (problem.answer !== problem.a) return 'numeral';
        return cpaStage(session);
    }

    // Part-whole covers both "one part is missing" and take-away — Singapore
    // teaches them as the same picture, which is the point.
    if (problem.op === 'missing') return 'missingpart';
    if (problem.twoDigit) return problem.op === 'add' ? 'splitbars' : 'comparebars';
    if (problem.op === 'sub') return 'missingpart';
    return 'bond';
}

function labelled(text, node) {
    const box = el('div', 'cc-labelled');
    box.appendChild(el('div', 'cc-label', text));
    box.appendChild(node);
    return box;
}

/**
 * Singapore draws take-away and missing-addend as the same part-whole picture,
 * so both shapes resolve to one { whole, known } pair here.
 *
 * @param {Problem} problem
 */
function partWholeOf(problem) {
    return problem.op === 'missing'
        ? { whole: problem.total, known: problem.a }
        : { whole: problem.a, known: problem.b };
}

function combineButton(label, which) {
    const btn = el('button', 'sg-combine');
    btn.type = 'button';
    btn.textContent = label;
    btn.dataset.combine = which;
    return btn;
}

/** @type {MathMethod} */
export const singaporeMethod = {
    id: 'singapore',
    label: 'Singapore',

    render(problem, container, session) {
        container.innerHTML = '';
        const variant = pickVariant(problem, session);
        container.dataset.variant = variant;
        const workspace = el('div', 'lab-workspace sg');

        if (variant === 'concrete') {
            workspace.appendChild(tapCounter(problem.item.emoji, problem.a, {
                label: problem.item.singular.toLowerCase()
            }));
        } else if (variant === 'pictorial') {
            workspace.appendChild(labelled('Count the dots!', dotCard(problem.a)));
        } else if (variant === 'numeralbuild') {
            // Reverse of the other CPA stages: the numeral is given and the
            // child builds the quantity from it.
            workspace.appendChild(numeralCard(problem.a));
            workspace.appendChild(labelled('Tap that many counters!', tenFrame(0)));
        } else if (variant === 'numeral') {
            workspace.appendChild(numeralCard(problem.a));
        } else if (variant === 'placevaluebar') {
            workspace.appendChild(labelled('One bar, split into tens and ones.', barModel([
                { value: tens(problem.a), label: `${tens(problem.a) / 10} tens` },
                { value: ones(problem.a), label: `${ones(problem.a)} ones` }
            ], { brace: String(problem.a) })));
        } else if (variant === 'bond') {
            workspace.appendChild(labelled(
                splitOf(problem) ? 'Tap the second part to break it up!' : 'Put the parts together!',
                numberBond(null, [problem.a, problem.b])));
        } else if (variant === 'missingpart') {
            const { whole, known } = partWholeOf(problem);
            workspace.appendChild(numberBond(whole, [known, null]));
            workspace.appendChild(barModel([
                { value: known },
                { value: problem.answer, covered: true }
            ], { brace: `${whole} in all` }));
        } else if (variant === 'splitbars') {
            const bars = el('div', 'sg-bars');
            for (const value of [problem.a, problem.b]) {
                bars.appendChild(barModel([
                    { value: tens(value) },
                    { value: ones(value) }
                ], { brace: String(value) }));
            }
            workspace.appendChild(labelled('Add the tens, then the ones!', bars));

            const controls = el('div', 'sg-controls');
            controls.appendChild(combineButton('Tens', 'tens'));
            controls.appendChild(combineButton('Ones', 'ones'));
            workspace.appendChild(controls);
        } else {
            const { whole, known } = partWholeOf(problem);
            workspace.appendChild(labelled('One part is hidden — what is it?', barModel([
                { value: known },
                { value: problem.answer, covered: true }
            ], { brace: `${whole} in all` })));
        }

        container.appendChild(workspace);
    },

    // Every Singapore representation yields the whole answer at once.
    steps(problem) {
        return [{ id: 'total', expect: problem.answer, speak: null }];
    },

    question(problem, container) {
        const variant = variantOf(container);
        const { a, b, item } = problem;

        if (variant === 'concrete') {
            return {
                html: `Count the ${item.name}!`,
                speak: `Count the ${item.name.toLowerCase()}. How many are there?`
            };
        }
        if (variant === 'pictorial') {
            return { html: 'How many dots?', speak: 'How many dots do you see?' };
        }
        if (variant === 'numeralbuild') {
            return { html: `Show me ${a}!`, speak: `Show me ${a}. Tap that many counters.` };
        }
        if (variant === 'numeral' || variant === 'placevaluebar') {
            return { html: problem.questionText, speak: problem.speakText };
        }
        if (variant === 'bond') {
            return { html: `${a} + ${b} = ?`, speak: `${a} and ${b}. What is the whole?` };
        }
        if (variant === 'splitbars') {
            return { html: `${a} + ${b} = ?`, speak: `${a} plus ${b}. Split them into tens and ones.` };
        }

        const { whole, known } = partWholeOf(problem);
        return {
            html: problem.op === 'missing' ? `${a} + ? = ${problem.total}` : `${a} − ${b} = ?`,
            speak: `The whole is ${whole}. One part is ${known}. What is the other part?`
        };
    },

    onTap(target, problem, container) {
        const variant = variantOf(container);

        if (variant === 'numeralbuild') {
            const cell = closestEl(target, '.tf-cell');
            if (cell) {
                cell.classList.toggle('filled');
                const count = frameCount(closestEl(cell, '.ten-frame'));
                speak(count === problem.a ? `${count}! That is right!` : String(count), { interrupt: true });
            }
            return;
        }

        if (variant === 'bond') {
            if (!closestEl(target, '.nb-part[data-part="1"]')) return;
            const split = splitOf(problem);
            if (!split) {
                speak('Put the parts together!', { interrupt: true });
            } else if (splitPart(container.querySelector('.number-bond'), 1, split.toTen, split.rest)) {
                speak(`${problem.b} breaks into ${split.toTen} and ${split.rest}. `
                    + `${problem.a} and ${split.toTen} make ten!`, { interrupt: true });
            }
            return;
        }

        // The button becomes its own answer chip: one row instead of two, which
        // is what keeps this level inside the play area on a phone.
        const combine = closestEl(target, '.sg-combine');
        if (combine) {
            if (combine.dataset.partSum) return;

            const isTens = combine.dataset.combine === 'tens';
            const [partA, partB] = isTens
                ? [tens(problem.a), tens(problem.b)]
                : [ones(problem.a), ones(problem.b)];
            const sum = partA + partB;

            combine.textContent = `${isTens ? 'Tens' : 'Ones'}: ${sum}`;
            combine.dataset.partSum = combine.dataset.combine;
            combine.classList.add('used');
            speak(`${partA} and ${partB} make ${sum}.`, { interrupt: true });
        }
    },

    // Uncover the hidden part once the child has worked it out for themselves.
    onStepDone(step, problem, container) {
        const model = container.querySelector('.bar-model .bm-seg.covered')
            ? container.querySelector('.bar-model')
            : null;
        if (model) revealSegment(model, 1);
        return 0;
    },

    hint(problem, container, stillValid) {
        cancelSpeech();
        const variant = variantOf(container);

        if (variant === 'concrete' || variant === 'pictorial') {
            speak('Let us count together!');
            countAloud(container.querySelector('.tap-counter'), stillValid);
            return;
        }

        if (variant === 'numeralbuild') {
            const frame = container.querySelector('.ten-frame');
            speak(`Tap ${problem.a} counters.`);
            for (let i = 0; i < problem.a; i++) {
                setTimeout(() => {
                    if (!stillValid()) return;
                    fillCell(frame);
                    speak(String(i + 1), { interrupt: true });
                }, 600 + i * 600);
            }
            return;
        }

        if (variant === 'numeral') {
            speak(`Say the numbers in order. What comes just before ${problem.a}?`);
            return;
        }

        if (variant === 'placevaluebar') {
            speak(`${problem.a} splits into ${tens(problem.a)} and ${ones(problem.a)}. `
                + `That is ${tens(problem.a) / 10} tens and ${ones(problem.a)} ones.`);
            return;
        }

        if (variant === 'bond') {
            const split = splitOf(problem);
            speak(split
                ? `${problem.a} needs ${split.toTen} to make ten. `
                    + `Break ${problem.b} into ${split.toTen} and ${split.rest}. Ten and ${split.rest}.`
                : `The parts are ${problem.a} and ${problem.b}. Count them all together.`);
            return;
        }

        if (variant === 'missingpart' || variant === 'comparebars') {
            const { whole, known } = partWholeOf(problem);
            speak(`The whole is ${whole} and one part is ${known}. `
                + `${known} and how many more makes ${whole}?`);
            return;
        }

        speak(`${tens(problem.a)} and ${tens(problem.b)} make ${tens(problem.a) + tens(problem.b)}. `
            + `${ones(problem.a)} and ${ones(problem.b)} make ${ones(problem.a) + ones(problem.b)}. `
            + 'Now put those together.');
    }
};
