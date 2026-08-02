import { playKeyTone, playWrongSound } from '../audio.js';
import { celebrate, setScoreVisible, setScoreMode, randomBackground, createBubble } from '../effects.js';
import { speak, cancelSpeech } from '../speech.js';
import { getSetting, onSettingChange } from '../settings.js';
import { generateProblem, rand } from '../math/problems.js';
import {
    currentRung, advance, emptyProgress, loadProgress, saveProgress,
    skillsForSetting, stageOf, labelOf, STREAK_TO_ADVANCE
} from '../math/ladder.js';
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

/* ---------- Progression ----------
 *
 * Progress is persisted rather than session-scoped. A toddler bounces out to
 * Free Play and back constantly; resetting them each time made auto mode feel
 * like it punished exploring. The streak toward the next rung survives too, so a
 * mode switch never costs work already done.
 *
 * Advancement needs a streak of correct answers *in a row*, so guessing can't
 * climb the ladder. A wrong answer resets the streak but never drops a rung —
 * failing backwards reads as punishment at this age.
 */

/** @type {import('../types.js').LabProgress} */
let progress = emptyProgress();

function isAutoLevel() {
    const setting = getSetting('mathLabLevel');
    return !setting || setting === 'auto';
}

/**
 * Which skill to ask about next. On auto that's the child's current rung for
 * the active method; pinned to a stage, it's any skill from that stage, so a
 * parent parking a child on "Counting" still gets variety.
 */
function nextSkill(methodId) {
    if (isAutoLevel()) return currentRung(progress, methodId).skill;
    const pool = skillsForSetting(String(getSetting('mathLabLevel')));
    return pool[rand(0, pool.length - 1)];
}

// Returns the rung just unlocked, or null if this answer didn't unlock one.
function recordCorrect(methodId) {
    correctThisSession++;
    if (!isAutoLevel()) return null;

    progress.streak++;
    if (progress.streak < STREAK_TO_ADVANCE) {
        saveProgress(progress);
        return null;
    }
    const { rung } = advance(progress, methodId);
    saveProgress(progress);
    return rung;
}

function recordWrong() {
    if (!isAutoLevel() || progress.streak === 0) return;
    progress.streak = 0;
    saveProgress(progress);
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

function newProblem() {
    hintToken++;
    method = resolveMethod();
    problem = generateProblem(nextSkill(method.id));
    steps = method.steps(problem);
    stepIndex = 0;
    buffer = '';
    wrongAttempts = 0;
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

    // Unlocking a new rung is the bigger news, so it takes the follow-up line
    // if both it and the method's celebration land on the same answer.
    const unlocked = recordCorrect(method.id);
    const unlockedLabel = unlocked && labelOf(unlocked.skill);
    const extra = unlockedLabel
        ? `New challenge! ${unlockedLabel}.`
        : (method.celebrationText && method.celebrationText(problem));
    promptEl.textContent = unlockedLabel ? `New: ${unlockedLabel} 🎉` : '';

    const token = hintToken;
    if (extra) setTimeout(() => token === hintToken && speak(extra), 1400);
    setTimeout(() => token === hintToken && newProblem(), extra ? 3400 : 1800);
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
    recordWrong();
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
    if (wrongAttempts >= 2) showHint();
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
    if (locked || !problem) return;
    const target = closestEl(e.target, 'button');
    if (!target || target === speakBtn) return;
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
window.addEventListener('lls-mathlab-progress-reset', () => {
    progress = loadProgress();
    if (container.classList.contains('active')) newProblem();
});

/** @type {Mode} */
export const mathLabMode = {
    id: 'mathlab',
    label: 'Math Lab',
    icon: '🧮',
    beta: true,
    oskLayout: 'numpad',
    // Not "type the answer": one rung is answered by building it and tapping ✓.
    instructions: 'Tap to work it out, then answer! 🧪',

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
