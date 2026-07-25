# Little Learner Keys — Roadmap

Little Learner Keys is a GitHub Pages web app for toddlers (pre-K through 1st grade). Today it is a single `index.html` with three keyboard-only modes:

- **Free Play** — key smasher: any key shows the character, plays a tone, and spawns effects; F1–F12 trigger drum sounds.
- **Math** — emoji counting problems (addition, and subtraction framed as "the horse eats 2 apples") answered with number keys.
- **Words** — spell the displayed word letter by letter.

Everything is driven by physical `keydown` events, so the app is effectively unusable on phones and tablets. This roadmap fixes that and grows the app into a small suite of learning modules while keeping the GitHub Pages deployment dead simple (no build step — `index.html` plus plain ES modules pushed to `main`).

## Priorities

Work through the plans in this order. Each file is a checklist; check items off (`- [x]`) as they land.

| Priority | Plan | Why this order |
| --- | --- | --- |
| P1 | [Mobile & touch input support](01-mobile-touch-support.md) | The app doesn't work at all on phones/tablets; touch input and an on-screen keyboard unblock every device. |
| P2 | [Refactor to ES modules](02-refactor-es-modules.md) | Split the 1,000+ line `index.html` into supporting scripts before adding features, so new code lands in a clean structure. |
| P3 | [Piano mode](03-piano-mode.md) | New mode with an on-screen piano and a pianist-friendly keyboard mapping; removes the drum sounds. Builds on P1's input layer and P2's structure. |
| P4 | [Learning module improvements & new modules](04-learning-modules.md) | Upgrade Math and Words, then add new pre-K–1st modules (letters, numbers, shapes, sight words). |
| P5 | [Testing, tooling & accessibility](05-testing-tooling.md) | npm dev tooling, Playwright E2E, axe accessibility scans, CI. Phased last, but start it alongside P2 so the refactor is protected by tests. |

## Conventions

- These plans are committed to the repo; update the checklists in the same PR/commit as the work they describe.
- New module ideas go in the "New module ideas" section of [04-learning-modules.md](04-learning-modules.md).
- The site must keep working when deployed as-is from the `main` branch to GitHub Pages: relative paths only, no bundler, no server-side anything. npm is for dev tooling (tests, linting) only.
- Toddler-first design rules apply everywhere: big touch targets, no dead ends, wrong answers are always recoverable, sounds and celebrations over text, no reading required to navigate.
