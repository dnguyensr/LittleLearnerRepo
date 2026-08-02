// Shared type definitions. This file emits nothing at runtime — it exists so
// `npm run typecheck` (tsc --noEmit over JSDoc) can check the contracts that
// several modules implement independently. Import types with:
//
//     /** @typedef {import('../types.js').MathMethod} MathMethod */

/**
 * A learning mode. js/main.js iterates this shape to build the top bar and
 * route input, so every mode must satisfy it.
 *
 * @typedef {object} Mode
 * @property {string} id                       unique id; also the button id prefix
 * @property {string} label                    top-bar label
 * @property {string} icon                     emoji shown on the button
 * @property {'qwerty'|'numpad'|null} oskLayout on-screen keyboard, null to hide
 * @property {string} instructions             one-line hint under the play area
 * @property {boolean} [beta]                  hidden unless the betaModes setting is on
 * @property {() => void} activate
 * @property {() => void} deactivate
 * @property {(key: string, source?: 'physical'|'onscreen') => void} onKey
 * @property {(key: string) => void} [onKeyUp]
 * @property {(x: number, y: number) => void} [onTap]
 */

/**
 * One of the emoji subjects problems are built from (js/data/math-items.js).
 * The eater fields are only present on food items.
 *
 * @typedef {object} MathItem
 * @property {string} emoji
 * @property {string} name
 * @property {string} singular
 * @property {boolean} isFood
 * @property {string} [eater]
 * @property {string} [eaterName]
 */

/**
 * A problem from js/math/problems.js. Every teaching method renders this same
 * object; methods change how it is represented, never what it asks.
 *
 * Methods should branch on the **shape** flags (`op`, `twoDigit`, `crossesTen`,
 * `regroups`) rather than on `skill`. Shape is what decides which manipulative
 * fits; keying off skill ids means every new rung on the ladder has to be
 * taught to all three methods by hand.
 *
 * @typedef {object} Problem
 * @property {string} skill              skill id from the table in problems.js
 * @property {'count'|'add'|'sub'|'missing'} op
 * @property {number} a                  first operand, or the number to count
 * @property {number|null} b             second operand; null when counting or missing-addend
 * @property {number|null} total         for `missing`: the whole in `a + ? = total`
 * @property {number} answer
 * @property {MathItem} item
 * @property {string|null} equation      horizontal form, or null when counting
 * @property {string} questionText       may contain HTML
 * @property {string} speakText          plain text for speech synthesis
 * @property {boolean} twoDigit          either operand reaches 10
 * @property {boolean} crossesTen        single-digit sum that passes 10 (make-a-ten territory)
 * @property {boolean} regroups          column work needs a carry or a borrow
 */

/**
 * One step on a curriculum's ladder. Spine rungs are shared by all three
 * methods; detour rungs belong to one curriculum and sit just after the spine
 * rung they extend.
 *
 * @typedef {object} LadderRung
 * @property {string} skill
 * @property {'spine'|'detour'} kind
 * @property {number} spineIndex   position in SPINE this rung sits at or after
 */

/**
 * Persisted progression. `spine` is shared across methods so switching
 * curriculum keeps the child's place; `done` records which detours each method
 * has had, since those are per-curriculum.
 *
 * @typedef {object} LabProgress
 * @property {number} spine
 * @property {number} streak                 correct answers in a row on the current rung
 * @property {Record<string, string[]>} done detour skill ids, keyed by method id
 */

/**
 * One stage of answer entry. Levels 1–3 have a single `total` step; the
 * classical column algorithm splits level 4 into `ones` then `tens`, matched
 * to a `[data-slot]` element in the rendered manipulative.
 *
 * @typedef {object} AnswerStep
 * @property {'total'|'ones'|'tens'} id
 * @property {number} expect
 * @property {string|null} speak         spoken when the step becomes active
 * @property {boolean} [taps]            answered by working the manipulative and
 *   tapping ✓, not by typing. The shell reads the answer back through
 *   `MathMethod.readAnswer`, ignores the numpad's digits and hides the answer
 *   display — the counters the child placed already show what they answered.
 */

/**
 * A teaching method. js/modes/mathlab.js owns problem flow, answer entry and
 * scoring; the method owns everything the child sees and touches.
 *
 * @typedef {object} MathMethod
 * @property {string} id
 * @property {string} label
 * @property {(problem: Problem, container: HTMLElement, session: Session) => void} render
 * @property {(problem: Problem) => AnswerStep[]} steps
 * @property {(problem: Problem, container: HTMLElement, stillValid: () => boolean) => void} hint
 * @property {(target: HTMLElement, problem: Problem, container: HTMLElement) => void} [onTap]
 * @property {(container: HTMLElement, problem: Problem) => number|null} [readAnswer]
 *   Required by any method that returns a `taps` step: what the child has built
 *   so far, or null if they have not started. Read fresh on every judgement, so
 *   it must be derived from the DOM rather than remembered.
 * @property {(step: AnswerStep, problem: Problem, container: HTMLElement) => number} [onStepDone]
 *   Called whenever a step is answered correctly, including the last one. The
 *   returned pause (ms) is only honoured between steps. Use it to animate what
 *   the correct answer means — a carry flying to the tens column, a covered bar
 *   segment being revealed.
 * @property {(problem: Problem) => string|null} [celebrationText]
 * @property {(problem: Problem, container: HTMLElement) => Question} [question]
 *   Overrides Problem.questionText/speakText. Called after render, so it can
 *   read whichever variant render chose. Needed because a method may show the
 *   problem in a form the generator's own wording contradicts — a subitizing
 *   flash asks "how many did you see?", not "count the apples".
 */

/**
 * @typedef {object} Question
 * @property {string} html   shown above the manipulative; may contain HTML
 * @property {string} speak  plain text spoken when the problem appears
 */

/**
 * How far into this sitting the child is. Singapore's concrete → pictorial →
 * abstract rotation needs it; the other methods ignore it.
 *
 * @typedef {object} Session
 * @property {number} correct  correct answers so far this session
 */

/**
 * Parent-facing settings, persisted as one JSON blob in localStorage.
 *
 * @typedef {object} Settings
 * @property {boolean} speech
 * @property {boolean} phonics
 * @property {'auto'|'1'|'2'|'3'|'4'} mathTier
 * @property {boolean} betaModes
 * @property {'classical'|'commoncore'|'singapore'|'mix'} mathMethod
 * @property {'auto'|'1'|'2'|'3'|'4'} mathLabLevel
 */

export {};
