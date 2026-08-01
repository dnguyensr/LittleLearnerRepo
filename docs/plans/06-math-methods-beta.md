# P6 — Math Lab (beta): classical, Common Core & Singapore methods

> **Status (2026-07-31):** Phases A and B done. Math Lab ships behind the
> `betaModes` flag with the classical method across all four levels; the JSDoc
> typecheck gate is green and wired into CI. Phase C (Common Core) is next.

Goal: a new **Math Lab 🧪** beta module that teaches the same four skill levels through three selectable teaching methods — classical, Common Core, and Singapore — each with its own *interactive manipulatives* instead of only type-the-answer. The existing Math mode stays untouched; Math Lab is where the new interaction styles incubate.

Scope is deliberately limited to four levels:

1. **Learning to count** (1–10)
2. **Single-digit addition**
3. **Single-digit subtraction**
4. **Double-digit addition & subtraction**

Design principles (on top of the repo-wide toddler rules):

- **Tap, don't drag.** Every manipulative is tap-to-act (tap a counter to place it, tap a number-line spot to hop there). Drag targets are too hard for small fingers and drag isn't in the input layer today.
- **Manipulate first, type to confirm.** The interactive widget builds understanding; the numpad OSK + ✓ remains the final answer step, same muscle memory as existing Math.
- **Same problem, different lens.** One shared problem generator per level; each method only changes how the problem is *represented and worked*, so methods stay comparable and the child can switch without losing progress.
- **GitHub Pages compatible, always.** Plain ES modules with relative paths, DOM + CSS manipulatives (no canvas, no external libraries, no CDN), all state in `localStorage`, speech/audio via built-in browser APIs. No build step, no backend, no separate hosted app — deploys exactly like the rest of the site: push to `main`.

## Beta gating

- [x] `betaModes` setting (default **off**) in the parent settings panel: "Show beta modes".
- [x] Beta modes render their top-bar button with a small 🧪 badge and are hidden entirely unless `betaModes` is on. Turning the flag off while a beta mode is active drops back to Free Play.
- [ ] Graduation path: when a method/level combo is stable, it can fold into the main Math mode and come off the beta flag.

## Settings

- [x] `mathMethod`: `classical` | `commoncore` | `singapore` | `mix` (mix rotates methods per problem). Parent-facing dropdown; the three unbuilt options are rendered `disabled` with a "(soon)" label rather than silently falling back, so the panel never lies about what it will do. Un-disable them as Phases C/D/E land.
- [x] `mathLabLevel`: `auto` | `1`–`4`, mirroring the existing `mathTier` pattern (auto advances a level every 5 correct in a session).
- [x] Changing either setting mid-session regenerates the problem in the new shape (`onSettingChange` in `js/settings.js`).

## Method × level matrix

### Classical (count, memorize, column algorithm)

- [x] **L1 Count:** tap-to-count — each tap pops the object, speaks the running count (tapping again un-counts it, so a miscount is recoverable); then type the total.
- [x] **L2 Add / L3 Subtract:** fact practice in **vertical (stacked) notation** alongside the emojis; after a correct answer, celebrate the fact family ("3 + 4… and 4 + 3!"). L3 turns the "eater" story into the manipulative: tap the animal to eat one object at a time, then count what's left.
- [x] **L4 Double-digit:** interactive **column algorithm** — answer the ones column first; a carry/borrow animates as a little "1" flying to the tens column; then answer the tens column. Two-step entry, never auto-judged.

### Common Core (strategies + place value)

- [ ] **L1 Count:** **ten frame** — tap empty cells to place counters until it matches the spoken target; occasional subitizing flash ("how many did you see?").
- [ ] **L2 Add:** **make-a-ten** on a double ten frame — tap counters in the second frame to move them and fill the first (8 + 5 becomes 10 + 3); alternate with **number-line hops** (tap where the frog lands).
- [ ] **L3 Subtract:** count-back hops on the number line; think-addition framing (reuses the existing missing-addend idea).
- [ ] **L4 Double-digit:** **base-ten blocks** — tap ten loose ones to snap them into a ten-rod (regrouping made visible); open number line with big +10 jumps then +1 hops.

### Singapore (Concrete → Pictorial → Abstract)

- [ ] **L1 Count:** CPA within a session — count emoji objects → dot cards → bare numeral matching.
- [ ] **L2 Add:** **number bonds** — two part-circles slide together into the whole; make-ten bond splits (8 + 5 → 8 + 2 + 3) with the split animated.
- [ ] **L3 Subtract:** number bond with a **missing part**; part-whole **bar model** with one segment covered — tap to reveal after answering.
- [ ] **L4 Double-digit:** bar models with tens/ones decomposition (47 + 25 → 40 + 20 and 7 + 5), shown as stacked bars that combine.

## Architecture

- [x] `js/modes/mathlab.js` — mode shell (activate/deactivate/onKey, score via `setScoreMode('mathlab')`, `celebrate()`), delegates rendering/interaction to the selected method. Owns the step list, the answer buffer and the `hintToken` fence that cancels timers when the child leaves mid-celebration.
- [x] `js/math/problems.js` — shared per-level problem generator (reuses `js/data/math-items.js`).
- [x] `js/math/classical.js` — implements the shared method interface. `js/math/common-core.js` and `js/math/singapore.js` follow in Phases C and D. Final interface (see the `MathMethod` typedef in `js/types.js`): `render(problem, container)`, `steps(problem)`, `hint(problem, container, stillValid)`, plus optional `onTap(target, problem, container)`, `onStepDone(step, problem, container) → pause ms`, and `celebrationText(problem)`.
- [x] `js/math/manipulatives.js` — reusable tap-first widgets. Phase A ships `tapCounter()`, `eaterButton()`/`eatOne()`, `countAloud()` and `el()`; `tenFrame()`, `numberLine()`, `baseTenBlocks()`, `numberBond()` and `barModel()` arrive with Phases C and D. DOM + CSS only (no canvas), all with speech hooks.
- [x] `js/dom.js` — `closestEl()`, the one helper every delegated tap handler needs (also removed three ad-hoc casts in `input.js`/`piano.js`).
- [x] `index.html` — `#mathlab-container`, settings rows for `betaModes`, `mathMethod`, `mathLabLevel`.
- [x] Speech everywhere via `js/speech.js`; hints follow the existing pattern (after 2 wrong attempts, the manipulative walks the strategy aloud).
- [x] Playwright specs per method (`tests/mathlab-*.spec.js`), including the beta-flag gate and the settings plumbing. `tests/helpers.js` gained `seedSettings()` and `openSettings()`; `tests/a11y.spec.js` now scans Math Lab too.
- [x] The answer renders **into** the notation (`[data-slot]`) when the manipulative has a slot for the current step, and only falls back to the big standalone display when it doesn't (L1). Two copies of the answer pushed the workspace off a phone.

## Open decisions (resolve before/while building Phase A)

- **Duplicated problem generation is deliberate.** `js/math/problems.js` and the existing `js/modes/math.js` will both generate problems from `js/data/math-items.js` with their own tier/level logic. Math mode stays untouched during the beta; the two generators merge as part of the Phase E graduation review, not before.
- **L4 needs two-step answer entry.** Every existing mode drives a single answer buffer from `onKey`. The column algorithm answers ones, then tens. The mode shell owns a **step list** (`steps(problem)`) supplied by the method — one step for L1–L3, two for classical L4 — so this stays in the shell rather than leaking into `js/input.js`.
- **Score is separate from Math.** `setScoreMode('mathlab')` derives its own `lls-score-mathlab` key, so Math Lab keeps a score independent of Math. Intentional while in beta; revisit at graduation.
- **Seventh top-bar button.** Six modes already compete for width. Checked on a Pixel 7: the bar wraps to two rows and stays usable. Separately, `#score-display` (absolutely positioned top-right of the play area) overlaps the question text on phones once the bar wraps — **pre-existing, reproduces in Math mode too**, so it's left alone here; it belongs with the P5 layout/accessibility pass.
- **Manipulatives are `<button>` elements.** `js/input.js` skips `playArea` taps that land on a button, so widget taps never double-fire, and keyboard/screen-reader operability comes for free. Tap handling is one delegated listener on `#mathlab-container` that forwards to `method.onTap(target)`.

## Phases

- [x] **Phase A** — beta gating + settings + mode shell + **classical** method (least new UI; vertical notation + tap-to-count + carry animation).
- [x] **Phase B** — **type-safety net** (below). Lands after A so it types an interface that has actually been built, and before the two methods that must conform to it.
- [ ] **Phase C** — **Common Core** (ten frame, number line, base-ten blocks widgets).
- [ ] **Phase D** — **Singapore** (number bond, bar model widgets).
- [ ] **Phase E** — `mix` rotation, cross-level auto-progression polish, graduation review.

## Phase B — type-safety net (JSDoc + `tsc --noEmit`)

Phase A introduces the repo's first multi-implementation contract: three method modules exporting the same `render` / `steps` / `onTap` / `hint` interface, with one `problem` object flowing from the generator through the shell into every renderer and widget. A renamed field there fails silently as an empty `<div>`; the E2E suite reports "it's blank", not "you typed `operand` instead of `operands`".

**Not a TypeScript migration.** No `.ts` files, no emit, no bundler — the deployed site keeps shipping the exact `.js` files in the repo. Types are JSDoc comments checked by `tsc --noEmit`, which lives in `devDependencies` alongside Playwright and runs only in CI. This stays inside the repo-wide rule that npm is dev tooling only. (The TypeScript 6 → 7 deprecation cycle is a migration path for existing TS codebases; with no TS here there is nothing to migrate, so track whatever compiler version is current.)

- [x] `jsconfig.json`: `checkJs: true`, `noEmit: true`, `module`/`moduleResolution` set for ES modules, `lib: ["ES2022", "DOM"]`, `include` covering `js/`, `tests/`, `tools/`.
- [x] `typescript` (7.0.2) + `@types/node` added to `devDependencies`; `npm run typecheck` → `tsc -p jsconfig.json`.
- [x] `js/types.js` — shared `@typedef`s: `Mode` (the implicit contract `js/main.js` already iterates), `Problem`, `MathItem`, `MathMethod`, `AnswerStep`, `Settings`.
- [x] Annotate the P6 surface first (`js/math/*.js`, `js/modes/mathlab.js`), then the pre-existing modules as they're touched. All seven mode exports carry `/** @type {Mode} */`, so the mode contract is now actually enforced rather than merely documented.
- [x] CI: a `npm run typecheck` step in `.github/workflows/ci.yml`, before the Playwright step.
- [ ] Fold the P5 "ESLint (flat config) + Prettier" item into this phase if it lands at the same time.

**Not full `strict`.** `strictNullChecks` is off: it reports ~150 `getElementById` results the app knows are present, which is a separate annotation pass, not this gate. `noImplicitThis`, `strictFunctionTypes` and `noUnusedLocals` are on.

- [ ] Follow-up: annotate the module-level DOM lookups (a `byId()` helper in `js/dom.js` would cover most of them) and turn `strictNullChecks` on.

**Verify the gate isn't vacuous when extending it.** A `@returns {Problem}` on a function whose body returns `any` checks nothing — that was true of `generateProblem` until the individual generators were annotated. Confirmed catching both a renamed `Problem` field and an invalid `AnswerStep.id`.

Bugs the first typecheck run surfaced in pre-existing code, now fixed: `score` (a number) assigned to `textContent` in two places in `js/effects.js`, the same in `js/modes/piano.js` (`dataset.midi`), and a dead `Intl.Segmenter` local in `tests/math.spec.js` whose comment described counting that the code wasn't doing.
