# P14 — Patterns: what comes next

> **Status (2026-09-03): Implemented.** Builds the Patterns entry from the "New
> module ideas" list in [04-learning-modules.md](04-learning-modules.md).
> Shapes & Colors, the other unbuilt idea there, is **not** built here — see
> below.

## Why Patterns and not Shapes & Colors

Both are listed in P4. Patterns is the better of the two to build:

- Sequencing — noticing a repeating unit and extending it — is a distinct
  pre-K mathematical skill and **nothing in the app touches it**. Math Lab is
  quantity and arithmetic; Words is sound-to-print; Numbers is counting.
- Shapes & Colors as written ("tap the red circle") is a recognition drill by
  construction. There is a good version of it, but it needs a design that gets
  past naming-and-matching, and that is a plan of its own rather than a bullet.
- Patterns needs no keyboard and no reading, which makes it the most accessible
  entry point in the app for the youngest children.

Shapes & Colors stays open in P4.

## Goal

A child sees a repeating sequence with the next item missing and chooses what
comes next from two or three large tappable options. No score, no failure
sound, no dead end — a choice that does not fit is answered by showing why,
never by marking it wrong.

## Evidence used

- The [IES *Teaching Math to Young Children* practice guide](https://ies.ed.gov/ncee/wwc/Docs/PracticeGuide/early_math_pg_111313.pdf)
  includes patterns among the early mathematical content areas worth teaching
  directly, alongside number and geometry.
- Research on early patterning reports that duplicating and extending repeating
  patterns precedes identifying the repeating *unit*, which is why the ladder
  below starts at extension and only later asks what the unit is.
- Repeating-pattern ability in preschool is associated with later mathematical
  outcomes, which is the argument for it being its own module rather than a
  decoration inside Math.

As elsewhere in this app, the specific difficulty ladder and wording are product
decisions taken from the shape of these findings, not prescriptions.

## The ladder

Difficulty is the structure of the repeating unit, not the length of the
sequence:

- [x] `ab` — 🔴🔵🔴🔵❓ — the two-item alternation almost every child meets first.
- [x] `aab` — 🍎🍎🍌🍎🍎❓
- [x] `abb` — ⭐🌙🌙⭐🌙❓
- [x] `abc` — 🐶🐱🐸🐶🐱❓ — three distinct items.

Each pattern shows two full repetitions plus a partial one, so the unit is
always visible twice before the child is asked to continue it.

## The interaction

- [x] The sequence renders as a row of large tiles ending in a `❓` slot.
- [x] Two or three answer tiles sit below. One continues the pattern; the
      distractors are drawn from the same pattern's own items, never from
      unrelated ones, so a wrong choice is a plausible confusion rather than a
      trick.
- [x] A tap that fits drops into the slot, completes the row, and the app says
      what the pattern is doing: "Red, blue, red, blue. It keeps going!"
- [x] A tap that does not fit is **not** an error. The tile bounces back, the
      app reads the pattern aloud pointing at each item in turn, and the choice
      stays open. Nothing is recorded, nothing is deducted.
- [x] `🔊` replays the pattern aloud at any time.
- [x] `➡️ Next` after a completion; the child chooses when to move on, the same
      as Words.
- [x] Auto-advance through the ladder after enough independent successes, using
      the same 5-of-6 window Math and Words use, so the three modules agree on
      what "ready" means.

## Grown-up controls

- [x] A `patternStage` setting: `auto` plus one entry per pattern type, matching
      how Math and Words already expose their stages.
- [x] A progress readout and a two-tap reset, alongside the others.

## Visual and accessibility rules

- [x] Every tile and answer is at least 44px and a real `<button>`.
- [x] The sequence is a labelled group; each tile is named by its content and
      position so the pattern is followable without sight.
- [x] The answer row is a labelled group, and the empty slot announces itself as
      the thing to fill.
- [x] Emojis used as pattern items must not collide with the app's celebration
      particles — the same disjointness rule `js/data/decor.js` already states,
      enforced by `tests/emoji-roles.spec.js`.
- [x] Fits desktop, Pixel and iPhone with no on-screen keyboard (this mode needs
      none, so it sets `oskLayout: null` like Piano).
- [x] Reduced motion removes the drop and bounce animations.

## Acceptance coverage

- [x] Each pattern type generates a sequence whose visible items actually repeat
      its unit.
- [x] The correct answer completes the row; a wrong one leaves the activity
      exactly as it was.
- [x] Distractors always come from the pattern's own item set.
- [x] Five independent successes in six master a stage and advance it.
- [x] A pinned `patternStage` overrides auto-advance.
- [x] Progress survives a reload; reset takes two taps.
- [x] No pattern item is also a celebration particle.
- [x] Serious/critical axe checks pass, on all four browser projects.

## Notes from the build

- Answering cancels the read-aloud. Without it the remaining phrases of a
  paced reading kept arriving after the child had answered, talking over the
  celebration and moving highlights around a row they had already finished.
- The read-along highlight is cancelled by a token, not just cleared. The
  silent fallback walks the row on timers, and a walk that outlived its puzzle
  went on lighting tiles in the next one.
- Patterns takes no keyboard input at all. Its `onKey` is deliberately inert
  rather than absent: a stray press should not change what is on screen under a
  child's hands.

## Follow-on observations

- Whether children extend the pattern or copy the last item they see; if the
  latter, show fewer repetitions rather than more.
- Whether to add "what is the repeating unit?" as a later rung once extension is
  secure.
- Whether patterns built from sounds or movements land better than visual ones
  for the youngest children.
