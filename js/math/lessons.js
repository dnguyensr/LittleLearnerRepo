import { speak } from '../speech.js';
import { closestEl } from '../dom.js';
import { el, tapCounter, eaterButton, eatOne, baseTenBlocks } from './manipulatives.js';
import { comparisonPair } from './comparison.js';

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

function talkTogether(prompt) {
    const wrap = el('div', 'lesson-talk-wrap');
    const button = actionButton('💬 Talk together', 'lesson-talk');
    button.setAttribute('aria-expanded', 'false');
    const text = el('div', 'lesson-talk-prompt', prompt);
    text.hidden = true;
    button.addEventListener('click', () => {
        text.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        speak(prompt, { interrupt: true });
    });
    wrap.append(button, text);
    return wrap;
}

function comparisonChoices(left, right, correctValue) {
    const board = el('div', 'comparison-board');
    const pair = comparisonPair('🍎', 'apple', 'apples', left, right, { interactive: true });
    for (const group of pair.querySelectorAll('[data-compare-value]')) {
        group.dataset.lessonCompare = 'true';
        group.dataset.correct = String(Number(group.dataset.compareValue) === correctValue);
    }
    board.appendChild(pair);
    const same = actionButton('= Same number', 'comparison-same');
    same.dataset.lessonCompare = 'true';
    same.dataset.compareValue = '0';
    same.dataset.correct = String(correctValue === 0);
    board.appendChild(same);
    return board;
}

/** @type {LessonDefinition} */
const comparisonIntro = {
    id: 'comparisonIntro',
    skill: 'compareSets5',
    title: 'Compare Groups',
    sceneCount: 3,

    render(sceneIndex, container) {
        container.textContent = '';
        if (sceneIndex === 0) {
            const wrap = scene('Line up the groups', 'Each box in one row matches a box in the other row.');
            wrap.appendChild(comparisonPair('🍎', 'apple', 'apples', 2, 4));
            wrap.appendChild(el('div', 'lesson-equation', '2 is fewer than 4'));
            wrap.appendChild(actionButton('I see it!'));
            container.appendChild(wrap);
            return {
                html: 'Four is more than two. Two is fewer than four.',
                speak: 'Line up the groups. Four apples is more than two apples. Two is fewer than four.'
            };
        }

        if (sceneIndex === 1) {
            const wrap = scene('You compare', 'Tap the group that has more.');
            wrap.appendChild(comparisonChoices(2, 3, 2));
            container.appendChild(wrap);
            return {
                html: 'Which group has more?',
                speak: 'Your turn. Which group has more? Tap that group.'
            };
        }

        const wrap = scene('Show what you know', 'These groups might match.');
        wrap.appendChild(comparisonChoices(3, 3, 0));
        wrap.appendChild(talkTogether('How do you know the two groups have the same number?'));
        container.appendChild(wrap);
        return {
            html: 'Which group has fewer, or are they the same?',
            speak: 'Which group has fewer, or do both groups have the same number?'
        };
    },

    onTap(sceneIndex, target) {
        if (closestEl(target, '.lesson-next')) return { advance: true };
        const picked = closestEl(target, '[data-lesson-compare]');
        if (!picked) return {};
        if (picked.dataset.correct === 'true') return { advance: true };
        picked.classList.add('try-again');
        speak(sceneIndex === 1
            ? 'Match the boxes in the two rows. Which row has an apple left over?'
            : 'Count each row. Do they have the same number?', { interrupt: true });
        return {};
    }
};

/** @type {LessonDefinition} */
const additionIntro = {
    id: 'additionIntro',
    skill: 'addWithin5',
    title: 'Put Groups Together',
    sceneCount: 3,

    render(sceneIndex, container) {
        container.textContent = '';
        if (sceneIndex === 0) {
            const wrap = scene('Watch one join', 'We start with 2 apples. One more joins the group.');
            const groups = el('div', 'lesson-object-row');
            groups.appendChild(tapCounter('🍎', 2, { tappable: false }));
            groups.appendChild(el('div', 'lesson-plus', '+'));
            groups.appendChild(tapCounter('🍎', 1, { tappable: false }));
            wrap.appendChild(groups);
            wrap.appendChild(el('div', 'lesson-equation', '2 + 1 = 3'));
            wrap.appendChild(actionButton('I see it!'));
            container.appendChild(wrap);
            return {
                html: 'Addition puts parts together to make a whole.',
                speak: 'Addition puts parts together to make a whole. Two apples and one more apple make three apples altogether.'
            };
        }

        if (sceneIndex === 1) {
            const wrap = scene('You put them together', 'Start with 2 apples. Tap to add 1 more.');
            const group = tapCounter('🍎', 2, { tappable: false });
            group.dataset.lessonAddGroup = 'true';
            wrap.appendChild(group);
            wrap.appendChild(el('div', 'lesson-equation', '2 + 1 = ?'));
            const add = actionButton('Add 1 apple', 'lesson-add-one');
            wrap.appendChild(add);
            container.appendChild(wrap);
            return {
                html: 'Add one more to the group.',
                speak: 'Your turn. Start with two apples. Tap to add one more apple.'
            };
        }

        const wrap = scene('Show what you know', 'Put 3 apples and 1 apple together.');
        const groups = el('div', 'lesson-object-row');
        groups.appendChild(tapCounter('🍎', 3, { tappable: false }));
        groups.appendChild(el('div', 'lesson-plus', '+'));
        groups.appendChild(tapCounter('🍎', 1, { tappable: false }));
        wrap.appendChild(groups);
        wrap.appendChild(el('div', 'lesson-equation', '3 + 1 = ?'));
        const choices = el('div', 'lesson-choices');
        choices.append(choice(3, false), choice(4, true), choice(5, false));
        wrap.appendChild(choices);
        wrap.appendChild(talkTogether('Can you show four another way using two parts?'));
        container.appendChild(wrap);
        return {
            html: 'How many altogether?',
            speak: 'Three apples and one more apple. How many apples altogether?'
        };
    },

    onTap(sceneIndex, target, container) {
        if (closestEl(target, '.lesson-next')) return { advance: true };
        const add = closestEl(target, '.lesson-add-one');
        if (add) {
            const group = /** @type {HTMLElement} */ (container.querySelector('[data-lesson-add-group]'));
            group.replaceWith(tapCounter('🍎', 3, { tappable: false }));
            const equation = /** @type {HTMLElement} */ (container.querySelector('.lesson-equation'));
            equation.textContent = '2 + 1 = 3';
            add.textContent = 'Now I see 3!';
            add.className = 'lesson-action lesson-next';
            speak('Two and one more make three altogether.', { interrupt: true });
            return {};
        }
        const picked = closestEl(target, '.lesson-choice');
        if (picked) {
            if (picked.dataset.correct === 'true') return { advance: true };
            picked.classList.add('try-again');
            speak('Count both parts together.', { interrupt: true });
        }
        return {};
    }
};

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
        wrap.appendChild(talkTogether('Can you show the whole group, the part that left, and the part that stayed?'));
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
        wrap.appendChild(talkTogether('How do the tens and ones blocks show thirty four?'));
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
    comparisonIntro,
    additionIntro,
    subtractionIntro,
    placeValueAdditionIntro
};
