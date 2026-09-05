import { playKeyTone, playWrongSound } from '../audio.js';
import { celebrate, setScoreVisible, setScoreMode, randomBackground, createBubble } from '../effects.js';
import { speak, cancelSpeech } from '../speech.js';
import { getSetting, onSettingChange } from '../settings.js';
import { generateProblem, rand } from '../math/problems.js';
import {
    emptyProgress, loadProgress, saveProgress, skillsForSetting, stageOf, labelOf,
    currentSkillForProgress, recordSkillResult, practicePool, isForkUnlocked,
    selectPath, LESSON_FOR_PATH, lessonState, startLesson, advanceLesson
} from '../math/ladder.js';
import { lessons } from '../math/lessons.js';
import { handleCounterTap } from '../math/manipulatives.js';
import { closestEl } from '../dom.js';
import { classicalMethod } from '../math/classical.js';
import { commonCoreMethod } from '../math/common-core.js';
import { singaporeMethod } from '../math/singapore.js';

/** @typedef {import('../types.js').Problem} Problem */
/** @typedef {import('../types.js').MathMethod} MathMethod */
/** @typedef {import('../types.js').AnswerStep} AnswerStep */
/** @typedef {import('../types.js').Mode} Mode */

// Math Lab: the app's math mode, worked through a selectable teaching method.
// The shell owns problem flow, answer entry and scoring; the method owns
// everything the child sees and touches. It replaced the original Math mode
// (js/modes/math.js, now unregistered) after testing on a real device.

const container = document.getElementById('mathlab-container');
const questionEl = document.getElementById('mathlab-question');
const workspaceEl = document.getElementById('mathlab-workspace');
const answerDisplay = document.getElementById('mathlab-answer-display');
const promptEl = document.getElementById('mathlab-prompt');
const speakBtn = document.getElementById('mathlab-speak-btn');
const pathsBtn = document.getElementById('mathlab-paths-btn');

/** @type {Record<string, MathMethod>} */
const methods = {
    classical: classicalMethod,
    commoncore: commonCoreMethod,
    singapore: singaporeMethod
};

/** @type {Problem|null} */
let problem = null;
/** @type {import('../types.js').Question|null} */
let question = null;
/** @type {MathMethod} */
let method = singaporeMethod;
/** @type {AnswerStep[]} */
let steps = [];
let stepIndex = 0;
let buffer = '';
let wrongAttempts = 0;
let correctThisSession = 0;
let hintToken = 0;
let locked = false;
let mixIndex = 0;
let problemHadWrong = false;
let hintUsed = false;
let view = 'problem';
let activeLessonId = null;

/* ---------- Progression ----------
 *
 * Readiness is per skill and persists across sessions. Five independent
 * outcomes in a six-problem window master a skill; assistance still earns a
 * celebration but cannot silently push a child into a new concept.
 */

/** @type {import('../types.js').LabProgress} */
let progress = emptyProgress();

function isAutoLevel() {
    const setting = getSetting('mathLabLevel');
    return !setting || setting === 'auto';
}

/**
 * Which skill to ask next. Auto follows the foundation or selected child path;
 * a parent-pinned stage still draws from its own practice pool.
 */
function nextSkill() {
    if (isAutoLevel()) {
        if (progress.selectedPath === 'additionPractice') {
            const pool = practicePool(progress);
            return pool[rand(0, pool.length - 1)];
        }
        return currentSkillForProgress(progress);
    }
    const pool = skillsForSetting(String(getSetting('mathLabLevel')));
    return pool[rand(0, pool.length - 1)];
}

// `mix` rotates rather than picking at random, so every method gets equal time
// and the same one never lands twice in a row.
function resolveMethod() {
    const setting = getSetting('mathMethod');
    if (setting === 'mix') {
        const available = Object.values(methods);
        return available[mixIndex++ % available.length];
    }
    return methods[setting] || singaporeMethod;
}

function currentStep() {
    return steps[stepIndex];
}

function slotFor(stepId) {
    return workspaceEl.querySelector(`[data-slot="${stepId}"]`);
}

/**
 * What the child has answered so far. Usually the typed buffer — but a `taps`
 * step keeps its answer in the manipulative, so it is read back out of the DOM
 * every time rather than mirrored into the buffer. That way a hint that fills
 * the widget in for them counts as an answer too.
 */
function currentValue() {
    const step = currentStep();
    if (!step || !step.taps) return buffer;
    const value = method.readAnswer ? method.readAnswer(workspaceEl, problem) : null;
    return value === null || value === undefined ? '' : String(value);
}

// When the manipulative has a slot for this step, the answer belongs in the
// notation itself — showing it twice just pushes the workspace off a phone.
function updateDisplays() {
    const step = currentStep();
    const slot = step && slotFor(step.id);
    if (slot) slot.textContent = buffer || '?';
    answerDisplay.textContent = buffer || '?';
    // A tapped answer is already on screen as counters. Echoing it as a numeral
    // would turn "show me 7" into matching one numeral against another, which
    // is the counting the rung exists to make them do.
    answerDisplay.hidden = !!slot || !!(step && step.taps);
}

function updatePathsButton() {
    pathsBtn.hidden = !isAutoLevel() || !isForkUnlocked(progress) || view === 'chooser';
}

function showPathChooser() {
    hintToken++;
    view = 'chooser';
    activeLessonId = null;
    problem = null;
    question = {
        html: 'What would you like to do?',
        speak: 'Choose a math path. Keep adding, learn take away, or try big addition.'
    };
    locked = false;
    workspaceEl.textContent = '';
    workspaceEl.dataset.view = 'chooser';
    delete workspaceEl.dataset.skill;
    delete workspaceEl.dataset.stage;
    const chooser = document.createElement('div');
    chooser.className = 'math-path-chooser';
    const cards = [
        ['additionPractice', '➕', 'Keep Adding', 'More addition to ten'],
        ['subtraction', '🍎', 'Learn Take Away', 'Make a group smaller'],
        ['bigAddition', '🔟', 'Big Addition', 'Tens and ones']
    ];
    for (const [id, icon, title, subtitle] of cards) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'math-path-card';
        button.dataset.path = id;
        button.innerHTML = `<span class="path-icon">${icon}</span><strong>${title}</strong><small>${subtitle}</small>`;
        button.setAttribute('aria-label', `${title}. ${subtitle}.`);
        chooser.appendChild(button);
    }
    workspaceEl.appendChild(chooser);
    questionEl.innerHTML = question.html;
    promptEl.textContent = 'Tap a picture to choose';
    answerDisplay.hidden = true;
    pathsBtn.hidden = true;
    speak(question.speak, { interrupt: true });
}

function renderLesson() {
    const definition = lessons[activeLessonId];
    if (!definition) {
        activeLessonId = null;
        newProblem();
        return;
    }
    view = 'lesson';
    locked = false;
    const state = lessonState(progress, definition.id);
    workspaceEl.dataset.view = 'lesson';
    workspaceEl.dataset.lesson = definition.id;
    delete workspaceEl.dataset.skill;
    delete workspaceEl.dataset.stage;
    question = definition.render(Math.min(state.scene, definition.sceneCount - 1), workspaceEl);
    questionEl.innerHTML = question.html;
    promptEl.textContent = `Step ${Math.min(state.scene + 1, definition.sceneCount)} of ${definition.sceneCount}`;
    answerDisplay.hidden = true;
    updatePathsButton();
    speak(question.speak, { interrupt: true });
}

function beginLesson(lessonId, { replay = false } = {}) {
    activeLessonId = lessonId;
    startLesson(progress, lessonId, { replay });
    saveProgress(progress);
    renderLesson();
}

function choosePath(pathId) {
    selectPath(progress, pathId);
    saveProgress(progress);
    const lessonId = LESSON_FOR_PATH[pathId];
    if (lessonId && lessonState(progress, lessonId).status !== 'complete') {
        beginLesson(lessonId);
        return;
    }
    newProblem();
}

function newProblem() {
    hintToken++;
    view = 'problem';
    activeLessonId = null;
    delete workspaceEl.dataset.lesson;
    delete workspaceEl.dataset.view;
    const skillId = nextSkill();
    if (!skillId) {
        showPathChooser();
        return;
    }
    method = resolveMethod();
    problem = generateProblem(skillId);
    steps = method.steps(problem);
    stepIndex = 0;
    buffer = '';
    wrongAttempts = 0;
    problemHadWrong = false;
    hintUsed = false;
    locked = false;

    // render first: a method's question may depend on which variant it drew.
    // data-variant is cleared rather than overwritten: classical doesn't set
    // one, so under `mix` a stale value would otherwise survive the switch.
    workspaceEl.dataset.method = method.id;
    workspaceEl.dataset.skill = problem.skill;
    workspaceEl.dataset.stage = stageOf(problem.skill);
    delete workspaceEl.dataset.variant;
    // Cleared here as well as on the timer below: switching problems mid-flash
    // cancels that timer, and a stuck class would kill the next shake.
    workspaceEl.classList.remove('wrong');
    method.render(problem, workspaceEl, { correct: correctThisSession });
    question = method.question
        ? method.question(problem, workspaceEl)
        : { html: problem.questionText, speak: problem.speakText };

    questionEl.innerHTML = question.html;
    // Only the column algorithm still needs ✓, so only it says so.
    promptEl.textContent = steps.length > 1 ? 'Ones first, then ✓' : '';
    answerDisplay.style.color = 'white';
    updateDisplays();
    updatePathsButton();

    speak(question.speak, { interrupt: true });
}

function showHint() {
    hintUsed = true;
    const token = ++hintToken;
    method.hint(problem, workspaceEl, () => token === hintToken);
}

function markStepDone(step) {
    const slot = slotFor(step.id);
    if (!slot) return false;
    slot.textContent = String(step.expect);
    slot.classList.add('done');
    return true;
}

function advanceStep() {
    const step = currentStep();
    markStepDone(step);

    const pause = method.onStepDone ? method.onStepDone(step, problem, workspaceEl) : 0;
    stepIndex++;
    buffer = '';
    wrongAttempts = 0;

    const token = hintToken;
    const next = currentStep();
    promptEl.textContent = next ? 'Now the tens, then ✓' : '';
    setTimeout(() => {
        if (!next || token !== hintToken) return;
        updateDisplays();
        if (next.speak) speak(next.speak, { interrupt: true });
    }, pause);
}

// Timers outlive their problem when the child switches modes mid-celebration,
// so everything deferred is fenced behind the token newProblem/deactivate bump.
function finish() {
    locked = true;
    celebrate();
    speak(`${problem.answer}! Great job!`, { interrupt: true });

    const step = currentStep();
    if (!markStepDone(step)) {
        answerDisplay.textContent = String(problem.answer);
        answerDisplay.style.color = '#4CAF50';
    }
    // The last step gets onStepDone too, so a method can animate what the
    // answer means (uncovering a bar segment) rather than only what comes next.
    if (method.onStepDone) method.onStepDone(step, problem, workspaceEl);

    correctThisSession++;
    let transition = null;
    if (isAutoLevel()) {
        transition = recordSkillResult(progress, problem.skill, !problemHadWrong && !hintUsed);
        saveProgress(progress);
    }
    const unlockedLabel = transition?.becameMastered && transition.nextSkill
        ? labelOf(transition.nextSkill) : null;
    const extra = transition?.forkReady
        ? 'You are ready to choose your math path!'
        : transition?.pathComplete
            ? 'You finished this path. Choose what comes next!'
            : unlockedLabel
                ? `New challenge! ${unlockedLabel}.`
                : (method.celebrationText && method.celebrationText(problem));
    promptEl.textContent = transition?.forkReady || transition?.pathComplete
        ? 'New paths unlocked! 🎉'
        : unlockedLabel ? `New: ${unlockedLabel} 🎉` : '';

    const token = hintToken;
    if (extra) setTimeout(() => token === hintToken && speak(extra), 1400);
    setTimeout(() => {
        if (token !== hintToken) return;
        if (transition?.forkReady || transition?.pathComplete) showPathChooser();
        else newProblem();
    }, extra ? 3400 : 1800);
}

function submitAnswer() {
    const value = currentValue();
    if (value === '' || locked) return;
    const step = currentStep();

    if (Number(value) === step.expect) {
        if (stepIndex === steps.length - 1) {
            finish();
        } else {
            advanceStep();
        }
        return;
    }

    wrongAttempts++;
    problemHadWrong = true;
    // Locked through the red flash so a fast tapper can't stack up several
    // wrong answers on digits typed before they saw the first one land.
    locked = true;
    answerDisplay.style.color = '#ff6b6b';
    // The red display is nothing to look at when it is hidden — which it is
    // whenever the method owns the answer slot, and on every tapped step — so
    // the workspace shakes too.
    workspaceEl.classList.add('wrong');
    playWrongSound();

    // Fenced on the problem itself rather than hintToken, because showHint()
    // below bumps that token and would cancel this reset — leaving the mode
    // locked forever.
    const flashedOn = problem;
    setTimeout(() => {
        if (problem !== flashedOn) return;
        locked = false;
        buffer = '';
        updateDisplays();
        workspaceEl.classList.remove('wrong');
        answerDisplay.style.color = 'white';
    }, 800);
    if (wrongAttempts >= 2) {
        showHint();
        const lessonId = problem.op === 'sub'
            ? 'subtractionIntro'
            : (problem.twoDigit && problem.op === 'add' ? 'placeValueAdditionIntro' : null);
        if (lessonId) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'learn-together-btn';
            button.dataset.lesson = lessonId;
            button.textContent = '👋 Learn Together';
            promptEl.textContent = '';
            promptEl.appendChild(button);
        }
    }
}

/**
 * Single-step levels judge themselves the moment the digits can only be right
 * or only be wrong, matching Math mode — no ✓ needed.
 *
 * The classical column algorithm is deliberately excluded. Its steps expect one
 * digit each, so auto-judging would commit the very first key pressed, and the
 * `maxLen === 1` overwrite below (tap 3, then tap 7 to replace it) could never
 * fire. That forgiveness matters most exactly where the task is hardest, so the
 * column keeps its ✓ and its extra beat between the ones and the tens.
 */
function judgeIfDecided() {
    if (steps.length > 1) return;
    const expected = String(currentStep().expect);
    if (buffer === expected || !expected.startsWith(buffer)) {
        submitAnswer();
    }
}

container.addEventListener('pointerdown', e => {
    const target = closestEl(e.target, 'button');
    if (!target || target === speakBtn) return;
    if (target === pathsBtn) {
        showPathChooser();
        return;
    }

    const pathCard = closestEl(target, '[data-path]');
    if (pathCard) {
        choosePath(pathCard.dataset.path);
        return;
    }
    const learnTogether = closestEl(target, '[data-lesson]');
    if (learnTogether && learnTogether.classList.contains('learn-together-btn')) {
        beginLesson(learnTogether.dataset.lesson, { replay: true });
        return;
    }
    if (view === 'lesson' && activeLessonId) {
        const definition = lessons[activeLessonId];
        const state = lessonState(progress, activeLessonId);
        const result = definition.onTap(state.scene, target, workspaceEl);
        if (result.advance) {
            const complete = advanceLesson(progress, activeLessonId, definition.sceneCount);
            saveProgress(progress);
            if (complete) {
                speak('Lesson complete! Now let us practise.', { interrupt: true });
                activeLessonId = null;
                setTimeout(newProblem, 900);
            } else {
                renderLesson();
            }
        }
        return;
    }
    if (locked || !problem) return;
    handleCounterTap(target);
    if (method.onTap) method.onTap(target, problem, workspaceEl);
    // The numpad's ✓ still judges, but a child who is working the widget should
    // not have to leave it to find one — so a method can render its own and the
    // shell treats a tap on it as ✓.
    if (closestEl(target, '.lab-check')) submitAnswer();
});

speakBtn.addEventListener('click', () => {
    if (question) speak(question.speak, { interrupt: true });
});

// A parent changing method or level mid-session gets a fresh problem in the
// new shape rather than a stale one.
onSettingChange(key => {
    if (!container.classList.contains('active')) return;
    if (key === 'mathMethod' || key === 'mathLabLevel') newProblem();
});

// The settings panel clears stored progress via ladder.js and announces it
// with this event (importing the mode from settings.js would be a cycle). If
// the child is mid-session behind the panel, re-deal from the bottom rung.
window.addEventListener('edamame-mathlab-progress-reset', () => {
    progress = loadProgress();
    if (container.classList.contains('active')) newProblem();
});

/** @type {Mode} */
export const mathLabMode = {
    // The id stays 'mathlab' even though it now presents as plain "Math": it
    // keys the saved score (edamame-score-mathlab) and the ladder progress, and
    // renaming it would throw away every child's climbing.
    id: 'mathlab',
    label: 'Math',
    icon: '🔢',
    oskLayout: 'numpad',
    // Not "type the answer": one rung is answered by building it and tapping ✓.
    instructions: 'Tap to work it out, then answer! 🔢',

    activate() {
        container.classList.add('active');
        setScoreMode('mathlab');
        setScoreVisible(true);
        // Session state (the CPA rotation, the mix rotation) restarts; level
        // progress is persisted and deliberately does not.
        correctThisSession = 0;
        mixIndex = 0;
        progress = loadProgress();
        const resumableLesson = LESSON_FOR_PATH[progress.selectedPath];
        const shouldResumeLesson = resumableLesson
            && isAutoLevel()
            && lessonState(progress, resumableLesson).status === 'inProgress';
        if (shouldResumeLesson) beginLesson(resumableLesson);
        else newProblem();
    },

    deactivate() {
        container.classList.remove('active');
        hintToken++;
        locked = true;
        view = 'problem';
        cancelSpeech();
    },

    onKey(key) {
        if (locked || view !== 'problem') return;
        const step = currentStep();
        if (!step) return;

        if (/^[0-9]$/.test(key)) {
            // On a tapped step the digits are not an answer — the numeral being
            // asked for is on screen, so typing it back would be copying.
            if (step.taps) return;

            // Single-digit column steps overwrite (no backspace hunt for a
            // toddler); the two-digit total ignores extra taps like Math does.
            const maxLen = step.id === 'total' ? 2 : 1;
            if (buffer.length >= maxLen) {
                if (maxLen > 1) return;
                buffer = '';
            }
            buffer += key;
            playKeyTone(key);
            randomBackground();
            createBubble();
            updateDisplays();
            judgeIfDecided();
        } else if (key === 'Backspace') {
            buffer = buffer.slice(0, -1);
            updateDisplays();
        } else if (key === 'Enter') {
            submitAnswer();
        }
    }
};
