import { speak } from '../speech.js';
import { closestEl } from '../dom.js';
import { el, tapCounter, eaterButton, eatOne, baseTenBlocks } from './manipulatives.js';

/** @typedef {import('../types.js').LessonDefinition} LessonDefinition */

function actionButton(label, className = 'lesson-next') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `lesson-action ${className}`;
    button.textContent = label;
    return button;
}

function scene(title, instruction) {
    const wrap = el('div', 'lesson-scene');
    wrap.appendChild(el('div', 'lesson-scene-title', title));
    wrap.appendChild(el('div', 'lesson-instruction', instruction));
    return wrap;
}

function choice(value, correct) {
    const button = actionButton(String(value), 'lesson-choice');
    button.dataset.correct = String(correct);
    return button;
}

/** @type {LessonDefinition} */
const subtractionIntro = {
    id: 'subtractionIntro',
    path: 'subtraction',
    title: 'Learn Take Away',
    sceneCount: 3,

    render(sceneIndex, container) {
        container.textContent = '';
        if (sceneIndex === 0) {
            const wrap = scene('Watch one go away', 'We start with 4 apples. One goes away.');
            const apples = tapCounter('🍎', 4, { tappable: false });
            apples.children[3].classList.add('eaten');
            wrap.appendChild(apples);
            wrap.appendChild(el('div', 'lesson-equation', '4 − 1 = 3'));
            wrap.appendChild(actionButton('I see it!'));
            container.appendChild(wrap);
            return {
                html: 'Taking away makes a group smaller.',
                speak: 'Taking away makes a group smaller. Four apples. One goes away. Three are left.'
            };
        }

        if (sceneIndex === 1) {
            const wrap = scene('You try it', 'Tap the horse 2 times to take away 2 apples.');
            const row = el('div', 'lesson-object-row');
            row.appendChild(tapCounter('🍎', 5));
            const eater = eaterButton('🐴', 'HORSE');
            eater.dataset.lessonEater = '2';
            row.appendChild(eater);
            wrap.appendChild(row);
            wrap.appendChild(el('div', 'lesson-equation', '5 − 2 = ?'));
            const next = actionButton('Count what is left');
            next.disabled = true;
            wrap.appendChild(next);
            container.appendChild(wrap);
            return {
                html: 'Take away two.',
                speak: 'Your turn. Tap the horse two times. Then count what is left.'
            };
        }

        const wrap = scene('Show what you know', 'Take away 1, then tap how many are left.');
        const row = el('div', 'lesson-object-row');
        row.appendChild(tapCounter('🍎', 4));
        const eater = eaterButton('🐴', 'HORSE');
        eater.dataset.lessonEater = '1';
        row.appendChild(eater);
        wrap.appendChild(row);
        wrap.appendChild(el('div', 'lesson-equation', '4 − 1 = ?'));
        const choices = el('div', 'lesson-choices');
        choices.hidden = true;
        choices.append(choice(2, false), choice(3, true), choice(4, false));
        wrap.appendChild(choices);
        container.appendChild(wrap);
        return {
            html: 'What is left?',
            speak: 'Take away one. Count what is left, then tap the answer.'
        };
    },

    onTap(sceneIndex, target, container) {
        if (closestEl(target, '.lesson-next:not(:disabled)')) return { advance: true };
        const eater = /** @type {HTMLButtonElement|null} */ (closestEl(target, '[data-lesson-eater]'));
        if (eater) {
            const group = container.querySelector('.tap-counter');
            const eaten = eatOne(group);
            const goal = Number(eater.dataset.lessonEater);
            speak(String(eaten), { interrupt: true });
            if (eaten >= goal) {
                eater.disabled = true;
            const next = /** @type {HTMLButtonElement|null} */ (container.querySelector('.lesson-next'));
                if (next) next.disabled = false;
                const choices = /** @type {HTMLElement|null} */ (container.querySelector('.lesson-choices'));
                if (choices) choices.hidden = false;
            }
            return {};
        }
        const picked = closestEl(target, '.lesson-choice');
        if (picked) {
            if (picked.dataset.correct === 'true') return { advance: true };
            picked.classList.add('try-again');
            speak('Try counting the apples that are still here.', { interrupt: true });
        }
        return {};
    }
};

/** @type {LessonDefinition} */
const placeValueAdditionIntro = {
    id: 'placeValueAdditionIntro',
    path: 'bigAddition',
    title: 'Big Addition',
    sceneCount: 3,

    render(sceneIndex, container) {
        container.textContent = '';
        if (sceneIndex === 0) {
            const wrap = scene('Tens and ones', 'Two tens and four ones make 24.');
            wrap.appendChild(baseTenBlocks(2, 4));
            wrap.appendChild(el('div', 'lesson-equation', '20 + 4 = 24'));
            wrap.appendChild(actionButton('I see it!'));
            container.appendChild(wrap);
            return {
                html: 'A ten rod is worth ten ones.',
                speak: 'Each green rod is one ten. Two tens and four ones make twenty four.'
            };
        }

        if (sceneIndex === 1) {
            const wrap = scene('Put the parts together', 'Add the tens, then add the ones.');
            const groups = el('div', 'lesson-block-groups');
            groups.appendChild(baseTenBlocks(2, 1));
            groups.appendChild(el('div', 'lesson-plus', '+'));
            groups.appendChild(baseTenBlocks(1, 3));
            wrap.appendChild(groups);
            wrap.appendChild(el('div', 'lesson-equation', '21 + 13 = ?'));
            const combine = actionButton('Put them together', 'lesson-combine');
            wrap.appendChild(combine);
            container.appendChild(wrap);
            return {
                html: 'Add tens to tens and ones to ones.',
                speak: 'Twenty one plus thirteen. Put the tens together, then put the ones together.'
            };
        }

        const wrap = scene('Show what you know', 'Use the blocks, then tap the sum.');
        const groups = el('div', 'lesson-block-groups');
        groups.appendChild(baseTenBlocks(2, 1));
        groups.appendChild(el('div', 'lesson-plus', '+'));
        groups.appendChild(baseTenBlocks(1, 3));
        wrap.appendChild(groups);
        wrap.appendChild(el('div', 'lesson-equation', '21 + 13 = ?'));
        const choices = el('div', 'lesson-choices');
        choices.append(choice(33, false), choice(34, true), choice(44, false));
        wrap.appendChild(choices);
        container.appendChild(wrap);
        return {
            html: 'How many altogether?',
            speak: 'Twenty one plus thirteen. How many altogether?'
        };
    },

    onTap(sceneIndex, target, container) {
        if (closestEl(target, '.lesson-next')) return { advance: true };
        if (closestEl(target, '.lesson-combine')) {
            const groups = /** @type {HTMLElement} */ (container.querySelector('.lesson-block-groups'));
            groups.textContent = '';
            groups.appendChild(baseTenBlocks(3, 4));
            const equation = /** @type {HTMLElement} */ (container.querySelector('.lesson-equation'));
            equation.textContent = '21 + 13 = 34';
            const button = closestEl(target, '.lesson-combine');
            button.textContent = 'Now I see 34!';
            button.className = 'lesson-action lesson-next';
            speak('Three tens and four ones make thirty four.', { interrupt: true });
            return {};
        }
        const picked = closestEl(target, '.lesson-choice');
        if (picked) {
            if (picked.dataset.correct === 'true') return { advance: true };
            picked.classList.add('try-again');
            speak('Count the tens, then count the ones.', { interrupt: true });
        }
        return {};
    }
};

export const lessons = {
    subtractionIntro,
    placeValueAdditionIntro
};
