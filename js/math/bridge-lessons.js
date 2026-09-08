import { speak } from '../speech.js';
import { closestEl } from '../dom.js';
import { el } from './manipulatives.js';
import {
    bridgeButton,
    partTrays,
    countOnModel,
    answerChoices,
    selectBridgeAnswer,
    bridgeAnswer
} from './bridges.js';

function board(container) {
    container.textContent = '';
    const wrap = el('div', 'bridge-board bridge-lesson');
    container.appendChild(wrap);
    return wrap;
}

function talk(prompt) {
    const button = bridgeButton('💬 Talk together', 'bridge-talk');
    button.dataset.talk = prompt;
    return button;
}

function handleTalk(target, container) {
    const button = closestEl(target, '.bridge-talk');
    if (!button) return false;
    let text = container.querySelector('.bridge-talk-text');
    if (!text) {
        text = el('div', 'bridge-talk-text');
        text.setAttribute('role', 'status');
        container.appendChild(text);
    }
    text.textContent = button.dataset.talk;
    speak(button.dataset.talk, { interrupt: true });
    return true;
}

function checkLesson(target, container, expected) {
    selectBridgeAnswer(target, container);
    if (!closestEl(target, '.bridge-lesson-check') || bridgeAnswer(container) === null) return {};
    if (bridgeAnswer(container) === expected) return { advance: true };
    let feedback = container.querySelector('.bridge-feedback');
    if (!feedback) {
        feedback = el('div', 'bridge-feedback');
        feedback.setAttribute('role', 'status');
        container.appendChild(feedback);
    }
    feedback.textContent = 'Try another number. You can change your choice.';
    speak(feedback.textContent, { interrupt: true });
    return {};
}

/** @type {import('../types.js').LessonDefinition} */
export const decompositionIntro = {
    id: 'decompositionIntro',
    skill: 'decompose5',
    title: 'Parts of a whole',
    sceneCount: 4,
    render(index, container) {
        const wrap = board(container);
        if (index === 0) {
            wrap.append(
                el('div', 'bridge-whole', 'Whole: 5'),
                partTrays(2, 3),
                el('div', 'bridge-bond', 'Whole 5 ↙ ↘ Parts 2 and 3'),
                el('div', 'bridge-equation', '2 + 3 = 5'),
                bridgeButton('● → Move one', 'bridge-model-move')
            );
            return {
                html: 'Two parts make one whole.',
                speak: 'Two and three make the whole, five. Move one counter to see another way to make five.'
            };
        }
        if (index === 1) {
            wrap.append(
                el('div', 'bridge-whole', 'Whole: 5'),
                partTrays(0, 5),
                el('div', 'bridge-equation', '0 + 5 = 5'),
                bridgeButton('Next →', 'bridge-next')
            );
            return {
                html: 'An empty part is zero.',
                speak: 'This part is empty. It has zero counters. Zero and five still make five.'
            };
        }
        if (index === 2) {
            wrap.append(
                el('div', 'bridge-whole', 'Whole: 4'),
                partTrays(2, 2, true),
                el('div', 'bridge-equation', '2 + 2 = 4')
            );
            const next = bridgeButton('Next →', 'bridge-next');
            next.disabled = true;
            wrap.appendChild(next);
            return {
                html: 'Tap a counter to move it to the other part.',
                speak: 'Make four another way. Tap any counter to move it to the other part. The whole stays four.'
            };
        }
        wrap.append(
            el('div', 'bridge-whole', 'Whole: 5'),
            partTrays(2, null),
            el('div', 'bridge-equation', '2 + ? = 5'),
            answerChoices([0, 1, 2, 3, 4, 5])
        );
        const actions = el('div', 'bridge-actions');
        actions.append(
            bridgeButton('✓ Check', 'bridge-lesson-check'),
            talk(
                'Can you make five another way? Together, try five age-appropriate objects and two plates.'
            )
        );
        wrap.appendChild(actions);
        return {
            html: 'Which part is missing?',
            speak: 'The whole is five. One part is two. Choose the other part, then check.'
        };
    },
    onTap(index, target, container) {
        if (handleTalk(target, container)) return {};
        if (closestEl(target, '.bridge-next:not(:disabled)')) return { advance: true };
        const move = closestEl(target, '.bridge-model-move');
        if (move) {
            // Move the same DOM counter: the whole does not disappear/reappear.
            const trays = container.querySelectorAll('.bridge-tray .bridge-counters');
            trays[1].appendChild(trays[0].lastElementChild);
            trays[0].setAttribute('aria-label', '1 counter');
            trays[1].setAttribute('aria-label', '4 counters');
            container.querySelector('.bridge-bond').textContent = 'Whole 5 ↙ ↘ Parts 1 and 4';
            container.querySelector('.bridge-equation').textContent = '1 + 4 = 5';
            move.classList.replace('bridge-model-move', 'bridge-next');
            move.textContent = 'Next →';
            speak('One and four also make five. The parts changed. The whole stayed five.', {
                interrupt: true
            });
            return {};
        }
        const counter = closestEl(target, '.bridge-move');
        if (counter && index === 2) {
            const from = /** @type {HTMLElement} */ (counter.closest('[data-part]'));
            const to = container.querySelector(
                `[data-part="${from.dataset.part === 'left' ? 'right' : 'left'}"] .bridge-counters`
            );
            to.appendChild(counter);
            counter.focus();
            const left = container.querySelectorAll('[data-part="left"] button').length;
            for (const tray of container.querySelectorAll('[data-part]')) {
                const side = tray.getAttribute('data-part');
                /** @type {HTMLElement} */ (tray).style.flexGrow = String(
                    tray.querySelectorAll('button').length || 1
                );
                [...tray.querySelectorAll('button')].forEach((button, i) =>
                    button.setAttribute('aria-label', `Move counter ${i + 1} from ${side} part`)
                );
            }
            container.querySelector('.bridge-equation').textContent = `${left} + ${4 - left} = 4`;
            container.querySelector('button.bridge-next').removeAttribute('disabled');
            speak(`${left} and ${4 - left} make four.`, { interrupt: true });
            return {};
        }
        return index === 3 ? checkLesson(target, container, 3) : {};
    }
};

/** @type {import('../types.js').LessonDefinition} */
export const countOnIntro = {
    id: 'countOnIntro',
    skill: 'countOn',
    title: 'Start here, count on',
    sceneCount: 3,
    render(index, container) {
        const wrap = board(container);
        if (index < 2) {
            const start = index === 0 ? 4 : 3;
            wrap.append(countOnModel(start, 2), el('div', 'bridge-equation', `${start} + 2 = ?`));
            if (index === 1) {
                wrap.querySelector('.bridge-number-line').hidden = true;
                wrap.appendChild(answerChoices([2, 3, 4]));
            }
            const hop = bridgeButton('↷ Add one', 'bridge-add-one');
            hop.disabled = index === 1;
            wrap.appendChild(hop);
            if (index === 0)
                return {
                    html: 'Keep four. Count two more.',
                    speak: 'We know there are four. We can start at four instead of counting that group again. Tap to count each new object with one hop.'
                };
            return {
                html: 'Start with three. Tap where to start counting on.',
                speak: 'We have three and will add two. Choose the starting number, then add one at a time.'
            };
        }
        wrap.append(el('div', 'bridge-equation', '5 + 3 = ?'), answerChoices([3, 8, 9]));
        const actions = el('div', 'bridge-actions');
        actions.append(
            bridgeButton('✓ Check', 'bridge-lesson-check'),
            talk(
                'Start with four objects and add two more. Can you keep the first amount and count on?'
            )
        );
        wrap.appendChild(actions);
        return {
            html: 'Start at five. Add three more. How many altogether?',
            speak: 'Start at five and add three more. Predict how many altogether, then check.'
        };
    },
    onTap(index, target, container) {
        if (handleTalk(target, container)) return {};
        if (closestEl(target, '.bridge-next')) return { advance: true };
        if (index === 2) return checkLesson(target, container, 8);
        const picked = closestEl(target, '.bridge-choice');
        if (index === 1 && picked) {
            selectBridgeAnswer(target, container);
            if (Number(picked.dataset.choice) !== 3) {
                speak('Look at the first group. We start with three.', { interrupt: true });
                return {};
            }
            container.querySelector('.bridge-choices').remove();
            container.querySelector('.bridge-number-line').removeAttribute('hidden');
            container.querySelector('.bridge-add-one').removeAttribute('disabled');
            speak('Start at three. Now add one at a time.', { interrupt: true });
        }
        const hop = closestEl(target, '.bridge-add-one:not(:disabled)');
        if (!hop) return {};
        const model = container.querySelector('.bridge-count-model');
        const hops = Math.min(2, Number(model.getAttribute('data-hops')) + 1);
        const start = index === 0 ? 4 : 3;
        model.replaceWith(countOnModel(start, 2, hops));
        speak(String(start + hops), { interrupt: true });
        if (hops === 2) {
            container.querySelector('.bridge-equation').textContent = `${start} + 2 = ${start + 2}`;
            hop.classList.replace('bridge-add-one', 'bridge-next');
            hop.textContent = 'Next →';
        }
        return {};
    }
};
