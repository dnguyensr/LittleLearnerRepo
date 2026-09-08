import { el } from './manipulatives.js';
import { closestEl } from '../dom.js';
import { speak } from '../speech.js';

export function bridgeButton(label, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `bridge-button ${className}`;
    button.textContent = label;
    return button;
}

export function counters(count, emoji = '●') {
    const row = el('span', 'bridge-counters');
    row.setAttribute('role', 'img');
    row.setAttribute('aria-label', `${count} counters`);
    for (let i = 0; i < count; i++) {
        const counter = el('span', 'bridge-counter', emoji);
        counter.setAttribute('aria-hidden', 'true');
        row.appendChild(counter);
    }
    if (!count) row.textContent = '0';
    return row;
}

export function partTrays(left, right, movable = false) {
    const pair = el('div', 'bridge-trays');
    pair.classList.toggle('bridge-movable', movable);
    for (const [side, value] of [
        ['left', left],
        ['right', right]
    ]) {
        const tray = el('div', `bridge-tray bridge-${side}`);
        tray.dataset.part = side;
        if (movable) tray.style.flexGrow = String(value || 1);
        tray.appendChild(el('span', 'bridge-label', `${side === 'left' ? 'Left' : 'Right'} part`));
        if (value === null) {
            tray.appendChild(el('span', 'bridge-unknown', '?'));
        } else if (movable) {
            const row = el('div', 'bridge-counters');
            for (let index = 0; index < value; index++) {
                const button = bridgeButton('●', 'bridge-move');
                button.setAttribute('aria-label', `Move counter ${index + 1} from ${side} part`);
                row.appendChild(button);
            }
            tray.appendChild(row);
        } else {
            tray.appendChild(counters(value));
        }
        pair.appendChild(tray);
    }
    return pair;
}

export function countOnModel(start, added, hops = 0) {
    const model = el('div', 'bridge-count-model');
    model.dataset.hops = String(hops);
    const groups = el('div', 'bridge-groups');
    groups.append(counters(start), el('span', '', '+'));
    const newObjects = counters(added);
    [...newObjects.children].forEach((child, index) =>
        child.classList.toggle('bridge-counted', index < hops)
    );
    groups.appendChild(newObjects);
    const line = el('div', 'bridge-number-line');
    line.setAttribute('role', 'img');
    line.setAttribute('aria-label', `Start at ${start}. ${hops} hops. Now at ${start + hops}.`);
    for (let n = 0; n <= 10; n++) {
        const tick = el('span', 'bridge-tick', String(n));
        if (n === start) tick.classList.add('bridge-start');
        if (n > start && n <= start + hops) {
            tick.classList.add('bridge-hop');
            tick.prepend(el('span', 'bridge-hop-mark', '↷'));
        }
        line.appendChild(tick);
    }
    model.append(groups, line);
    return model;
}

export function answerChoices(values) {
    const choices = el('div', 'bridge-choices');
    for (const value of values) {
        const button = bridgeButton(String(value), 'bridge-choice');
        button.dataset.choice = String(value);
        button.setAttribute('aria-pressed', 'false');
        choices.appendChild(button);
    }
    return choices;
}

export function selectBridgeAnswer(target, container) {
    const picked = closestEl(target, '.bridge-choice');
    if (!picked) return;
    for (const button of container.querySelectorAll('.bridge-choice')) {
        button.setAttribute('aria-pressed', String(button === picked));
    }
    speak(picked.dataset.choice, { interrupt: true });
}

export function bridgeAnswer(container) {
    const selected = container.querySelector('.bridge-choice[aria-pressed="true"]');
    return selected ? Number(selected.dataset.choice) : null;
}

function predictionChoices(answer) {
    const other = Array.from({ length: 11 }, (_, i) => i).filter(n => n !== answer);
    const values = [answer];
    while (values.length < 3)
        values.push(other.splice(Math.floor(Math.random() * other.length), 1)[0]);
    for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
}

/** Shared task renderer: presentation preferences cannot change the question. */
/** @type {import('../types.js').MathMethod} */
export const bridgeMethod = {
    id: 'bridges',
    label: 'Parts and counting on',
    render(problem, container) {
        container.textContent = '';
        const board = el('div', 'bridge-board');
        board.dataset.representation = problem.representation;
        if (problem.task === 'decomposeWhole') {
            board.appendChild(el('div', 'bridge-whole', `Whole: ${problem.total}`));
            board.appendChild(
                partTrays(
                    problem.unknownPart === 'left' ? null : problem.a,
                    problem.unknownPart === 'right' ? null : problem.a
                )
            );
        } else {
            const model = countOnModel(problem.a, problem.b);
            // Both forms are taught in the lesson. Neither shows the endpoint.
            if (problem.representation === 'objects')
                model.querySelector('.bridge-number-line').remove();
            else model.querySelector('.bridge-groups').remove();
            board.appendChild(model);
        }
        board.appendChild(el('div', 'bridge-equation', problem.equation));
        board.appendChild(
            answerChoices(
                problem.task === 'decomposeWhole'
                    ? [0, 1, 2, 3, 4, 5]
                    : predictionChoices(problem.answer)
            )
        );
        const actions = el('div', 'bridge-actions');
        actions.append(
            bridgeButton('✓ Check', 'lab-check'),
            bridgeButton('👋 Help me', 'bridge-support')
        );
        board.appendChild(actions);
        container.appendChild(board);
    },
    steps(problem) {
        return [{ id: 'total', expect: problem.answer, speak: null, taps: true }];
    },
    question(problem) {
        return {
            html:
                problem.task === 'decomposeWhole' ? 'Which part is missing?' : problem.questionText,
            speak: problem.speakText
        };
    },
    readAnswer: bridgeAnswer,
    onTap: (target, problem, container) => selectBridgeAnswer(target, container),
    hint(problem, container) {
        if (problem.task === 'decomposeWhole') {
            container
                .querySelector('.bridge-trays')
                .replaceWith(
                    partTrays(
                        problem.unknownPart === 'left' ? problem.answer : problem.a,
                        problem.unknownPart === 'right' ? problem.answer : problem.a
                    )
                );
            speak(`${problem.a} and ${problem.answer} make the whole, ${problem.total}.`, {
                interrupt: true
            });
        } else {
            container
                .querySelector('.bridge-count-model')
                .replaceWith(countOnModel(problem.a, problem.b, problem.b));
            speak(
                `Start at ${problem.a}. ${Array.from({ length: problem.b }, (_, i) => problem.a + i + 1).join(', ')}. ${problem.b} more makes ${problem.answer}.`,
                { interrupt: true }
            );
        }
    },
    onStepDone(step, problem, container) {
        container.querySelector('.bridge-equation').textContent = problem.equation.replace(
            '?',
            String(problem.answer)
        );
        return 0;
    }
};
