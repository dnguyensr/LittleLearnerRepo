# P13 — Letter formation: making the letter, not picking it

> **Status (2026-09-03): Implemented.** Extends the shipped Letters introduction in
> [08-letter-foundations.md](08-letter-foundations.md) rather than replacing it.

## Why this, and why not the obvious thing

P8's own follow-on note proposes an initial-sound match — "which picture starts
like apple?". That should **not** be built. Words already ships exactly it, as
the `firstSoundsContinuous` and `firstSoundsStops` skills, with sound boxes,
readiness tracking and recoverable guidance. A second copy in Letters would
compete with the curriculum module rather than feed it.

The real gap is the same one Numbers had before
[P11](11-interactive-counting.md): the child never *does* anything. Letters
shows a letter and offers three replay buttons. Everything on screen is the app
talking.

The move is **formation** — the child makes the letter. It is the one alphabet
skill that is constructive rather than selective, it is not covered anywhere in
the app, and it does not overlap Words. "Which of these four is a B?" would be a
recognition drill; drawing a B is not a drill at all, because there is nothing to
get wrong.

## Evidence used

- The [National Early Literacy Panel](https://lincs.ed.gov/publications/pdf/NELPEarlyBeginnings09.pdf)
  identifies letter *writing* alongside letter naming among the strongest
  predictors of later literacy — the two are listed separately because they are
  separate skills.
- Studies of handwriting versus typing in preschoolers report that producing a
  letter by hand supports later recognition of that letter better than selecting
  it does, which is the argument for a constructive activity over a matching
  one.
- Handwriting curricula teach a consistent **stroke order and direction** rather
  than letting a child arrive at the shape any way they can, because the motor
  sequence is part of what is being learned.
- P11's "model once, then hand over" (gradual release) applies unchanged: a
  child cannot trace a path they have not seen drawn.

The specific paths, the tap-a-waypoint interaction and the wording are product
decisions derived from these, not prescriptions from any of them.

## The interaction

A handwriting worksheet, made tappable.

- The letter appears large as a faint outline with numbered waypoints along its
  strokes, in the order a hand would draw them.
- **Only the next waypoint is live.** It is large, bright and pulsing; the
  others are small inert markers. So the touch target is always one big dot, a
  mis-tap costs nothing, and stroke order is taught by the interaction rather
  than corrected after the fact.
- Each tap draws the segment from the previous waypoint, so the letter builds up
  under the child's finger.
- Finishing draws the whole letter solid and says so: "You made B!"
- `👀 Watch me` animates the full path first. On a letter's first visit the
  animation plays automatically, then hands over — the same rule Numbers uses.
- Nothing is scored, nothing can be wrong, and the activity is always
  abandonable by pressing another letter.

## Scope

- [x] Uppercase A–Z only. Lowercase forms are shown for reading, as they already
      are, but tracing them needs a second set of paths and introduces
      ascenders, descenders and a different baseline. It is a follow-on.
- [x] Stroke paths as waypoint lists in a 0–100 box, in `js/data/letter-paths.js`,
      so the geometry is data rather than code and can be corrected without
      touching the mode.
- [x] Straight-line letters use their true corners; curved letters (C, G, O, Q,
      S, U, J, B, D, P, R) are approximated by enough waypoints to read as the
      curve.
- [x] Keep every P8 behaviour: the letter, its example word, the highlighted
      grapheme, the three replay targets, phonics emphasis, and score-free
      exploration.

## Build

- [x] `js/data/letter-paths.js` — one entry per letter, each a list of strokes,
      each stroke a list of `[x, y]` waypoints.
- [x] Render the letter as an inline SVG: a faint guide path, a drawn path that
      grows, and one `<button>` per waypoint.
- [x] Track the active waypoint across strokes; a stroke boundary lifts the
      "pen" so no segment is drawn between the end of one stroke and the start
      of the next.
- [x] `👀 Watch me` traces the path with a timed animation, respecting
      `prefers-reduced-motion` by drawing it immediately instead.
- [x] A grown-up setting is **not** added. Letters has no equivalent of the
      count/watch/tap decision — the activity is opt-in by tapping, and the
      exploratory default is unchanged.

## Visual and accessibility rules

- [x] The active waypoint is at least 44px; inactive markers are decorative and
      `aria-hidden`.
- [x] The active waypoint is labelled by position ("Start B here", "Next point,
      3 of 7") so the sequence is followable without sight.
- [x] The letter, its controls and the example row fit the play area on desktop,
      Pixel and iPhone with the on-screen keyboard open.
- [x] Reduced motion removes the tracing animation and the pulse, leaving every
      state change visible.
- [x] Serious/critical axe checks pass with the tracing surface on screen.

## Acceptance coverage

- [x] Every letter A–Z has at least one stroke and every stroke at least two
      waypoints.
- [x] Tapping waypoints in order draws the letter and completes it.
- [x] Only the next waypoint is operable; the others are inert.
- [x] A stroke boundary does not draw a connecting segment.
- [x] Completing announces the letter by name.
- [x] Choosing another letter abandons a part-finished trace cleanly.
- [x] The P8 contracts still pass unchanged.
- [x] Desktop Chromium, desktop WebKit, Pixel and iPhone.

## Notes from the build

- The example word is hidden while the worksheet is open. The letter, its
  strokes and three controls do not fit a phone with the letter keyboard open
  otherwise, and the word returns the moment another letter is pressed.
- No dot is live during the demonstration. The first build let a child tap while
  the app was still drawing, and the hand-over that followed wiped what they had
  done — the worst kind of unresponsive.
- The active dot pulses with a glow rather than a scale. An endlessly moving
  target is hard for a small hand to hit, and it also never settles for any
  pointer-actionability check.
- Inert dots take no pointer events. Beyond tidiness this is load-bearing: the
  end of one stroke and the start of the next share a point in L, Y, Z and G, so
  a marking would otherwise sit on top of the live dot and swallow the tap.
- Constraining the container's height is scoped to the tracing state. Applying
  it always moved where `#letter-display`'s `pop` animation landed relative to
  `#letter-example`, and a tap meant for the example word replayed the letter
  name instead.

## Follow-on observations

- Lowercase paths, once uppercase has been watched with a child.
- Whether children want to drag along the path rather than tap the waypoints. A
  drag is closer to writing, but it is much harder to make forgiving, and taps
  keep the app's tap-first rule intact.
- Whether the numbered markers help or clutter; the alternative is showing only
  the active one.
