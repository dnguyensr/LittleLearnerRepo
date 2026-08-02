import { speak, cancelSpeech } from '../speech.js';
import { closestEl } from '../dom.js';
import {
    el, tapCounter, tenFrame, frameCount, fillCell, emptyCell,
    numberLine, hopTo, openNumberLine, hopBy, undoHop,
    baseTenBlocks, blockCounts, snapTen
} from './manipulatives.js';

/** @typedef {import('../types.js').Problem} Problem */
/** @typedef {import('../types.js').MathMethod} MathMethod */

// Common Core: strategies and place value. Implements the MathMethod contract
// in js/types.js.
//
// Several levels have two presentations of the same problem (make-a-ten vs.
// number-line hops, and so on). The choice is stored on the container as
// `data-variant`, not in a module variable, so onTap and hint always read the
// same variant that render drew — including after a settings-triggered
// re-render.

const SUBITIZE_CHANCE = 0.25;

function variantOf(container) {
    return container.dataset.variant;
}

function tens(n) {
    return Math.floor(n / 10);
}

function ones(n) {
    return n % 10;
}

/**
 * Dispatch is on problem SHAPE, with one exception: Common Core's own detour
 * rungs (`subitize`, `countOn`) are keyed by skill id, because those rungs exist
 * precisely because this curriculum teaches that specific thing. Spine rungs
 * must stay shape-driven so a new one needs no edit here.
 *
 * @param {Problem} problem
 */
function pickVariant(problem) {
    if (problem.skill === 'subitize') return 'subitize';
    if (problem.skill === 'countOn') return 'counton';

    if (problem.op === 'count') {
        if (problem.twoDigit) return 'placevalue';
        // "What comes before 7?" is a number-line question, not a counting one
        if (problem.answer !== problem.a) return 'hops';
        return Math.random() < SUBITIZE_CHANCE ? 'subitize' : 'tenframe';
    }

    // Think-addition: hop up from the part you know to the whole
    if (problem.op === 'missing') return 'hops';

    if (problem.twoDigit) return problem.op === 'add' ? 'blocks' : 'openline';

    // Make-a-ten only means anything when the sum actually crosses ten; below
    // that the first frame never fills and the strategy is a lie.
    if (problem.op === 'add') {
        return problem.crossesTen && Math.random() < 0.6 ? 'maketen' : 'hops';
    }
    return 'countback';
}

// Where the frog starts and where it should land, per variant.
function lineRange(problem, variant) {
    if (variant === 'counton') {
        const from = Math.max(problem.a, problem.b);
        return { from, to: problem.answer, max: 20 };
    }
    if (problem.op === 'missing') {
        return { from: problem.a, to: problem.total, max: 20 };
    }
    if (problem.op === 'count') {
        return { from: problem.a, to: problem.answer, max: 10 };
    }
    if (problem.op === 'sub') {
        return { from: problem.a, to: problem.answer, max: 20 };
    }
    return { from: problem.a, to: problem.answer, max: 20 };
}

function labelled(text, node) {
    const box = el('div', 'cc-labelled');
    box.appendChild(el('div', 'cc-label', text));
    box.appendChild(node);
    return box;
}

function peekButton() {
    const btn = el('button', 'cc-peek');
    btn.type = 'button';
    btn.textContent = '👀 Peek';
    return btn;
}

/** @type {MathMethod} */
export const commonCoreMethod = {
    id: 'commoncore',
    label: 'Common Core',

    render(problem, container) {
        container.innerHTML = '';
        const variant = pickVariant(problem);
        container.dataset.variant = variant;
        const workspace = el('div', 'lab-workspace cc');

        if (variant === 'subitize') {
            // Flash the full frame, then hide it: the child answers from the
            // shape they saw, which is the whole point of subitizing.
            const frame = tenFrame(problem.a, { interactive: false });
            frame.classList.add('flashing');
            workspace.appendChild(labelled('How many did you see?', frame));
            workspace.appendChild(peekButton());
            setTimeout(() => frame.classList.add('covered'), 1600);
        } else if (variant === 'tenframe') {
            // Objects first, then the structured frame — the frame is what the
            // child builds, so it starts empty.
            workspace.appendChild(tapCounter(problem.item.emoji, problem.a, { tappable: false }));
            workspace.appendChild(labelled('Tap one box for each one!', tenFrame(0)));
        } else if (variant === 'maketen') {
            const frames = el('div', 'cc-frames');
            frames.appendChild(tenFrame(problem.a, { name: 'a' }));
            frames.appendChild(el('span', 'math-operator', '+'));
            frames.appendChild(tenFrame(problem.b, { name: 'b' }));
            // Here the child taps a *filled* cell, so the noun is the dot in it
            // rather than the box around it.
            workspace.appendChild(labelled('Tap the dots to move them and make a ten!', frames));
        } else if (variant === 'counton') {
            const { from, max } = lineRange(problem, variant);
            workspace.appendChild(labelled(
                `Start at the bigger number, ${from}, and count on!`,
                numberLine(max, from)));
        } else if (variant === 'hops' || variant === 'countback') {
            const { from, max } = lineRange(problem, variant);
            const label = problem.op === 'missing'
                ? `Hop up from ${problem.a} until you reach ${problem.total}!`
                : problem.op === 'sub'
                    ? `Start at ${from} and hop back ${problem.b}!`
                    : problem.op === 'count'
                        ? 'Which number comes just before?'
                        : `Start at ${from} and hop ${problem.b} more!`;
            workspace.appendChild(labelled(label, numberLine(max, from)));
        } else if (variant === 'placevalue') {
            // Ten rods and loose ones make "how many tens" something to look at
            // rather than a digit-position rule to recite.
            workspace.appendChild(labelled(
                'Count the rods and the loose ones!',
                baseTenBlocks(tens(problem.a), ones(problem.a))));
        } else if (variant === 'blocks') {
            // Only promise a snap when there are actually ten loose ones to snap
            const loose = ones(problem.a) + ones(problem.b);
            workspace.appendChild(labelled(
                loose >= 10 ? 'Tap ten loose ones to snap them into a ten!' : 'Count the tens, then the ones!',
                baseTenBlocks(tens(problem.a) + tens(problem.b), loose)));
        } else {
            workspace.appendChild(labelled(
                `Hop back ${problem.b} from ${problem.a}!`,
                openNumberLine(problem.a, -1)));
        }

        container.appendChild(workspace);
    },

    // Every Common Core strategy produces the whole answer in one go, so there
    // is never more than one entry step (unlike the classical column algorithm).
    steps(problem) {
        return [{ id: 'total', expect: problem.answer, speak: null }];
    },

    question(problem, container) {
        const variant = variantOf(container);
        const { a, b, total, item } = problem;

        if (variant === 'subitize') {
            return { html: 'How many did you see? 👀', speak: 'How many did you see?' };
        }
        if (variant === 'tenframe') {
            return {
                html: `Count the ${item.name}!`,
                speak: `Count the ${item.name.toLowerCase()}, then tap one box for each one.`
            };
        }
        if (variant === 'placevalue') {
            return { html: problem.questionText, speak: problem.speakText };
        }
        if (problem.op === 'count') {
            return { html: problem.questionText, speak: problem.speakText };
        }
        if (problem.op === 'missing') {
            return {
                html: `${a} + ? = ${total}`,
                speak: `${a} and how many more makes ${total}? Hop up and find out.`
            };
        }
        if (problem.op === 'sub') {
            return { html: `${a} − ${b} = ?`, speak: `${a} take away ${b}. Hop back!` };
        }
        if (variant === 'maketen') {
            return { html: `${a} + ${b} = ?`, speak: `${a} plus ${b}. Make a ten first!` };
        }
        if (variant === 'counton') {
            const bigger = Math.max(a, b);
            return {
                html: `${a} + ${b} = ?`,
                speak: `${a} plus ${b}. Start at ${bigger} and count on.`
            };
        }
        if (variant === 'blocks') {
            return { html: `${a} + ${b} = ?`, speak: `${a} plus ${b}. Use the blocks!` };
        }
        return { html: `${a} + ${b} = ?`, speak: `${a} plus ${b}. Hop up the number line!` };
    },

    onTap(target, problem, container) {
        const variant = variantOf(container);

        if (variant === 'subitize' && closestEl(target, '.cc-peek')) {
            const frame = container.querySelector('.ten-frame');
            frame.classList.remove('covered');
            setTimeout(() => frame.classList.add('covered'), 800);
            return;
        }

        const cell = closestEl(target, '.tf-cell');
        if (cell) {
            const frame = closestEl(cell, '.ten-frame');
            if (variant === 'tenframe') {
                cell.classList.toggle('filled');
                speak(String(frameCount(frame)), { interrupt: true });
            } else if (variant === 'maketen' && frame.dataset.frame === 'b' && cell.classList.contains('filled')) {
                // Move it across rather than just removing it, so the total
                // never changes while the child rearranges.
                const frameA = container.querySelector('.ten-frame[data-frame="a"]');
                if (fillCell(frameA)) {
                    emptyCell(frame);
                    const filled = frameCount(frameA);
                    speak(filled === 10 ? 'Ten! Now count on.' : String(filled), { interrupt: true });
                } else {
                    speak('That one is full!', { interrupt: true });
                }
            }
            return;
        }

        const tick = closestEl(target, '.nl-tick');
        if (tick) {
            const line = closestEl(tick, '.number-line');
            const value = hopTo(line, Number(tick.dataset.value));
            speak(String(value), { interrupt: true });
            return;
        }

        const hopBtn = closestEl(target, '.ol-hop');
        if (hopBtn) {
            const line = closestEl(hopBtn, '.open-line');
            const position = hopBtn.dataset.hop === 'undo'
                ? undoHop(line)
                : hopBy(line, Number(hopBtn.dataset.hop));
            speak(String(position), { interrupt: true });
            return;
        }

        const cube = closestEl(target, '.btb-one');
        if (cube) {
            cube.classList.toggle('selected');
            const wrap = closestEl(cube, '.base-ten');
            const { selected } = blockCounts(wrap);
            if (snapTen(wrap)) {
                speak('Ten ones make a ten! Snap!', { interrupt: true });
            } else {
                speak(String(selected), { interrupt: true });
            }
        }
    },

    hint(problem, container, stillValid) {
        cancelSpeech();
        const variant = variantOf(container);

        if (variant === 'subitize') {
            const frame = container.querySelector('.ten-frame');
            frame.classList.remove('covered');
            speak('Look again! Count the dots.');
            setTimeout(() => stillValid() && frame.classList.add('covered'), 3000);
            return;
        }

        if (variant === 'tenframe') {
            const frame = container.querySelector('.ten-frame');
            for (let i = 0; i < problem.a; i++) {
                setTimeout(() => {
                    if (!stillValid()) return;
                    fillCell(frame);
                    speak(String(i + 1), { interrupt: true });
                }, 600 + i * 600);
            }
            return;
        }

        if (variant === 'maketen') {
            const need = 10 - problem.a;
            speak(`${problem.a} needs ${need} more to make ten. `
                + `Move ${need} over, then it is 10 and ${problem.b - need}.`);
            return;
        }

        if (variant === 'hops' || variant === 'countback' || variant === 'counton') {
            // Walk the line one step at a time, in whichever direction this
            // problem actually travels.
            const line = container.querySelector('.number-line');
            const { from, to } = lineRange(problem, variant);
            const direction = to >= from ? 1 : -1;
            const steps = Math.abs(to - from);

            speak(direction > 0
                ? `Start at ${from} and hop up to ${to}.`
                : `Start at ${from} and hop back to ${to}.`);
            for (let i = 1; i <= steps; i++) {
                setTimeout(() => {
                    if (!stillValid()) return;
                    const value = hopTo(line, from + i * direction);
                    speak(String(value), { interrupt: true });
                }, 700 + i * 700);
            }
            // Take-away and think-addition are the same fact seen two ways;
            // hearing both is the point of the strategy, not a bonus.
            if (problem.op === 'sub') {
                setTimeout(() => {
                    if (!stillValid()) return;
                    speak(`Or think of it the other way: ${problem.b} and how many more makes ${problem.a}?`);
                }, 700 + (steps + 1) * 700);
            }
            return;
        }

        if (variant === 'placevalue') {
            speak(`${problem.a} is ${tens(problem.a)} tens and ${ones(problem.a)} ones. Count the rods, then the loose ones.`);
            return;
        }

        if (variant === 'blocks') {
            const loose = ones(problem.a) + ones(problem.b);
            speak(`${tens(problem.a) + tens(problem.b)} tens and ${loose} ones. `
                + (loose >= 10
                    ? 'Ten of those ones make another ten!'
                    : 'Count the tens, then the ones.'));
            return;
        }

        speak(`Hop back ten from ${problem.a}, then hop back ones until you have taken away ${problem.b}.`);
    }
};
