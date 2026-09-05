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
 * @property {'qwerty'|'letters'|'numpad'|null} oskLayout on-screen keyboard:
 *   full board, board without the number row, two-row 1-5/6-0 pad, or null to hide
 * @property {string} instructions             one-line hint under the play area
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
 * @property {'countSet'|'recognizeQuantity'|'buildQuantity'|'numberSequence'|'compareSets'|'combine'|'separate'|'findPart'|'placeValue'} task
 *   semantic goal shared by every presentation lens
 * @property {'count'|'compare'|'add'|'sub'|'missing'} op
 * @property {number} a                  first operand, or the number to count
 * @property {number|null} b             second operand; null when counting or missing-addend
 * @property {number|null} total         for `missing`: the whole in `a + ? = total`
 * @property {number} answer
 * @property {string} [answerText]       spoken instead of an internal numeric answer code
 * @property {'more'|'fewer'} [comparisonWord]
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
 * Persisted readiness graph. Skill history, path choice, and lesson position
 * all survive mode switches and reloads.
 *
 * @typedef {object} LabProgress
 * @property {2} version
 * @property {null|'additionPractice'|'subtraction'|'bigAddition'} selectedPath
 * @property {string} currentSkill
 * @property {Record<string, {
 *   recentIndependent: boolean[], mastered: boolean, readyAt?: number|null,
 *   readySession?: string|null, confirmed?: boolean, confirmedAt?: number|null,
 *   lastConfirmationSession?: string|null
 * }>} skills
 * @property {Record<string, {status: 'unseen'|'inProgress'|'complete', scene: number}>} lessons
 */

/**
 * One stage of answer entry. Most skills have a single `total` step; the
 * traditional column algorithm splits two-digit work into `ones` then `tens`, matched
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
 * A short, inline, tap-first guided lesson.
 *
 * @typedef {object} LessonDefinition
 * @property {string} id
 * @property {'subtraction'|'bigAddition'} [path]
 * @property {string} [skill]
 * @property {string} title
 * @property {number} sceneCount
 * @property {(scene: number, container: HTMLElement) => Question} render
 * @property {(scene: number, target: HTMLElement, container: HTMLElement) => {advance?: boolean}} onTap
 */

/**
 * Parent-facing settings, persisted as one JSON blob in localStorage.
 *
 * @typedef {object} Settings
 * @property {boolean} speech
 * @property {boolean} phonics
 * @property {'auto'|'1'|'2'|'3'|'4'} mathTier
 * @property {'classical'|'commoncore'|'singapore'|'mix'} mathMethod
 * @property {'auto'|'1'|'2'|'3'|'4'} mathLabLevel
 * @property {'auto'|'ab'|'aab'|'abb'|'abc'} patternStage
 * @property {'auto'|'watch'|'tap'} numbersCounting  who performs the count in Numbers:
 *   model once then hand over, always model, or always child-led
 * @property {'auto'|'firstSoundsContinuous'|'firstSoundsStops'|'finalSounds'|'segmentSounds'|'missingLetter'|'continuousCvc'|'shortVowelCvc'|'wordChains'|'blends'|'digraphs'|'silentE'|'vowelTeams'|'wordParts'|'wordStars'} wordStage
 */

/**
 * One sound-to-print relationship inside a regular word definition.
 * `sequence` is what a physical keyboard must type for the displayed tile;
 * it differs for authored tiles such as A…E.
 *
 * @typedef {object} WordPhoneme
 * @property {string} id
 * @property {string} grapheme
 * @property {string} sequence
 * @property {string} cue
 * @property {string} [audio] relative path to a locally bundled reviewed clip
 */

/**
 * Authored word curriculum entry. Sound boxes follow `phonemes`, never the
 * character count of `word`. Irregular Word Stars instead reconstruct the
 * explicit `spelling` array after direct teaching.
 *
 * @typedef {object} WordDefinition
 * @property {string} id
 * @property {string} word
 * @property {string} label
 * @property {string} emoji
 * @property {string} pattern
 * @property {WordPhoneme[]} phonemes
 * @property {string[]} skills
 * @property {string[]} [spelling]
 * @property {number[]} [unexpected] spelling indexes to mark as a Word Star part
 * @property {boolean} [irregular]
 * @property {string} [chain]
 */

/**
 * Recoverable in-progress child interaction.
 *
 * @typedef {object} WordsActivityState
 * @property {string} skillId
 * @property {string} wordId
 * @property {string} mode
 * @property {(string|null)[]} placements
 * @property {string[]} tray
 * @property {number[]} fixed indexes authored as already placed and not removable
 * @property {number[]} guided
 * @property {string|null} fromWordId previous word for a one-sound word chain
 * @property {number} misses
 * @property {boolean} hadWrong
 * @property {boolean} hintUsed
 * @property {'active'|'complete'} status
 */

/**
 * Persisted Words readiness, path choice, lessons, and interrupted activity.
 * Historical `edamame-score-words` is deliberately separate and never migrates
 * into mastery.
 *
 * @typedef {object} WordsProgress
 * @property {1} version
 * @property {string} currentSkill
 * @property {'soundBuilding'|'practice'|'patterns'|'wordStars'|null} selectedPath
 * @property {WordsActivityState|null} currentActivity
 * @property {Record<string, {recentIndependent: boolean[], mastered: boolean}>} skills
 * @property {Record<string, {status: 'unseen'|'inProgress'|'complete', scene: number}>} lessons
 */

/**
 * A grown-up-facing observation record for Numbers. It is not a ladder and
 * never reaches the child: Numbers stays score-free. Keys are the digit as a
 * string.
 *
 * @typedef {object} NumbersProgress
 * @property {1} version
 * @property {Record<string, {modeled: boolean, counted: number, conserved: number}>} digits
 */

/**
 * One rung of the Patterns ladder. Difficulty is the structure of the repeating
 * unit, not the length of the row.
 *
 * @typedef {object} PatternDefinition
 * @property {string} id
 * @property {string} label
 * @property {string[]} unit          slot names, e.g. ['a', 'a', 'b']
 * @property {number} distinct        how many different items the unit needs
 * @property {number} repetitions     full repetitions shown before the partial one
 */

/**
 * Persisted Patterns readiness. Uses the same 5-of-6 window as Math and Words
 * so the three modules agree on what "ready" means.
 *
 * @typedef {object} PatternsProgress
 * @property {1} version
 * @property {string} currentType
 * @property {Record<string, {recentIndependent: boolean[], mastered: boolean}>} types
 */

export {};
