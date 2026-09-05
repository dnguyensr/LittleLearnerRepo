import { speak, cancelSpeech } from '../speech.js';
import { closestEl } from '../dom.js';
import { el, checkButton } from './manipulatives.js';

/** @typedef {import('../types.js').Problem} Problem */
/** @typedef {import('../types.js').MathMethod} MathMethod */

function comparisonGroup(side, emoji, singular, plural, count, interactive) {
    const group = el(interactive ? 'button' : 'div', 'comparison-group');
    if (interactive) {
        group.type = 'button';
        group.dataset.compareValue = side === 'left' ? '1' : '2';
        group.setAttribute('aria-pressed', 'false');
    }
    group.setAttribute('aria-label', `${side} group, ${count} ${count === 1 ? singular : plural}`);
    group.appendChild(el('span', 'comparison-side', `${side === 'left' ? 'Left' : 'Right'} group`));

    const slots = el('span', 'comparison-slots');
    for (let index = 0; index < 5; index++) {
        const slot = el('span', `comparison-slot${index < count ? ' filled' : ''}`);
        slot.setAttribute('aria-hidden', 'true');
        slot.textContent = index < count ? emoji : '';
        slots.appendChild(slot);
    }
    group.appendChild(slots);
    return group;
}

/**
 * Two equally sized five-slots rows make one-to-one comparison available
 * without letting occupied screen area stand in for quantity.
 */
export function comparisonPair(emoji, singular, plural, left, right, { interactive = false } = {}) {
    const pair = el('div', 'comparison-groups');
    pair.appendChild(comparisonGroup('left', emoji, singular, plural, left, interactive));
    pair.appendChild(comparisonGroup('right', emoji, singular, plural, right, interactive));
    return pair;
}

function feedback(problem) {
    if (problem.a === problem.b) return `Both groups have the same number: ${problem.a}.`;
    const high = Math.max(problem.a, problem.b);
    const low = Math.min(problem.a, problem.b);
    return `${high} is more than ${low}. ${low} is fewer than ${high}.`;
}

/** @type {MathMethod} */
export const comparisonMethod = {
    id: 'comparison',
    label: 'Compare Groups',

    render(problem, container) {
        container.textContent = '';
        const workspace = el('div', 'lab-workspace comparison-board');
        workspace.appendChild(comparisonPair(
            problem.item.emoji,
            problem.item.singular.toLowerCase(),
            problem.item.name.toLowerCase(),
            problem.a,
            problem.b,
            { interactive: true }
        ));

        const same = el('button', 'comparison-same', '= Same number');
        same.type = 'button';
        same.dataset.compareValue = '0';
        same.setAttribute('aria-pressed', 'false');
        workspace.appendChild(same);
        workspace.appendChild(checkButton('Check my comparison'));
        container.appendChild(workspace);
    },

    steps(problem) {
        return [{ id: 'total', expect: problem.answer, speak: null, taps: true }];
    },

    readAnswer(container) {
        const selected = /** @type {HTMLElement|null} */ (
            container.querySelector('[data-compare-value].selected')
        );
        return selected ? Number(selected.dataset.compareValue) : null;
    },

    question(problem) {
        return { html: problem.questionText, speak: problem.speakText };
    },

    onTap(target, problem, container) {
        const choice = closestEl(target, '[data-compare-value]');
        if (!choice) return;
        for (const button of container.querySelectorAll('[data-compare-value]')) {
            button.classList.toggle('selected', button === choice);
            button.setAttribute('aria-pressed', String(button === choice));
        }
        const value = Number(choice.dataset.compareValue);
        speak(value === 0 ? 'Same number' : `${value === 1 ? 'Left' : 'Right'} group`, {
            interrupt: true
        });
    },

    hint(problem) {
        cancelSpeech();
        speak(`Count each row. Left has ${problem.a}. Right has ${problem.b}. `
            + `Which has ${problem.comparisonWord}?`);
    },

    celebrationText(problem) {
        return feedback(problem);
    }
};
