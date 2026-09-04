# P4 — Learning Module Improvements & New Modules

Goal: make Math and Words genuinely useful for pre-K through 1st grade, then add new modules. Guiding principles: no reading required to navigate, no dead ends, wrong answers always recoverable, audio reinforcement everywhere (via `speechSynthesis` — built into browsers, no dependencies).

> **Status (2026-08-30):** core phase implemented — Math readiness paths, guided sound-led Words, toddler-first Letter Land, Number Fun, grown-up settings, and local score/readiness persistence. Shapes and Patterns remain. Automated browser, mobile, speech-contract, layout, and accessibility coverage is active.

## Math improvements

- [x] On-screen number pad (from P1) so Math works on touch devices.
- [x] Difficulty tiers: picker in parent settings *and* auto-progression (advances a tier every 5 correct in a session):
  - [x] Tier 1 — counting: show 1–5 emojis, "How many?" (no operation).
  - [x] Tier 2 — addition within 10.
  - [x] Tier 3 — subtraction within 10 ("eater" stories).
  - [x] Tier 4 — addition within 20 and missing-addend problems (3 + ? = 8).
- [x] Show the numeral equation alongside the emojis (`#math-equation`, tiers 2–4; typed digits fill the `?` live).
- [x] Read the problem aloud with `speechSynthesis` (spoken on presentation; 🔊 replay button).
- [x] Gentle hint after 2 wrong attempts: emojis highlight and count one at a time with spoken numbers; subtraction dims the eaten ones first; missing-addend prompts counting up.
- [x] Explicit confirm: digits are never auto-judged — ✓/Enter submits, ⌫ edits (numpad gained both keys).

## Words improvements

> These checked items describe the currently shipped visible-answer activity. [P10 — Guided Word Building](10-guided-word-building.md) will replace this design directly with a sound-led curriculum; the existing length tiers and answer-copying interaction are not the future target.

- [x] Speak the word on presentation and completion; speak each letter as it's typed correctly.
- [x] Phonics option: letter *sounds* instead of letter names (toggle in the parent settings panel).
- [x] Hint mode: the OSK highlights the next expected letter (subtle gold); after 2 misses it pulses strongly.
- [x] Word list tiered by length, advancing every 5 completed words in a session:
  - [x] Tier 1 — 2–3 letter words. / Tier 2 — 4-letter words. / Tier 3 — 5+ letters.
- [x] No immediate repeats; each tier is shuffled and fully cycled before any word repeats.
- [x] Duplicate entries fixed (NOSE dedupe done during the P2 extraction).

## New module ideas (prioritized)

- [x] **Letter Land** (`js/modes/letters.js`): press/tap any letter → uppercase and lowercase forms with a sound-consistent familiar example ("B. B is for ball."). The letter, word, and optional phonics relationship are separate replay targets so toddlers hear one association at a time.
- [x] **Number Fun** (`js/modes/numbers.js`): press 0–9 → big numeral, spoken name, that many objects appear one by one with counting voice-over. The child then performs the count themselves, and can rearrange the set to see the quantity hold — see [11-interactive-counting.md](11-interactive-counting.md).
- [ ] **Shapes & Colors**: "Tap the red circle!" — a few shapes on screen, tap the right one; spoken prompts, no keyboard needed at all. *(Still open. [P14](14-patterns.md) took Patterns first and records why: as written this is a recognition drill, and the version worth building needs a design of its own.)*
- [x] **Sight Words / Word Stars** (K–1st): shipped as the regular/irregular high-frequency branch inside Words rather than a competing top-level module; see [P10](10-guided-word-building.md).
- [x] **Patterns** (`js/modes/patterns.js`): what comes next — 🔴🔵🔴🔵❓ with 2–3 tappable choices, an ab/aab/abb/abc ladder, and the same 5-of-6 readiness window Math and Words use. See [14-patterns.md](14-patterns.md).
- [x] **Math Lab**: readiness-based skill paths with Singapore mastery, Traditional practice, Visual strategies, and Balanced mix presentation lenses; guided subtraction and place-value lessons are part of the main path — see [06-math-readiness.md](06-math-readiness.md).

## Shared infrastructure

- [x] One `celebrate()` helper in `js/effects.js` used by every scoring module (done in P2).
- [x] Per-mode score persisted in `localStorage` (`lls-score-<mode>`; survives reloads, no accounts, no network).
- [x] Grown-up settings panel (`⚙️ Grown-ups`, one tap to open): speech on/off, phonics emphasis, and Math/Words presentation and stage controls. Destructive progress resets retain a separate two-tap confirmation. *(volume control and per-module visibility still open)*
- [x] `js/speech.js` wrapping `speechSynthesis`: cancel on mode switch, prefers an English/child-friendly voice, no-op if unsupported or disabled.
