# Little Learner Keys — Roadmap

Little Learner Keys is a GitHub Pages web app for pre-K through 1st grade. It is a plain-ES-module app with Free Play, Piano, Letters, Numbers, Math, and Words modes:

- **Free Play** — keyboard/touch play with tones and visual effects.
- **Piano** — touch and physical-key piano.
- **Letters & Numbers** — spoken, animated early recognition and counting.
- **Math** — readiness-based counting and arithmetic with manipulatives and child-chosen paths.
- **Words** — guided sound-to-spelling practice with sound boxes, child-chosen paths, and Word Stars.

Touch input, ES modules, responsive layouts, and automated browser coverage are shipped. The remaining roadmap grows the learning content while keeping GitHub Pages deployment simple: no build step, runtime dependencies, or backend.

## Priorities

P1–P3 and the core of P4–P7 are shipped; each linked plan records remaining follow-up work.

| Priority | Plan | Why this order |
| --- | --- | --- |
| P1 | [Mobile & touch input support](01-mobile-touch-support.md) | The app doesn't work at all on phones/tablets; touch input and an on-screen keyboard unblock every device. |
| P2 | [Refactor to ES modules](02-refactor-es-modules.md) | Split the 1,000+ line `index.html` into supporting scripts before adding features, so new code lands in a clean structure. |
| P3 | [Piano mode](03-piano-mode.md) | New mode with an on-screen piano and a pianist-friendly keyboard mapping; removes the drum sounds. Builds on P1's input layer and P2's structure. |
| P4 | [Learning module improvements & new modules](04-learning-modules.md) | Upgrade Math and Words, then add new pre-K–1st modules (letters, numbers, shapes, sight words). |
| P5 | [Testing, tooling & accessibility](05-testing-tooling.md) | npm dev tooling, Playwright E2E, axe accessibility scans, CI. Phased last, but start it alongside P2 so the refactor is protected by tests. |
| P6 | [Math readiness paths and guided learning](06-math-readiness.md) | **The shipped Math curriculum.** A shared evidence-led foundation branches into continued addition, subtraction, or Big Addition. Singapore mastery is the fresh default; Traditional practice, Visual strategies, and Balanced mix remain selectable lenses. Guided subtraction and place-value lessons are included at their readiness gates. |
| P7 | [Speech quality](07-speech-quality.md) | Voice selection fixed (deterministic, locale-aware, resilient to each platform's broken `getVoices()`). A bundled neural engine (Kokoro/Piper, 63–92 MB) is a spike gated on measurements from the real target tablet — with pre-generated audio clips as the cheaper alternative to price first. |
| P8 | [Toddler letter foundations](08-letter-foundations.md) | **The shipped Letters introduction.** Letter names, upper/lowercase forms, familiar sound-consistent examples, and separately replayable phonics are presented one relationship at a time. |
| P9 | [Stable, meaningful counting](09-number-foundations.md) | **The shipped Numbers introduction.** Stable object slots coordinate visual and spoken one-to-one counting, then connect the final number word to the whole set's quantity. |
| P10 | [Guided word building](10-guided-word-building.md) | **Implemented direct replacement for Words.** Spoken-word segmentation, sound boxes, authored grapheme tiles, 5-of-6 readiness, recoverable guidance, reversible paths, later spelling patterns, and Word Stars replace visible-answer copying and length tiers. Reviewed local phoneme recordings and observed-child release sessions remain pre-release gates. |

## Conventions

- These plans are committed to the repo; update the checklists in the same PR/commit as the work they describe.
- New module ideas go in the "New module ideas" section of [04-learning-modules.md](04-learning-modules.md).
- **Math curriculum work goes in the shipped Math experience** ([06](06-math-readiness.md)). Its internal mode id remains `mathlab` for saved-score compatibility; the old `math.js` mode is unregistered pending removal.
- The site must keep working when deployed as-is from the `main` branch to GitHub Pages: relative paths only, no bundler, no server-side anything. npm is for dev tooling (tests, linting, typechecking) only.
- Types are JSDoc comments checked by `npm run typecheck` (`tsc --noEmit`). There are no `.ts` files and nothing is compiled — the `.js` in the repo is exactly what ships. Shared contracts live in [js/types.js](../../js/types.js).
- Toddler-first design rules apply everywhere: big touch targets, no dead ends, wrong answers are always recoverable, sounds and celebrations over text, no reading required to navigate.
