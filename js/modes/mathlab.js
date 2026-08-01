import { playKeyTone, playWrongSound } from '../audio.js';
import { celebrate, setScoreVisible, setScoreMode, randomBackground, createBubble } from '../effects.js';
import { speak, cancelSpeech } from '../speech.js';
import { getSetting, onSettingChange } from '../settings.js';
import { generateProblem, clampLevel, MAX_LEVEL, PROBLEMS_PER_LEVEL } from '../math/problems.js';
import { handleCounterTap } from '../math/manipulatives.js';
import { closestEl } from '../dom.js';
import { classicalMethod } from '../math/classical.js';
import { commonCoreMethod } from '../math/common-core.js';
import { singaporeMethod } from '../math/singapore.js';

/** @typedef {import('../types.js').Problem} Problem */
/** @typedef {import('../types.js').MathMethod} MathMethod */
/** @typedef {import('../types.js').AnswerStep} AnswerStep */
/** @typedef {import('../types.js').Mode} Mode */

// Math Lab (beta): the same problems as Math, worked through a selectable
// teaching method. The shell owns problem flow, answer entry and scoring; the
// method owns everything the child sees and touches.

const container = document.getElementById('mathlab-container');
const questionEl = document.getElementById('mathlab-question');
const workspaceEl = document.getElementById('mathlab-workspace');
const answerDisplay = document.getElementById('mathlab-answer-display');
const promptEl = document.getElementById('mathlab-prompt');
const speakBtn = document.getElementById('mathlab-speak-btn');

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
let method = classicalMethod;
/** @type {AnswerStep[]} */
let steps = [];
let stepIndex = 0;
let buffer = '';
let wrongAttempts = 0;
let correctThisSession = 0;
let hintToken = 0;
let locked = false;
let mixIndex = 0;

/* ---------- Auto-progression ----------
 *
 * Level progress is persisted rather than session-scoped. A toddler bounces out
 * to Free Play and back constantly; demoting them to level 1 every time made
 * auto mode feel like it was punishing them for exploring. The streak toward the
 * next level survives too, so a mode switch never costs work already done.
 */

const PROGRESS_KEY = 'lls-mathlab-progress';

function loadProgress() {
    try {
        const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
        return {
            level: clampLevel(Number(saved.level) || 1),
            streak: Math.max(0, Number(saved.streak) || 0)
        };
    } catch (err) {
        return { level: 1, streak: 0 };
    }
}

let progress = loadProgress();

function saveProgress() {
    try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (err) { /* private mode etc. */ }
}

function isAutoLevel() {
    const setting = getSetting('mathLabLevel');
    return !setting || setting === 'auto';
}

function currentLevel() {
    return isAutoLevel() ? progress.level : clampLevel(Number(getSetting('mathLabLevel')));
}

// Returns the level just reached, or 0 if this answer didn't earn one.
function recordCorrect() {
    correctThisSession++;
    if (!isAutoLevel()) return 0;

    progress.streak++;
    if (progress.streak < PROBLEMS_PER_LEVEL || progress.level >= MAX_LEVEL) {
        saveProgress();
        return 0;
    }
    progress.level++;
    progress.streak = 0;
    saveProgress();
    return progress.level;
}

// `mix` rotates rather than picking at random, so every method gets equal time
// and the same one never lands twice in a row.
function resolveMethod() {
    const setting = getSetting('mathMethod');
    if (setting === 'mix') {
        const available = Object.values(methods);
        return available[mixIndex++ % available.length];
    }
    return methods[setting] || classicalMethod;
}

function currentStep() {
    return steps[stepIndex];
}

function slotFor(stepId) {
    return workspaceEl.querySelector(`[data-slot="${stepId}"]`);
}

// When the manipulative has a slot for this step, the answer belongs in the
// notation itself — showing it twice just pushes the workspace off a phone.
function updateDisplays() {
    const step = currentStep();
    const slot = step && slotFor(step.id);
    if (slot) slot.textContent = buffer || '?';
    answerDisplay.textContent = buffer || '?';
    answerDisplay.hidden = !!slot;
}

function newProblem() {
    hintToken++;
    method = resolveMethod();
    problem = generateProblem(currentLevel());
    steps = method.steps(problem);
    stepIndex = 0;
    buffer = '';
    wrongAttempts = 0;
    locked = false;

    // render first: a method's question may depend on which variant it drew.
    // data-variant is cleared rather than overwritten: classical doesn't set
    // one, so under `mix` a stale value would otherwise survive the switch.
    workspaceEl.dataset.method = method.id;
    workspaceEl.dataset.level = String(problem.level);
    delete workspaceEl.dataset.variant;
    method.render(problem, workspaceEl, { correct: correctThisSession });
    question = method.question
        ? method.question(problem, workspaceEl)
        : { html: problem.questionText, speak: problem.speakText };

    questionEl.innerHTML = question.html;
    promptEl.textContent = steps.length > 1 ? 'Ones first!' : '';
    answerDisplay.style.color = 'white';
    updateDisplays();

    speak(question.speak, { interrupt: true });
}

function showHint() {
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
    promptEl.textContent = next ? 'Now the tens!' : '';
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

    // A level-up is the bigger news, so it takes the follow-up line if both
    // it and the method's celebration land on the same answer.
    const newLevel = recordCorrect();
    const extra = newLevel
        ? `Level ${newLevel}! You are getting so good at this!`
        : (method.celebrationText && method.celebrationText(problem));
    promptEl.textContent = newLevel ? `Level ${newLevel}! 🎉` : '';

    const token = hintToken;
    if (extra) setTimeout(() => token === hintToken && speak(extra), 1400);
    setTimeout(() => token === hintToken && newProblem(), extra ? 3400 : 1800);
}

function submitAnswer() {
    if (buffer === '' || locked) return;
    const step = currentStep();

    if (Number(buffer) === step.expect) {
        if (stepIndex === steps.length - 1) {
            finish();
        } else {
            advanceStep();
        }
        return;
    }

    wrongAttempts++;
    answerDisplay.style.color = '#ff6b6b';
    playWrongSound();
    setTimeout(() => {
        if (locked) return;
        buffer = '';
        updateDisplays();
        answerDisplay.style.color = 'white';
    }, 800);
    if (wrongAttempts >= 2) showHint();
}

container.addEventListener('pointerdown', e => {
    if (locked || !problem) return;
    const target = closestEl(e.target, 'button');
    if (!target || target === speakBtn) return;
    handleCounterTap(target);
    if (method.onTap) method.onTap(target, problem, workspaceEl);
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

/** @type {Mode} */
export const mathLabMode = {
    id: 'mathlab',
    label: 'Math Lab',
    icon: '🧮',
    beta: true,
    oskLayout: 'numpad',
    instructions: 'Tap to work it out, then type the answer and press ✓! 🧪',

    activate() {
        container.classList.add('active');
        setScoreMode('mathlab');
        setScoreVisible(true);
        // Session state (the CPA rotation, the mix rotation) restarts; level
        // progress is persisted and deliberately does not.
        correctThisSession = 0;
        mixIndex = 0;
        progress = loadProgress();
        newProblem();
    },

    deactivate() {
        container.classList.remove('active');
        hintToken++;
        locked = true;
        cancelSpeech();
    },

    onKey(key) {
        if (locked) return;
        const step = currentStep();
        if (!step) return;

        if (/^[0-9]$/.test(key)) {
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
        } else if (key === 'Backspace') {
            buffer = buffer.slice(0, -1);
            updateDisplays();
        } else if (key === 'Enter') {
            submitAnswer();
        }
    }
};
