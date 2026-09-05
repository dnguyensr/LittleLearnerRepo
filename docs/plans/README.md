# Edamame — Roadmap

Edamame is a GitHub Pages web app for pre-K through 1st grade. It is a plain-ES-module app with Free Play, Piano, Letters, Numbers, Math, and Words modes:

- **Free Play** — keyboard/touch play with tones and visual effects.
- **Piano** — touch and physical-key piano.
- **Letters & Numbers** — spoken, animated early recognition and counting.
- **Math** — readiness-based counting and arithmetic with manipulatives and child-chosen paths.
- **Words** — guided sound-to-spelling practice with sound boxes, child-chosen paths, and Word Stars.
- **Patterns** — extend a repeating pattern; tap-only, no keyboard, no reading.

Touch input, ES modules, responsive layouts, and automated browser coverage are shipped. The remaining roadmap grows the learning content while keeping GitHub Pages deployment simple: no build step, runtime dependencies, or backend.

## Priorities

P1–P3 and the core of P4–P16 are shipped; P17 is the active evidence and release-hardening plan. Each linked plan records remaining follow-up work.

| Priority | Plan | Why this order |
| --- | --- | --- |
| P1 | [Mobile & touch input support](01-mobile-touch-support.md) | The app doesn't work at all on phones/tablets; touch input and an on-screen keyboard unblock every device. |
| P2 | [Refactor to ES modules](02-refactor-es-modules.md) | Split the 1,000+ line `index.html` into supporting scripts before adding features, so new code lands in a clean structure. |
| P3 | [Piano mode](03-piano-mode.md) | New mode with an on-screen piano and a pianist-friendly keyboard mapping; removes the drum sounds. Builds on P1's input layer and P2's structure. |
| P4 | [Learning module improvements & new modules](04-learning-modules.md) | Upgrade Math and Words, then add new pre-K–1st modules (letters, numbers, shapes, sight words). |
| P5 | [Testing, tooling & accessibility](05-testing-tooling.md) | npm dev tooling, Playwright E2E, axe accessibility scans, CI. Phased last, but start it alongside P2 so the refactor is protected by tests. |
| P6 | [Math readiness paths and guided learning](06-math-readiness.md) | **The shipped Math curriculum.** A shared foundation branches into continued addition, subtraction, or Big Addition. Build, See & Write; Practice & Columns; Frames & Number Lines; and Variety remain selectable presentation lenses. Guided subtraction and place-value lessons are included at their readiness gates. |
| P7 | [Speech quality](07-speech-quality.md) | Voice selection fixed (deterministic, locale-aware, resilient to each platform's broken `getVoices()`). A bundled neural engine (Kokoro/Piper, 63–92 MB) is a spike gated on measurements from the real target tablet — with pre-generated audio clips as the cheaper alternative to price first. |
| P8 | [Toddler letter foundations](08-letter-foundations.md) | **The shipped Letters introduction.** Letter names, upper/lowercase forms, familiar sound-consistent examples, and separately replayable phonics are presented one relationship at a time. |
| P9 | [Stable, meaningful counting](09-number-foundations.md) | **The shipped Numbers introduction.** Stable object slots coordinate visual and spoken one-to-one counting, then connect the final number word to the whole set's quantity. |
| P10 | [Guided word building](10-guided-word-building.md) | **Implemented direct replacement for Words.** Spoken-word segmentation, sound boxes, authored grapheme tiles, 5-of-6 readiness, recoverable guidance, reversible paths, later spelling patterns, and Word Stars replace visible-answer copying and length tiers. Reviewed local phoneme recordings and observed-child release sessions remain pre-release gates. |
| P11 | [Interactive counting](11-interactive-counting.md) | **Active plan.** Numbers moves from a narrated demonstration to a child-performed activity: tap-to-count with order irrelevance, conservation of number, and more than one representation of the same quantity. Supersedes P9's open follow-on notes. |
| P12 | [Readable contrast](12-readable-contrast.md) | **Implemented.** The random background palette was failing 83 of 90 white-text contrast combinations, several at 1.2:1. Deeper gradients, dark panel surfaces instead of white washes, a deterministic contrast tool because axe cannot judge text over a gradient, and a polite live region for mode changes. |
| P13 | [Letter formation](13-letter-formation.md) | **Implemented as guided stroke-order practice.** The child follows numbered waypoints along a letter's strokes in handwriting order; because the app draws each segment, it does not claim that tapping is handwriting. Deliberately not the initial-sound match P8 proposed — Words already ships that. |
| P14 | [Patterns](14-patterns.md) | **Implemented.** A new tap-only mode for the one pre-K mathematical skill nothing in the app touched: noticing a repeating unit and extending it. A choice that does not fit is never marked wrong — the row is read again and the choice stays open. |
| P15 | [Keyboard access](15-keyboard-access.md) | **Implemented.** Nothing in the play area can be reached or activated by a keyboard — the app swallows every keydown on purpose, for good kiosk reasons. Resolves the conflict by routing on focus rather than compromising either side. |
| P16 | [Rebrand to Edamame](16-rebrand-edamame.md) | **Implemented.** The name still sold a keyboard smasher while eight learning modes shipped behind it. Renamed the product, added the favicon/manifest/meta identity that never existed, and led the mode buttons with Letters and Numbers. The `lls-` storage prefix is renamed to `edamame-` in the same pass, taken now because pre-release was the last moment it was free. Moving the keyboard toggle out of the top bar was tried and reverted: it cost vertical space the child's activity needs. |
| P17 | [Evidence, readiness, and release hardening](17-evidence-and-release-hardening.md) | **Active.** Makes evidence strength and product inference explicit, keeps standards as quiet compatibility mappings, replaces permanent short-window “mastery” with defensible readiness, closes release-gate contradictions, and hardens progress, accessibility, and validation contracts. |

## Conventions

- These plans are committed to the repo; update the checklists in the same PR/commit as the work they describe.
- New module ideas go in the "New module ideas" section of [04-learning-modules.md](04-learning-modules.md).
- **Math curriculum work goes in the shipped Math experience** ([06](06-math-readiness.md)). Its internal mode id remains `mathlab` for saved-score compatibility; the old `math.js` mode is unregistered pending removal.
- The site must keep working when deployed as-is from the `main` branch to GitHub Pages: relative paths only, no bundler, no server-side anything. npm is for dev tooling (tests, linting, typechecking) only.
- Types are JSDoc comments checked by `npm run typecheck` (`tsc --noEmit`). There are no `.ts` files and nothing is compiled — the `.js` in the repo is exactly what ships. Shared contracts live in [js/types.js](../../js/types.js).
- Toddler-first design rules apply everywhere: big touch targets, no dead ends, wrong answers are always recoverable, sounds and celebrations over text, no reading required to navigate.
