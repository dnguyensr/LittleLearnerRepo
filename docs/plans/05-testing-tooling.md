# P5 — Testing, Tooling & Accessibility

Goal: once npm enters the repo (dev tooling only — the deployed site stays dependency-free static files), add Playwright E2E coverage, axe accessibility scans, and CI. **Start this alongside P2**: the refactor is much safer with a smoke-test suite watching it.

> **Status (2026-07-25):** implemented (done after P3, before P4). 28 specs × 4 device projects; chromium + mobile-chrome verified locally (56/56 passing), webkit runs in CI.

## npm setup (dev-only)

- [x] `package.json` with `"private": true`, no runtime dependencies; devDependencies: `@playwright/test`, `@axe-core/playwright`. Static serving is the zero-dependency `tools/serve.js` (Node built-ins only).
- [x] Scripts: `serve` (local static server), `test` (Playwright), `test:ui` (Playwright UI mode). `lint` deferred until ESLint lands.
- [x] `.gitignore` covers `node_modules/`, `test-results/`, `playwright-report/`; `package-lock.json` is committed for `npm ci`.
- [x] Playwright config: `webServer` block launches `tools/serve.js` so `npx playwright test` is one command; `baseURL` `http://localhost:8123`.

## Playwright E2E specs

- [x] **Free Play**: pressing a letter shows it big, adds to history (max 8); on-screen keyboard tap does the same; tap-anywhere spawns bubble/star effects. (`tests/freeplay.spec.js`)
- [x] **Words**: correct letter marks the box completed; wrong letter doesn't advance; completing a word increments the score and loads a new word. (`tests/words.spec.js`)
- [x] **Math**: correct answer (computed by grapheme-counting the emoji groups) scores and advances; wrong answer resets; numpad tap + backspace work. (`tests/math.spec.js`)
- [x] **Piano**: physical mapping (Z → C4, S → C#4) highlights and sustains keys until release; chords keep multiple keys active; pointer press/release works; OSK hidden in piano mode; mobile gets the one-octave layout. (`tests/piano.spec.js`)
- [x] **Mode switching**: registry-generated buttons, container toggling, `aria-pressed`, tap-active-returns-to-free, QWERTY↔numpad swap, score visibility. (`tests/modes.spec.js`)
- [x] **Audio**: `getAudioState()` (exported from `js/audio.js` for tests) asserted `running` after a user gesture (chromium projects, with `--autoplay-policy=no-user-gesture-required`).
- [x] Device matrix via Playwright projects: desktop Chromium + WebKit, Pixel 7, iPhone 14 (coarse-pointer/on-screen-keyboard behavior covered by the mobile projects).

## Accessibility (axe + manual)

- [x] `@axe-core/playwright` scan of each of the 4 modes in `tests/a11y.spec.js`; fails on serious/critical violations. **`color-contrast` rule is disabled pending the palette pass below.**
- [x] Icon-only buttons have `aria-label`s; mode buttons expose state (`aria-pressed`).
- [x] Check color contrast of white text over the pastel gradients — done in [P12](12-readable-contrast.md). It was far worse than "likely fail": 83 of 90 combinations failed, several at 1.2:1. The palette was deepened, every translucent white panel became a dark one, and the `color-contrast` axe rule is enabled again. axe returns *incomplete* for text over a gradient, so `tools/contrast.js` and `tests/contrast.spec.js` are the real guard.
- [x] `prefers-reduced-motion`: gate the heavy animations (flying keys, star bursts, bounces) behind the media query. Done app-wide 2026-08-01: CSS media block collapses keyframes/transitions; `js/effects.js` suppresses spawned effects (bubbles, stars, flying keys) at the source. Spec in `tests/a11y.spec.js` runs with `reducedMotion: 'reduce'`.
- [ ] Keyboard/focus — designed in [P15](15-keyboard-access.md). Measured: focus never leaves `<body>`, and Enter/Space on a focused control do nothing, so no play-area element is reachable or operable by keyboard at all. The swallow is deliberate kiosk behaviour, so P15 resolves it by routing on focus rather than by letting keys through.
- [x] Live-region announcements for mode changes — `#instructions` is a polite live region ([P12](12-readable-contrast.md)). Per-answer correct/incorrect feedback already announces through each mode's own `role="status"` elements.

## CI (GitHub Actions)

- [x] `.github/workflows/ci.yml` on push/PR to `main`: `npm ci`, `npx playwright install --with-deps chromium webkit`, run the test suite (includes axe scans), upload the HTML report as an artifact on failure.
- [x] CI is a **gate, not a deploy pipeline** — GitHub Pages keeps serving straight from the branch with no build.
- [ ] Badge in the repo README once the workflow is green on GitHub.

## Optional / later

- [x] ESLint flat config (`eslint.config.js`), aligned with `.editorconfig`, split across the three environments in this repo: `js/` is browser ES modules, `tests/` and `tools/` are CommonJS under Node. It runs in CI as `npm run lint`. The whole codebase had four violations, all now fixed.
- [ ] **Prettier: configured but deliberately not applied.** `.prettierrc.json` matches `.editorconfig` and `npm run format` is ready, but running it rewrites **62 of 80 files** — mostly line re-wrapping over hand-formatted code whose comment layout is load-bearing. That churn would bury real changes in review, so it is a one-command decision left for a moment when the tree is otherwise quiet, not something to slip into a feature branch. `npm run format:check` is not wired into CI for the same reason.
- [ ] Code coverage from Playwright's V8 coverage API (via `c8`/`monocart-reporter`) if coverage numbers become interesting.
- [ ] Visual regression snapshots for the piano layout and on-screen keyboards (`toHaveScreenshot`), tolerant thresholds since gradients animate.
