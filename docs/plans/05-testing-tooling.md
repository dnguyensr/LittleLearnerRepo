# P5 — Testing, Tooling & Accessibility

Goal: once npm enters the repo (dev tooling only — the deployed site stays dependency-free static files), add Playwright E2E coverage, axe accessibility scans, and CI. **Start this alongside P2**: the refactor is much safer with a smoke-test suite watching it.

## npm setup (dev-only)

- [ ] `package.json` with `"private": true`, no runtime dependencies; devDependencies: `@playwright/test`, `@axe-core/playwright`, a static server (`serve` or `http-server`).
- [ ] Scripts: `serve` (local static server), `test` (Playwright), `test:ui` (Playwright UI mode), `lint` (added later if ESLint lands).
- [ ] Confirm `.gitignore` covers `node_modules/`, `test-results/`, `playwright-report/` (already in root `.gitignore`).
- [ ] Playwright config: `webServer` block that launches the static server so `npx playwright test` is one command; `baseURL` pointing at it.

## Playwright E2E specs

- [ ] **Free Play**: pressing a letter shows it big, adds to history (max 8), changes background; on-screen keyboard tap does the same; tap-anywhere spawns effects.
- [ ] **Words**: correct letter marks the box completed; wrong letter shows shake state; completing a word increments the score and loads a new word.
- [ ] **Math**: correct answer celebrates and advances; wrong answer flashes and resets; number pad taps work.
- [ ] **Piano** (after P3): tapping a piano key highlights it; physical key mapping (Z → C4) highlights the same key; chords highlight multiple keys.
- [ ] **Mode switching**: each mode button activates its container and deactivates the others; state resets sanely.
- [ ] **Audio**: assert the AudioContext resumes after a user gesture (can't assert sound itself; assert `audioContext.state === 'running'` via `page.evaluate`).
- [ ] Device matrix via Playwright projects: desktop Chromium + WebKit, plus mobile presets (e.g. `iPhone 14`, `iPad (gen 7)`) to cover coarse-pointer/on-screen-keyboard behavior and both orientations.

## Accessibility (axe + manual)

- [ ] `@axe-core/playwright` scan of each mode as part of the E2E suite; fail CI on serious/critical violations.
- [ ] Icon-only buttons get `aria-label`s; mode buttons expose state (`aria-pressed`).
- [ ] Check color contrast of white text over the pastel gradients (several current gradients likely fail 4.5:1) — add a text-shadow/scrim or adjust palette.
- [ ] `prefers-reduced-motion`: gate the heavy animations (flying keys, star bursts, bounces) behind the media query.
- [ ] Keyboard/focus: the on-screen keyboards are reachable and operable with a physical keyboard and screen reader; focus is never trapped or invisible.
- [ ] Live-region announcements for mode changes and correct/incorrect feedback (`aria-live="polite"`), so the app isn't silent to screen readers.

## CI (GitHub Actions)

- [ ] Workflow on push/PR to `main`: install deps, `npx playwright install --with-deps chromium webkit`, run the test suite (which includes axe scans), upload the HTML report as an artifact on failure.
- [ ] CI is a **gate, not a deploy pipeline** — GitHub Pages keeps serving straight from the branch with no build. Optionally switch Pages to the "GitHub Actions" source later only if a deploy-after-green gate is wanted.
- [ ] Badge in the repo README once the workflow is green.

## Optional / later

- [ ] ESLint (flat config) + Prettier, aligned with `.editorconfig` (4-space JS/CSS/HTML, 2-space JSON/MD/YML).
- [ ] Code coverage from Playwright's V8 coverage API (via `c8`/`monocart-reporter`) if coverage numbers become interesting.
- [ ] Visual regression snapshots for the piano layout and on-screen keyboards (`toHaveScreenshot`), tolerant thresholds since gradients animate.
