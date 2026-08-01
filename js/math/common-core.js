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

/** @param {Problem} problem */
function pickVariant(problem) {
    if (problem.level === 1) return Math.random() < SUBITIZE_CHANCE ? 'subitize' : 'tenframe';
    if (problem.level === 2) {
        // Make-a-ten only means anything when the sum actually crosses ten;
        // below that the first frame never fills and the strategy is a lie.
        const crossesTen = problem.a + problem.b >= 10;
        return crossesTen && Math.random() < 0.5 ? 'maketen' : 'hops';
    }
    if (problem.level === 3) return 'countback';
    return problem.op === 'add' ? 'blocks' : 'openline';
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
            workspace.appendChild(labelled('Put one counter in for each one!', tenFrame(0)));
        } else if (variant === 'maketen') {
            const frames = el('div', 'cc-frames');
            frames.appendChild(tenFrame(problem.a, { name: 'a' }));
            frames.appendChild(el('span', 'math-operator', '+'));
            frames.appendChild(tenFrame(problem.b, { name: 'b' }));
            workspace.appendChild(labelled('Move counters over to make a ten!', frames));
        } else if (variant === 'hops') {
            workspace.appendChild(labelled(
                `Start at ${problem.a} and hop ${problem.b} more!`,
                numberLine(18, problem.a)));
        } else if (variant === 'countback') {
            workspace.appendChild(labelled(
                `Start at ${problem.a} and hop back ${problem.b}!`,
                numberLine(10, problem.a)));
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
        const { a, b, item } = problem;

        if (variant === 'subitize') {
            return { html: 'How many did you see? 👀', speak: 'How many did you see?' };
        }
        if (variant === 'tenframe') {
            return {
                html: `Count the ${item.name}!`,
                speak: `Count the ${item.name.toLowerCase()}, then fill the ten frame.`
            };
        }
        if (variant === 'maketen') {
            return { html: `${a} + ${b} = ?`, speak: `${a} plus ${b}. Make a ten first!` };
        }
        if (variant === 'hops') {
            return { html: `${a} + ${b} = ?`, speak: `${a} plus ${b}. Hop up the number line!` };
        }
        if (variant === 'blocks') {
            return { html: `${a} + ${b} = ?`, speak: `${a} plus ${b}. Use the blocks!` };
        }
        return { html: `${a} − ${b} = ?`, speak: `${a} take away ${b}. Hop back!` };
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

        if (variant === 'hops' || variant === 'countback') {
            const line = container.querySelector('.number-line');
            const direction = variant === 'hops' ? 1 : -1;
            speak(variant === 'hops'
                ? `Start at ${problem.a} and hop up ${problem.b}.`
                : `Start at ${problem.a} and hop back ${problem.b}.`);
            for (let i = 1; i <= problem.b; i++) {
                setTimeout(() => {
                    if (!stillValid()) return;
                    const value = hopTo(line, problem.a + i * direction);
                    speak(String(value), { interrupt: true });
                }, 700 + i * 700);
            }
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
