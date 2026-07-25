# P2 — Refactor to ES Modules

Goal: `index.html` stays the single GitHub Pages entry point, but the ~1,000 lines of inline CSS/JS move into supporting files loaded as plain ES modules. No build step, no bundler — push to `main` and Pages serves it.

## Target layout

```text
index.html              # markup + <link> to css + <script type="module" src="js/main.js">
css/styles.css          # all styles (split further later if it grows)
js/main.js              # bootstrapping, mode registry, top-bar wiring
js/input.js             # physical keyboard + on-screen keyboard + pointer dispatch (from P1)
js/audio.js             # AudioContext, tone/success/wrong sounds, future piano voice
js/effects.js           # bubbles, stars, flying keys, celebration helper
js/modes/freeplay.js
js/modes/math.js
js/modes/words.js
js/modes/piano.js       # added in P3
js/data/words.js        # easyWords list (tiered in P4)
js/data/math-items.js   # mathItems list
```

## Checklist

- [ ] Extract all CSS from the `<style>` block into `css/styles.css`; link it from `index.html`.
- [ ] Move the word list and math items into `js/data/` modules exporting plain arrays.
- [ ] Move audio code into `js/audio.js`: context creation, unlock-on-gesture, `playTone`, `playSuccessSound`, `playWrongSound`. (Drum code is deleted in P3 — keep it here untouched for now.)
- [ ] Move effects into `js/effects.js`: `createBubble`, `createStar`, `createFlyingKey`, plus a shared `celebrate()` that both Math and Words currently duplicate.
- [ ] Introduce a mode-registry pattern in `js/main.js`: each mode module exports `{ id, label, icon, activate(), deactivate(), onKey(key) }`. Replace the `currentMode` / `learnMode` / `mathMode` boolean tangle and the hand-written `setMode` toggling with a loop over registered modes.
- [ ] Mode buttons in the top bar are generated from the registry (so P3/P4 modes are one-line additions).
- [ ] `js/input.js` owns all event listeners and forwards to the active mode's `onKey` (aligns with the P1 input abstraction — do P1 and P2 together if convenient).
- [ ] Use **relative** paths everywhere (`./js/main.js`, `./css/styles.css`) — the Pages site is served from `/LittleLearnerRepo/`, so absolute paths break.
- [ ] Add a note to the repo README: ES modules don't load over `file://`; develop with a local static server (`npx serve` or `python -m http.server`).

## Behavior-preserving smoke checklist (run before and after)

- [ ] Free Play: press letters/numbers → big key display, tone, background change, bubbles/stars, flying previous key, history updates (max 8).
- [ ] Words: correct letter advances with green box + effects, wrong letter shakes red + buzz, completing a word celebrates and picks a new one, score increments.
- [ ] Math: number keys build the answer, correct answer celebrates and (for subtraction) shows the remaining emojis, wrong full-length answer flashes red and resets.
- [ ] Mode buttons toggle correctly; Fullscreen works; audio resumes after first click/tap.
- [ ] Site works when served from a subpath (simulate GitHub Pages project path).
