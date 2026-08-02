# P6 — Math Lab (beta): classical, Common Core & Singapore methods

> **Status (2026-08-01):** Phases A–F done. Math Lab ships behind the
> `betaModes` flag with all three teaching methods — **classical**, **Common
> Core** and **Singapore** — plus `mix`, across a **24-skill ladder covering
> pre-K through 1st grade**. The JSDoc typecheck gate is green and wired into
> CI. 208 specs pass on chromium + mobile-chrome (webkit runs in CI); all 75
> skill × method combinations render without overflow.
>
> **Direction (2026-08-01):** Math Lab is where the curriculum work happens.
> Math mode stays frozen as-is — the two are not converging, see the graduation
> review.
>
> **It stays behind the beta flag.** The code is covered, but nothing here has
> been tried on an actual child yet, and that's the only evidence that should
> retire the flag.

Goal: a new **Math Lab 🧪** beta module that teaches the same four skill levels through three selectable teaching methods — classical, Common Core, and Singapore — each with its own *interactive manipulatives* instead of only type-the-answer. The existing Math mode stays untouched; Math Lab is where the new interaction styles incubate.

**Scope (revised 2026-08-01):** the original four levels have been replaced by a
**24-skill ladder covering pre-K through 1st grade**. Math Lab is now where the
curriculum work happens; Math mode is frozen as-is. See "The progression" below.

Design principles (on top of the repo-wide toddler rules):

- **Tap, don't drag.** Every manipulative is tap-to-act (tap a counter to place it, tap a number-line spot to hop there). Drag targets are too hard for small fingers and drag isn't in the input layer today.
- **Manipulate first, type to confirm.** The interactive widget builds understanding; the numpad OSK + ✓ remains the final answer step.

  > **Revised (2026-08-01):** this originally said "same muscle memory as existing Math". Both Math and Math Lab now **auto-submit on single-step problems** — they judge the moment the typed digits can only be right or only be wrong. ✓ survives in exactly one place: the classical two-digit **column algorithm**.
  >
  > The reason is *not* the carry animation, which an earlier note claimed and which was wrong — `onStepDone` fires on the correct answer either way, so the carry animates identically. The real reason is **forgiveness**. Each column step expects a single digit, so auto-judging would commit the very first key pressed, and the existing "tap 3, then tap 7 to replace it" overwrite could never fire. Two-digit place-value work is the hardest thing on the ladder and the easiest to fat-finger, so it keeps its escape hatch and its extra beat between the ones and the tens. Single-step levels lose nothing: a partial two-digit answer still waits for the second digit, and ✓ still works for a child who stops on a valid prefix.
  >
  > **Revised again (2026-08-01):** "type to confirm" is wrong for one rung and was actively confusing there. Singapore's `numeralMatch` shows the numeral and says *"Show me 7 — tap that many counters"*; the child then had to type 7, a number already on their screen. The task was the tapping and the answer step ignored it.
  >
  > So an `AnswerStep` can now set **`taps: true`**: the manipulative *is* the answer. The shell reads it back through `MathMethod.readAnswer(container, problem)` on every judgement (fresh from the DOM, so a hint that fills the widget in counts too), ignores the numpad's digits, hides the answer display — echoing the count as a numeral would let the child match numeral-to-numeral instead of counting — and judges when they tap the method's own `checkButton()`, or ✓/Enter. An empty widget reads as "not started", not as an answer of zero, so an early ✓ does nothing rather than costing them a wrong answer.
  >
  > This is the same shape as the column algorithm's exception, for the same kind of reason: the answer step has to be the thing the rung is actually teaching. It also needed a **visible** wrong-answer signal — recolouring a hidden answer display had been the only feedback for every slot-owning method too, so a miss now shakes the workspace.
- **Same problem, different lens — with room for each curriculum to be itself.** One shared problem generator; each method changes how a problem is *represented and worked*. Originally that meant a single ladder for all three. It now means a shared **spine** every method walks, plus **detours** each curriculum inserts where it genuinely teaches something the others don't. Methods stay comparable at each spine rung and a child never loses their place by switching.
- **Methods dispatch on problem *shape*, not skill id.** `op`, `twoDigit`, `crossesTen` and `regroups` decide which manipulative fits. Adding a rung to the ladder therefore needs no edit to any method. The one sanctioned exception is a curriculum's own detour rungs, which exist precisely because that curriculum teaches that specific thing.
- **GitHub Pages compatible, always.** Plain ES modules with relative paths, DOM + CSS manipulatives (no canvas, no external libraries, no CDN), all state in `localStorage`, speech/audio via built-in browser APIs. No build step, no backend, no separate hosted app — deploys exactly like the rest of the site: push to `main`.

## Beta gating

- [x] `betaModes` setting (default **off**) in the parent settings panel: "Show beta modes".
- [x] Beta modes render their top-bar button with a small 🧪 badge and are hidden entirely unless `betaModes` is on. Turning the flag off while a beta mode is active drops back to Free Play.
- [ ] Graduation path: when a method/level combo is stable, it can fold into the main Math mode and come off the beta flag.

## Settings

- [x] `mathMethod`: `classical` | `commoncore` | `singapore` | `mix` (mix rotates methods per problem). Parent-facing dropdown; all four options are live. While a method was unbuilt its option was rendered `disabled` with a "(soon)" label rather than silently falling back, so the panel never lied about what it would do.
- [x] `mathLabLevel`: `auto` | a **stage id** (`counting`, `adding10`, `subtracting10`, `teens`, `twodigit`). Nobody wants a 24-item dropdown, so the parent picks a stage and problems are drawn from the skills in it. Auto walks the ladder instead. **Persisted across sessions**, unlike Math mode's `mathTier`, which resets every time the mode is entered.
- [x] The setting also accepts an **exact skill id**, which the UI never offers. It keeps the specs deterministic — pinning `addRegroup` guarantees a regrouping problem — and leaves room for per-skill practice later.
- [x] Migration: a stored numeric `mathLabLevel` (`'1'`–`'4'`) maps onto a stage on load, and old `{ level, streak }` progress maps onto a spine index, so an existing user is not sent back to counting to five.
- [x] Changing either setting mid-session regenerates the problem in the new shape (`onSettingChange` in `js/settings.js`).

## The progression

Defined in [js/math/ladder.js](../../js/math/ladder.js); the skills themselves live in [js/math/problems.js](../../js/math/problems.js).

### The spine (15 rungs, shared by all three curriculums)

| # | Skill | Stage |
| --- | --- | --- |
| 0 | `count5` | Counting |
| 1 | `count10` | Counting |
| 2 | `addWithin5` | Adding to 10 |
| 3 | `addWithin10` | Adding to 10 |
| 4 | `subWithin5` | Taking away to 10 |
| 5 | `subWithin10` | Taking away to 10 |
| 6 | `makeTen` | Teen numbers |
| 7 | `addWithin20` | Teen numbers |
| 8 | `subWithin20` | Teen numbers |
| 9 | `missingAddend` | Teen numbers |
| 10 | `addTens` | Two-digit |
| 11 | `addWithin100` | Two-digit |
| 12 | `subWithin100` | Two-digit |
| 13 | `addRegroup` | Two-digit |
| 14 | `subRegroup` | Two-digit |

### Detours (each curriculum's own rungs)

| Curriculum | Detour | Sits after | Why it's theirs |
| --- | --- | --- | --- |
| Classical | `countBack` | `count10` | Counting backwards as its own idea, before it becomes subtraction |
| Classical | `factFamily` | `addWithin10` | "You know 3 + 4 = 7, so what is 4 + 3?" |
| Classical | `tenAndSome` | `makeTen` | 10 + 4 = 14 as a memorized place-value fact |
| Common Core | `subitize` | `count5` | Recognising a quantity without counting it |
| Common Core | `countOn` | `addWithin5` | Start from the bigger number and count on |
| Common Core | `doubles` | `addWithin10` | Doubles as anchor facts |
| Common Core | `tensAndOnes` | `subWithin20` | Place value before two-digit strategies |
| Singapore | `numeralMatch` | `count10` | The abstract step of CPA: numeral → quantity |
| Singapore | `bondTo10` | `addWithin10` | Number bonds to ten |
| Singapore | `partWhole` | `subWithin10` | The missing part of a whole |
| Singapore | `tensAndOnes` | `subWithin20` | Decomposition before bar models |

### How progress is tracked

`lls-mathlab-progress` = `{ spine, streak, done }`. `spine` is **shared** across curriculums, so switching keeps the child's place. `done` records which detours each method has had, since those are per-curriculum.

**A detour comes due the moment its spine rung is mastered.** This is an off-by-one worth remembering: a detour after spine rung *k* is due when `progress.spine === k + 1`, so `isPassed` compares `spineIndex + 1 < progress.spine`. Comparing against `progress.spine` alone marks a detour passed at the same instant it becomes available — which made every detour unreachable, and was caught only by a spec that asserted a specific rung rather than "some rung".

Detours *behind* the spine position are skipped, not back-tracked: arriving at rung 12 on a curriculum never used before should not drag the child back through its rung-1 detour.

### Advancing

**Four correct in a row**, so guessing can't climb. A wrong answer resets the streak but **never drops a rung** — failing backwards reads as punishment at this age. The top rung is a ceiling, not a crash: it stays put and announces nothing.

### `twoDigit` is opted into, not sniffed

Generators set it; it is not inferred from magnitude. Magnitude gets it wrong in both directions — counting ten apples is not place-value work, and 15 − 7 is count-back territory, not a column algorithm that would demand a leading-zero tens digit. Both bugs were live until the spec sweep caught them.

## Method × shape matrix

### Classical (count, memorize, column algorithm)

- [x] **L1 Count:** tap-to-count — each tap pops the object, speaks the running count (tapping again un-counts it, so a miscount is recoverable); then type the total.
- [x] **L2 Add / L3 Subtract:** fact practice in **vertical (stacked) notation** alongside the emojis; after a correct answer, celebrate the fact family ("3 + 4… and 4 + 3!"). L3 turns the "eater" story into the manipulative: tap the animal to eat one object at a time, then count what's left.
- [x] **L4 Double-digit:** interactive **column algorithm** — answer the ones column first; a carry/borrow animates as a little "1" flying to the tens column; then answer the tens column. Two-step entry, never auto-judged.
- [x] **L4 blocks (2026-08-02):** **base-ten blocks beside the column.** These were the only rungs on the ladder with nothing to touch — a real gap on a site meant for tablets and phones, and the odd one out even here, since Common Core has blocks and an open number line on the same rungs and Singapore has bar models and the Tens/Ones buttons.

  > The blocks are the same widget Common Core uses, doing the opposite job, which is what keeps the two curriculums distinct rather than duplicated. Common Core hands the child blocks **instead of** the written algorithm. Classical works the algorithm and puts the blocks under it, so the two regroupings are things you *make* rather than rules you are told: tap ten loose ones and they snap into a rod (that is the 1 you carry), or tap a rod and it breaks into ten ones (that is the borrow). `breakRod()` is new — `snapTen()` had existed since Phase C, but nothing could run it backwards, so the borrow had no concrete form.
  >
  > Laid out **side by side** with the column, not under it: the column is ~80px wide and the play area is ~350px tall with the numpad open, so this way the blocks cost no height at all. Stacked they did not fit, and `tests/mathlab-fit.spec.js` said so on the first run.

### Common Core (strategies + place value)

- [x] **L1 Count:** **ten frame** — objects on top, empty frame below; tap cells to place counters until it matches. Subitizing flash (`subitize` variant, 25% of L1 problems): the frame is dealt pre-filled, covers itself after 1.6s, and asks "how many did you see?" with a 👀 Peek button for another look.
- [x] **L2 Add:** **make-a-ten** on a double ten frame — tapping a counter in the second frame *moves* it into the first, so the total never changes while the child rearranges (8 + 5 becomes 10 + 3); alternates with **number-line hops** (tap where the frog lands).
- [x] **L3 Subtract:** count-back hops on the number line, with the hint speaking **both** framings — the count-back walk, then "or think of it the other way: 3 and how many more makes 8?". Note this reuses the missing-addend *framing*, not Math mode's missing-addend problem type, which `problems.js` still lacks (see the graduation review).
- [x] **L4 Double-digit:** **base-ten blocks** for addition — tap ten loose ones to snap them into a ten-rod (regrouping made visible); **open number line** for subtraction, with −10 / −1 hop buttons, a running position, and undo.

Variant selection is stored on `#mathlab-workspace[data-variant]`, not in a module variable, so `onTap`, `hint` and `question` always read the variant that `render` actually drew — and the specs can pin one.

**Make-a-ten is gated on `a + b >= 10`.** Below that the first frame never fills and the strategy is a lie; those problems always get the number line instead.

### Singapore (Concrete → Pictorial → Abstract)

- [x] **L1 Count:** CPA within a session — emoji objects → dot card → bare numeral. The stage advances every 2 correct answers and **wraps back to concrete**, so a child parked on level 1 keeps meeting all three rather than stalling on the last.
- [x] **L2 Add:** **number bonds** — parts below, whole above, and the whole *is* the answer slot, so typing lands inside the bond. Tapping the second part splits it make-ten style (9 + 8 → 9 + 1 + 7) with the split animated.
- [x] **L3 Subtract:** number bond with a **missing part**, plus a part-whole **bar model** with one segment covered, revealed only once the child has answered correctly.
- [x] **L4 Double-digit:** addition gets bar models with tens/ones decomposition (41 + 25 → 40 + 20 and 1 + 5) and two combine buttons that turn into their own result chips; subtraction gets a comparison bar with the unknown part covered.

**The abstract L1 stage runs the other way round.** Concrete and pictorial show a quantity and ask for the numeral; abstract shows the numeral and asks the child to *build* the quantity in a ten frame. That's the mapping "bare numeral matching" actually trains, and it keeps the stage from being a re-skin of the pictorial one.

**Bar models are drawn to scale** (`flex-grow` from each segment's value), so a covered segment's width hints at its size. That's deliberate — a proportional picture is the point of the model, not a leak to paper over.

## Architecture

- [x] `js/modes/mathlab.js` — mode shell (activate/deactivate/onKey, score via `setScoreMode('mathlab')`, `celebrate()`), delegates rendering/interaction to the selected method. Owns the step list, the answer buffer and the `hintToken` fence that cancels timers when the child leaves mid-celebration.
- [x] `js/math/problems.js` — the **skill table**: one generator per skill (24 of them), each returning a `Problem` with its shape flags filled in. Reuses `js/data/math-items.js`.
- [x] `js/math/ladder.js` — the **spine, the detours and the progression state machine**: `ladderFor()`, `currentRung()`, `advance()`, `normalizeProgress()`, stage grouping and the legacy migrations.
- [x] `js/math/classical.js`, `js/math/common-core.js` and `js/math/singapore.js` — all three implement the shared method interface. Final interface (see the `MathMethod` typedef in `js/types.js`): `render(problem, container, session)`, `steps(problem)`, `hint(problem, container, stillValid)`, plus optional `onTap(target, problem, container)`, `onStepDone(step, problem, container) → pause ms`, `celebrationText(problem)` and `question(problem, container) → { html, speak }`.
- [x] `js/math/manipulatives.js` — reusable tap-first widgets. Phase A: `tapCounter()`, `eaterButton()`/`eatOne()`, `countAloud()`, `el()`. Phase C: `tenFrame()`/`frameCount()`/`fillCell()`/`emptyCell()`, `numberLine()`/`hopTo()`, `openNumberLine()`/`hopBy()`/`undoHop()`, `baseTenBlocks()`/`blockCounts()`/`snapTen()`. Phase D: `dotCard()`, `numeralCard()`, `numberBond()`/`splitPart()`, `barModel()`/`revealSegment()`. DOM + CSS only (no canvas), all with speech hooks. Widgets keep their state in the DOM (classes and `data-*`), never in module variables, so a re-render can't desync from what's on screen.
- [x] `js/dom.js` — `closestEl()`, the one helper every delegated tap handler needs (also removed three ad-hoc casts in `input.js`/`piano.js`).
- [x] `index.html` — `#mathlab-container`, settings rows for `betaModes`, `mathMethod`, `mathLabLevel`.
- [x] Speech everywhere via `js/speech.js`; hints follow the existing pattern (after 2 wrong attempts, the manipulative walks the strategy aloud).
- [x] Playwright specs per method (`tests/mathlab-*.spec.js`), including the beta-flag gate and the settings plumbing. `tests/helpers.js` gained `seedSettings()` and `openSettings()`; `tests/a11y.spec.js` scans Math Lab once per method, since each renders a completely different set of controls.
- [x] The Common Core specs reload until `[data-variant]` (and optionally the problem shape) match what they intend to test, rather than skipping on an unlucky roll — the regrouping snap is behaviour under test, not something to leave to the dice.
- [x] The Singapore L1 specs **play through** instead of reloading: the CPA stage comes from correct answers this session, which resets on activate, so no amount of reloading reaches pictorial or abstract. They assert the C → P → A → C progression by actually answering.
- [x] Which methods are selectable is asserted in exactly one place (`tests/mathlab-singapore.spec.js`), so enabling the next one is a single-line edit rather than a hunt for stale assertions.
- [x] The answer renders **into** the notation (`[data-slot]`) when the manipulative has a slot for the current step, and only falls back to the big standalone display when it doesn't (L1). Two copies of the answer pushed the workspace off a phone.

## Open decisions (resolve before/while building Phase A)

- **Duplicated problem generation is deliberate.** `js/math/problems.js` and the existing `js/modes/math.js` both generate problems from `js/data/math-items.js` with their own tier/level logic. Math mode stays untouched during the beta. *(Resolved by the Phase E graduation review below: they should **not** merge — they encode different curricula, not duplicated logic.)*
- **L4 needs two-step answer entry.** Every existing mode drives a single answer buffer from `onKey`. The column algorithm answers ones, then tens. The mode shell owns a **step list** (`steps(problem)`) supplied by the method — one step for L1–L3, two for classical L4 — so this stays in the shell rather than leaking into `js/input.js`.
- **Score is separate from Math.** `setScoreMode('mathlab')` derives its own `lls-score-mathlab` key, so Math Lab keeps a score independent of Math. Intentional while in beta; revisit at graduation.
- **Seventh top-bar button.** Six modes already compete for width. Checked on a Pixel 7: the bar wraps to two rows and stays usable. Separately, `#score-display` (absolutely positioned top-right of the play area) overlaps the question text on phones once the bar wraps — **pre-existing, reproduces in Math mode too**, so it's left alone here; it belongs with the P5 layout/accessibility pass.
- **`onStepDone` fires on the final step too.** Originally it only ran between steps (the classical carry). Singapore needs "the answer was right" as a moment it can animate — uncovering the hidden bar segment — so `finish()` calls it as well. The returned pause is still only honoured between steps. Classical is unaffected: it no-ops on anything but the `ones` step.
- **`render` receives a `session`.** Singapore's concrete → pictorial → abstract rotation is driven by correct answers this sitting, which is the shell's state, not the problem's. Passed as a typed third argument rather than smuggled through the DOM; the other two methods ignore it.
- **A method can override the question text.** `Problem.questionText` is written for the classical lens ("Count the APPLES!"), which flatly contradicts a subitizing flash or a bare `8 + 5` on a number line. The optional `question(problem, container)` hook on `MathMethod` runs *after* render so it can read the chosen variant; the shell falls back to `Problem.questionText`/`speakText` when a method doesn't define it. The 🔊 button re-speaks whichever one is live.
- **Manipulatives are `<button>` elements.** `js/input.js` skips `playArea` taps that land on a button, so widget taps never double-fire, and keyboard/screen-reader operability comes for free. Tap handling is one delegated listener on `#mathlab-container` that forwards to `method.onTap(target)`.

## Phases

- [x] **Phase A** — beta gating + settings + mode shell + **classical** method (least new UI; vertical notation + tap-to-count + carry animation).
- [x] **Phase B** — **type-safety net** (below). Lands after A so it types an interface that has actually been built, and before the two methods that must conform to it.
- [x] **Phase C** — **Common Core** (ten frame, number line, open number line, base-ten blocks widgets).
- [x] **Phase D** — **Singapore** (dot card, numeral card, number bond, bar model widgets).
- [x] **Phase E** — `mix` rotation, cross-level auto-progression polish, graduation review (below).
- [x] **Phase F** — **the ladder**: four levels replaced by 24 skills across a shared spine with per-curriculum detours; methods refactored onto problem shape; streak-based advancement; stage-based parent dropdown.

### Phase F notes

- [x] The four-level model is gone. `Problem.level` no longer exists; `Problem.skill` plus the shape flags replace it. The typecheck found every place the three methods keyed off `level` — 16 errors across three files, which is exactly what the Phase B gate was added for.
- [x] `#mathlab-workspace` now carries `data-skill` and `data-stage` alongside `data-method` and `data-variant`.
- [x] The missing-addend gap the Phase E graduation review found is closed: `missingAddend` is a spine rung, and `bondTo10` / `partWhole` are Singapore detours built on the same shape.
- [x] A sweep script checks all 75 skill × method combinations for empty workspaces, missing questions and play-area overflow. It passed while the missing-addend equation was still rendering stacked instead of across — a reminder that a sweep proves absence of crashes, not correctness. Looking at the screenshots caught it.

## Deferred UI/UX — found on device (2026-08-02)

Parked while speech quality ([07](07-speech-quality.md)) takes priority; pick these up before any further UI/UX work here.

**These came from a real iPhone 16 Pro running Safari, and that is worth recording on its own.** `playwright.config.js` declares `webkit` and `mobile-safari` projects, but the WebKit browser is not installed on the dev machine, so local runs and everything asserted in this plan were verified on **chromium and mobile-chrome only**. Safari is currently unexercised — device testing is the only thing catching these.

- [ ] **Decoration and content are not disjoint sets.** Reported as: the ⭐ in the score badge blends into the ⭐ objects on a "count the STARS" problem. It is not only the badge, and not only Safari:

  | Source | Where |
  | --- | --- |
  | `⭐ Score: N` badge | `index.html`, permanently in the play area's top-right corner |
  | `⭐` as a countable subject | `js/data/math-items.js` |
  | `⭐ 🌟 ✨ 💫 🎉 🎊 🎈 🎁 ❤️ 💜 💙 💚 💛 🧡` celebration particles | `js/effects.js`, spawned **over** the play area |

  **Four of the sixteen countable items — ⭐ ❤️ 🎈 🎁 — are also celebration particles.** So on a quarter of counting problems a decoration is indistinguishable from a thing to be counted, and on the STARS problem there is a third star sitting in the badge. This is a correctness hazard, not just visual noise: the task is *count exactly these objects*, and the screen shows objects that are not part of the count. It is visible in the mobile-chrome screenshots taken during the 2026-08-02 density pass (hearts drifting across the balloon rows on `tenAndSome`, sparkles over the ten frame) — Safari's larger, higher-contrast glyphs just made it obvious enough to notice.

  Candidate fixes, cheapest first:
  1. Make the two sets disjoint — drop ⭐ ❤️ 🎈 🎁 from the particle list in `js/effects.js`, keeping ✨ 💫 🎉 🎊 and the coloured hearts. Note 💜💙💚💛🧡 still read as "a heart" next to ❤️ HEARTS, so they likely have to go too.
  2. Give the score badge a non-emoji mark, or drop its ⭐ in the counting modes.
  3. Keep particles outside the workspace bounds rather than over it.

  The rule worth adopting either way: **nothing that decorates may also be countable.** Fixing it at the particle list rather than by removing subjects keeps all sixteen items, and ⭐/❤️/🎈/🎁 are among the most appealing to a toddler.

- [ ] Other iPhone 16 Pro / Safari findings from the same session — **not yet captured**, ask before this is picked up.

## Still open

- [ ] Try the ladder with an actual child; record which rungs land and which are too big a step, before touching the beta flag.
- [x] `prefers-reduced-motion`: app-wide pass done (2026-08-01). CSS media block collapses every keyframe/transition to near-instant (states still land — a counted emoji still highlights — they just arrive without the journey); `js/effects.js` suppresses bubbles/stars/flying keys at the source, since for spawned elements their existence *is* the animation. Score and success sound still land. Covered by a `reducedMotion: 'reduce'` spec in `tests/a11y.spec.js`.
- [x] Parent progress controls (2026-08-01): the beta section of the panel shows the current rung ("Making a ten — step 7 of 15") and a **Start over** button. Reset is two-tap (one mis-tap must not erase weeks of climbing) and disarms when the panel closes. Storage helpers moved into `js/math/ladder.js` so settings.js can read/clear progress without importing the mode (which would be a module cycle); the mode hears about a reset via a `lls-mathlab-progress-reset` window event and re-deals from the bottom rung if active. Nudging to a specific rung stays out: pinning a stage already covers "practice this", and a jump-to-rung control invites parents to skip the child up the ladder.
- [ ] Detour rungs are never revisited once done. If a child regresses, only the spine tracks them. Deliberately unresolved for now — it's the same design stance as no-demotion, and real-child evidence should drive it.

### Phase E notes

- [x] **`mix` rotates, it does not randomise.** Every method gets equal time and the same one never lands twice running. The rotation restarts on activate, alongside the CPA rotation.
- [x] `#mathlab-workspace` carries `data-method` and `data-level` as well as `data-variant`, so what's on screen is inspectable — mostly for the specs, but it also makes `mix` debuggable by eye.
- [x] `data-variant` is **cleared** before each render. Classical sets none, so under `mix` a stale value from Common Core or Singapore would otherwise survive the switch and mislead whatever read it next.
- [x] **Auto-progression is persisted, not session-scoped** (`lls-mathlab-progress`: `{ level, streak }`). A toddler bounces out to Free Play and back constantly; resetting to level 1 each time made auto mode feel like it punished exploring. The streak toward the next level survives too, so a mode switch never costs work already done. Corrupt or out-of-range stored values clamp rather than throw.
- [x] Levelling up is announced — `Level 3! 🎉` in the prompt line and spoken. It takes priority over a method's `celebrationText` when both land on the same answer, since it's the bigger news.
- [x] A **pinned** level ignores stored progress entirely and never advances it, so a parent holding a child at level 2 doesn't silently accumulate progress toward level 4.
- [x] `resolveLevel()` is gone from `js/math/problems.js`, replaced by `clampLevel()`; the shell owns progression now.

## Graduation review (2026-07-31)

The premise recorded in "Open decisions" was that `js/math/problems.js` and the generator inside `js/modes/math.js` are duplicated logic to be merged at graduation. **Having built both, that premise is wrong.** They are not two implementations of one curriculum; they are two different curricula:

| Level | Math mode (`mathTier`) | Math Lab (`mathLabLevel`) | Same? |
| --- | --- | --- | --- |
| 1 | count 1–5 | count 1–10 | No — Lab is harder |
| 2 | `a`, `b` ∈ 1–5 (sums ≤ 10) | `a`, `b` ∈ 1–9 (sums ≤ 18) | No — Lab is harder |
| 3 | `a` ∈ 2–9, `b` ∈ 1…`a`−1 | identical | **Yes** |
| 4 | big single-digit sums (5–10 + 5–10) **or** missing addend (`a + ? = total`) | double-digit add/sub | No — different topic entirely |

So "merge the generators" is a **curriculum decision, not a refactor**. Pointing Math mode at `problems.js` would silently make levels 1, 2 and 4 harder for a child already using it. That is not a call to make as tidy-up.

**Resolved 2026-08-01:** the repo owner's call is that Math Lab is where curriculum work happens and Math mode stays frozen. The two are no longer converging, so the table above is now a record of *why* rather than an open question. The gap it identified (missing addend) has since been closed inside Math Lab.

**Recommendation at the time: do not merge, and do not graduate yet.**

1. Only level 3 is genuinely shared, and the common part is ~10 lines (`rand`, item selection). Extracting that would trade a little duplication for a module boundary and no behaviour win. Leave it.
2. Every method × level combo is covered by specs and renders correctly on desktop and a phone — but **no child has used any of it**. Specs prove it doesn't crash; they prove nothing about whether a four-year-old understands a number bond. That's the only evidence that should retire the beta flag, and it doesn't exist yet. Keep `betaModes` off by default until it does.
3. Graduating *into* Math mode would mean Math mode grows the whole method concept, or gets replaced by Math Lab. That's a product decision for the repo owner, not an implementation detail of this plan.

**Gap found by the review:** Math mode's **missing-addend** problem type (`a + ? = total`) has no equivalent in `problems.js`. The Common Core L3 line above claims it "reuses the existing missing-addend idea" — it reuses the *framing* in the hint (both take-away and think-addition are spoken), but the Lab generator has no missing-addend problem type at all. Worth adding before any merge is contemplated, since it's the one thing Math mode does that Math Lab can't.

- [ ] Add a missing-addend problem type to `js/math/problems.js`, so the Lab is a superset of Math mode rather than a divergent branch.
- [ ] Try all three methods with an actual child; record which combos land before touching the beta flag.
- [ ] **Animation debt:** this plan added `carry-hop`, `borrow-slide`, `tf-pop`, `rod-snap`, `nb-grow` and `bm-reveal`. The `prefers-reduced-motion` item in [05-testing-tooling.md](05-testing-tooling.md) is still open and now covers noticeably more surface. It wants one deliberate app-wide pass, not a partial one here.

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

## Fixed — the Lab didn't fit an iPhone (found and fixed 2026-08-02)

`mobile-safari` was pointed at the real device (`iPhone 16 Pro`, 402x681) when
WebKit was installed for P7. `mathlab-fit.spec.js` fails on all three methods:
with the numpad open, roughly half the rungs put the manipulative **below the
fold**, so a toddler has to scroll to reach the thing they are meant to tap.

```
classical:  count5, count10, subitize, numeralMatch, factFamily → math-emoji
            countBack → nl-tick    subWithin20 → eater-btn
            addTens, addWithin100, subWithin100, addRegroup, subRegroup → btb-one
```

Confirmed **not** a WebKit bug: the same spec fails on Chromium forced to the
same viewport. It is screen height, and it is pre-existing — the suite never
caught it because `mobile-chrome` uses a Pixel 7 (412x915), ~230px taller than
any iPhone. The base-ten blocks added in `bf04c83` are the worst affected.

**The fix: the numpad went from four rows to two.** None of the three options
first considered (overlay, deliberate scroll, shrink the manipulatives) were
needed — the numpad itself was the problem. A phone keypad's `1-2-3 / 4-5-6 /
7-8-9 / ⌫-0-✓` grid cost **252px, 37% of a 681px screen**. Reshaped to
`1-2-3-4-5-⌫ / 6-7-8-9-0-✓` it costs **131px**, returning 121px to the
workspace. That alone cleared all 25 rungs across all three methods.

- [x] `oskLayouts.numpad` in `js/input.js` reshaped to two rows of six.
- [x] Still exactly 12 keys, so `math.spec.js`'s count assertion, the `✓`
      confirm key and `data-key="Backspace"` all hold unchanged.
- [x] Keys land at ~59px wide on a 402px viewport, comfortably over the 44px
      touch-target minimum, and `#osk.numpad .osk-key`'s 110px `max-width`
      still caps them on a desktop.
- [x] Reading order (1-5 then 6-0) is also better for a child learning the
      number line than a keypad's bottom-up 7-8-9.

Full suite after the change: **550 passed, 6 skipped, 0 failed** across all four
projects, `mobile-safari` included.

Worth keeping: `mathlab-fit.spec.js` is a load-bearing spec. It caught a real
defect the moment it was pointed at a true phone viewport, and the temptation
when it goes red is to loosen it. Don't — it was right.
