# P2 — Refactor to ES Modules

Goal: `index.html` stays the single GitHub Pages entry point, but the ~1,000 lines of inline CSS/JS move into supporting files loaded as plain ES modules. No build step, no bundler — push to `main` and Pages serves it.

> **Status (2026-07-25):** implemented. `index.html` is now ~45 lines of markup; all CSS/JS lives in `css/` and `js/`. Smoke-tested headlessly via a local server + Edge (all modes exercised).

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

- [x] Extract all CSS from the `<style>` block into `css/styles.css`; link it from `index.html`.
- [x] Move the word list and math items into `js/data/` modules exporting plain arrays (`js/data/words.js`, `js/data/math-items.js`; duplicate NOSE entry removed while extracting).
- [x] Move audio code into `js/audio.js`: context creation, unlock-on-gesture, `playTone`/`playKeyTone`, `playSuccessSound`, `playWrongSound`. (Drum code kept as `playDrum` — deleted in P3.)
- [x] Move effects into `js/effects.js`: `createBubble`, `createStar`, `createFlyingKey`, plus a shared `celebrate()` (dedupes the Math/Words celebration code and owns the score display).
- [x] Introduce a mode-registry pattern: each mode module exports `{ id, label, icon, oskLayout, instructions, activate(), deactivate(), onKey(key, source), onTap?(x, y) }`; `js/main.js` drives activation. The `currentMode`/`learnMode`/`mathMode` boolean tangle is gone.
- [x] Mode buttons in the top bar are generated from the registry (so P3/P4 modes are one-line additions).
- [x] `js/input.js` owns all event listeners (physical keys, on-screen keyboard, tap-anywhere) and forwards to the active mode's `onKey`/`onTap`.
- [x] Use **relative** paths everywhere (`./js/main.js`, `./css/styles.css`) — the Pages site is served from `/LittleLearnerRepo/`, so absolute paths break.
- [x] Add a note to the repo README: ES modules don't load over `file://`; develop with a local static server.

## Behavior-preserving smoke checklist (run before and after)

Verified headlessly (local server + headless Edge driving synthetic events); worth one manual pass in a real browser for sound/visuals:

- [x] Free Play: press letters/numbers → big key display, tone, background change, bubbles/stars, flying previous key, history updates (max 8).
- [x] Words: correct letter advances with green box + effects, wrong letter shakes red + buzz, completing a word celebrates and picks a new one, score increments.
- [x] Math: number keys build the answer (backspace edits it), correct answer celebrates, wrong full-length answer flashes red and resets.
- [x] Mode buttons toggle correctly; on-screen keyboard swaps QWERTY ↔ numpad per mode; audio resumes after first click/tap.
- [x] Site works when served from a subpath (relative paths only; module URLs resolve against the page URL).
