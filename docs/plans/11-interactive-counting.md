# P11 — Interactive Counting: from watching to doing

> **Status (2026-09-03): Phases 1–4 implemented.** Tap-to-count, conservation,
> the ten-frame and dot representations, and the grown-up observation record
> ship together with browser, layout, speech-contract, and accessibility
> coverage across desktop Chromium, desktop WebKit, Pixel, and iPhone. Phase 5
> remains deferred behind observation, and observed-child sessions remain the
> release gate. This plan supersedes the open follow-on notes in
> [09-number-foundations.md](09-number-foundations.md).

## Why Numbers, and why now

The app has settled into two tiers. [Math Lab](../../js/modes/mathlab.js) and
[Words](../../js/modes/words.js) carry readiness ladders, 5-of-6 mastery
windows, reversible child-chosen paths, guided lessons, and a shared
manipulatives library. Letters and Numbers were deliberately shipped as calm
first-encounter experiences and stopped there.

Before this plan, Numbers was the most passive screen in the app. A child
pressed a digit and then watched: `countSet()` revealed each object and narrated
it to completion, with no input accepted until the sequence ended. Letters at
least offered three tappable replay targets; Numbers offered none after the
keypress.

Two things make Numbers the right module to deepen before Letters:

1. **Letters' own next step is already built elsewhere.** P8 proposes an
   initial-sound match ("which picture starts like apple?"), but Words ships
   exactly that as the `firstSoundsContinuous` and `firstSoundsStops` skills.
   Adding it to Letters would duplicate the curriculum module.
2. **Numbers' next steps exist nowhere.** Math Lab's `counting` skill
   *assesses* quantity — "how many?", type the answer. Nothing in the app has
   the child perform one-to-one correspondence, and nothing touches
   conservation of number.

## Goal

Move Numbers from a narrated demonstration to a child-performed activity,
without giving up what P9 established: stable object slots, reveal before
speech, guarded speech recovery, and a score-free experience with no
wrong-answer states.

The organizing idea is **model once, then hand over**. The app demonstrates the
count the first time a numeral is chosen, then steps back and lets the child do
it. Counting is something a child does with their hands, and the build this
plan replaced did the pointing for them.

## Evidence used

- The [IES *Teaching Math to Young Children* practice guide](https://ies.ed.gov/ncee/wwc/Docs/PracticeGuide/early_math_pg_111313.pdf)
  places one-to-one counting and the cardinality principle on the early
  developmental progression.
- The IES [Meaningful Counting teacher toolkit](https://ies.ed.gov/ncee/rel/math-young-children/pdf/TMYC_Mod2_Teacher_Learning_Journal.pdf)
  models an adult coordinating a spoken number word with *touching* one object,
  then stating the set's cardinal quantity. The touching was the part this app
  withheld from the child.
- Young children's [correspondence between counting gestures and spoken number
  words is related to counting performance](https://www.sciencedirect.com/science/article/pii/S0022096599925201).
  P9 cites this and then performs the gesture on the child's behalf; P11
  reverses that.
- Gelman and Gallistel's counting principles (*The Child's Understanding of
  Number*, 1978) name one-to-one correspondence, stable order, cardinality,
  abstraction, and **order irrelevance**. Order irrelevance is why tap-to-count
  must accept any tap order, and abstraction is why the same quantity should be
  available in more than one representation.
- Piaget's number-conservation task (*The Child's Conception of Number*, 1965)
  is the basis for Phase 2: quantity is invariant when spacing or arrangement
  changes.
- Clements, "Subitizing: What Is It? Why Teach It?" (*Teaching Children
  Mathematics*, 1999) motivates the deferred Phase 5, and is why structured
  arrangements (ten frame, dot card) are worth introducing in Phase 3 even
  before any subitizing activity exists.
- Gradual release of responsibility (Pearson and Gallagher, 1983) is the shape
  of "model once, then hand over".

These sources do not prescribe this app's specific controls. The phase order,
the wording, and the decision to keep the modeled count as a first encounter
are product inferences from their shared principles.

## Design rules carried forward from P9

Nothing below may break these:

- Every final slot is reserved before counting begins; earlier objects never
  move when another appears.
- An object becomes visible *before* its number word is queued.
- One guarded fallback per step; a stalled or missing voice can never freeze the
  activity or let timers race.
- A new numeral or a mode change cancels stale work cleanly.
- Score-free. No wrong-answer state, no failure sound, no dead end.
- Reduced motion removes animation without removing information.

## Phase 1 — Tap-to-count

The child performs the count.

- [x] Convert `.count-object` slots to real `<button>`s. `js/input.js` already
      skips play-area taps that land on a button, so object taps cannot
      double-fire and the objects become keyboard- and screen-reader-operable.
- [x] Accept taps in **any order** (Gelman and Gallistel's order-irrelevance
      principle). Each first tap on an object assigns the next ordinal, marks it
      counted, and speaks that number word.
- [x] Tapping an already-counted object re-speaks its ordinal and changes
      nothing. This enforces one-to-one correspondence by construction rather
      than by correction — there is no way to count an object twice, and so no
      wrong answer to report.
- [x] Show a small ordinal badge on each object as it is counted, so the
      one-to-one pairing stays visible after the tap.
- [x] When the last object is counted, emphasize its badge and state cardinality
      — "Four. There are four frogs." — making "the last number word tells how
      many" visible as well as audible.
- [x] Keep the existing modeled count as the **first** encounter with a numeral
      in a session; afterwards the same numeral goes straight to child-led
      counting.
- [x] Add a `👀 Show me` control that replays the modeled count at any time, and
      a `👉 Count them!` control that clears the badges and hands the count back
      to the child.
- [x] Grown-up setting `numbersCounting`: `auto` (model once, then hand over —
      the default), `watch` (always model; the shipped P9 behavior), `tap`
      (always child-led). This keeps P9's behavior reachable for observation and
      for a child not yet ready to lead.

### Why the modeled count survives

P9 shipped the automatic count deliberately, and its own follow-on note gates
tap-to-count on observation. Removing the demonstration outright would discard
that evidence-led work: a child cannot tap-to-count before seeing what counting
is. Modeling once and then handing over satisfies both — the demonstration still
happens, it just stops repeating forever.

## Phase 2 — Conservation of number

- [x] After a completed count, offer `🔀 Move them!`.
- [x] Rearrange **the same DOM nodes**, cycling through arrangements on repeated
      taps. Object identity must be preserved; nodes are never removed and
      recreated, or the demonstration is meaningless.
- [x] Ship three arrangements: the default grid, the same grid spread far
      apart, and a tight three-column bunch. That is the Piagetian
      spread-versus-bunched contrast, and all three are plain spacing changes — no absolute positioning and no
      coordinate math, so nothing can drift out of the play area. Ring and
      scatter arrangements are a follow-on.
- [x] Animate with FLIP: measure, change the layout class, measure again, apply
      the inverse transform and release it. The nodes persist through the
      change, so identity survives even when the animation is suppressed.
- [x] Clear the badges after the move and invite a re-count: "Still how many?"
- [x] On completion, state the invariance directly: "Still four. Moving them did
      not change how many."
- [x] Under reduced motion the objects jump rather than glide. Identity is
      preserved because the nodes persist; assert that in the tests rather than
      animating around the preference.

This is the highest-value non-drill concept available in the module. It is
conceptual, it has no right answer to type, and it cannot be drilled.

## Phase 3 — More than one representation

- [x] A control strip switches the same quantity between representations:
      objects, ten frame, dots.
- [x] Reuse [`tenFrame`](../../js/math/manipulatives.js) and `dotCard` from the
      math manipulatives library, which already carry CSS. The visual language
      then matches Math Lab, so a ten frame is not novel when the child later
      reaches `adding10`.
- [x] Do **not** reuse `handleCounterTap` or `countAloud`. They speak a running
      total with `interrupt: true` and carry Math Lab's answer semantics;
      Numbers keeps its own tap handler so the ordinal badges, cardinality
      phrasing, and the P9 speech watchdog stay in one place.
- [x] The ten frame is offered only for quantities it can hold, which covers the
      whole 0–9 range.
- [x] Every representation supports the same tap-to-count. The ten frame's cells
      are fixed, so it offers counting but not rearrangement.

## Phase 4 — What the grown-up can see

- [x] Persist a small observation record in `edamame-numbers-progress`: per numeral,
      whether it has been modeled, counted independently, and re-counted after a
      rearrangement.
- [x] Surface it in the grown-up panel as a readout, alongside the existing Math
      and Words summaries, with the same two-tap protected reset.
- [x] Keep it **invisible to the child**. No score, no stars, no progress bar in
      the module itself.
- [x] Do **not** write into `LabProgress`. Math Lab's ladder is explicit that
      assistance "cannot silently push a child into a new concept"; injecting
      mastery from a different module with different evidence would break that
      contract. The readout informs a grown-up, who can pin a Math stage
      themselves if they want to act on it.

## Phase 5 — Deferred pending observation

Planned, not committed. Both are more drill-adjacent than Phases 1–3 and should
wait for evidence that children want them.

- [ ] **Subitizing peek** for 1–3: flash an arrangement, hide it, ask "how
      many?". To stay non-drill, an answer is never marked wrong — the app
      reveals and counts together afterwards regardless.
- [ ] **Finger patterns** as a fourth representation. High value for this age,
      but it needs new artwork (SVG hands) rather than reuse, so it is not
      bundled with Phase 3.

## Visual and accessibility rules

- [x] `#number-objects` currently carries `role="img"`. An element with
      `role="img"` may not contain interactive descendants, so it becomes a
      labelled `role="group"` once the objects are buttons. The completed-set
      quantity keeps its own live status element.
- [x] Each object button is labelled with its state — "Apple 3, not counted yet"
      / "Apple 3, counted three" — so the count is followable without sight.
- [x] Every control meets the 44px minimum touch target.
- [x] The complete nine-object set plus every control fits the play area on
      desktop, Pixel, and iPhone without scrolling. The control row wraps rather
      than pushing objects off screen.
- [x] Reduced motion removes reveal, settle, and rearrangement animation while
      leaving every state change perceivable.

## Acceptance coverage

Numbers coverage moves out of `tests/learning.spec.js` into a dedicated
`tests/numbers.spec.js`, matching how Words and Math Lab are already split. The
existing P9 assertions move across unchanged.

- [x] Existing P9 contracts still pass: stable slots, reveal-before-speech,
      guarded stall recovery, cancel-on-new-numeral, cancel-on-mode-change,
      zero as an empty set, singular/plural wording, nine-object fit.
- [x] A first press of a numeral models the count; a second press of the same
      numeral hands it straight to the child.
- [x] Taps in a non-sequential order still count 1, 2, 3… in tap order.
- [x] A second tap on a counted object re-speaks its ordinal and does not
      advance the count.
- [x] Completing the count by tapping states cardinality once, with correct
      singular and plural wording.
- [x] `Move them!` preserves object identity and count, clears badges, and the
      completed re-count states invariance.
- [x] Each representation shows the same quantity and supports tap-to-count.
- [x] `numbersCounting` set to `watch` reproduces the P9 behavior exactly.
- [x] The observation record persists across a reload and never renders inside
      the play area.
- [x] Serious/critical axe checks pass in the populated, mid-count, and
      rearranged states.
- [x] Desktop Chromium, desktop WebKit, Pixel, and iPhone layouts covered.

## Follow-on observations

- Watch whether children tap objects they have already counted, and whether the
  badges help or distract. If badges distract, try emphasizing only the most
  recent one.
- Watch whether the modeled first encounter is still wanted after a few
  sessions, or whether `auto` should stop modeling once a numeral has been
  counted independently several times.
- Watch whether rearrangement reads as "the objects moved" or as "new objects
  appeared". If the latter, slow the movement or trail the path.
- Revisit Phase 5 only after Phases 1–3 have been observed with a child.
