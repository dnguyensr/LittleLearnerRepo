# P4 — Learning Module Improvements & New Modules

Goal: make Math and Words genuinely useful for pre-K through 1st grade, then add new modules. Guiding principles: no reading required to navigate, no dead ends, wrong answers always recoverable, audio reinforcement everywhere (via `speechSynthesis` — built into browsers, no dependencies).

> **Status (2026-08-29):** core phase implemented — Math readiness paths, Words tiers and hints, toddler-first Letter Land, Number Fun, grown-up settings, and local score persistence. Remaining: the three module ideas below. Automated browser, mobile, speech-contract, layout, and accessibility coverage is active.

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

- [x] Speak the word on presentation and completion; speak each letter as it's typed correctly.
- [x] Phonics option: letter *sounds* instead of letter names (toggle in the parent settings panel).
- [x] Hint mode: the OSK highlights the next expected letter (subtle gold); after 2 misses it pulses strongly.
- [x] Word list tiered by length, advancing every 5 completed words in a session:
  - [x] Tier 1 — 2–3 letter words. / Tier 2 — 4-letter words. / Tier 3 — 5+ letters.
- [x] No immediate repeats; each tier is shuffled and fully cycled before any word repeats.
- [x] Duplicate entries fixed (NOSE dedupe done during the P2 extraction).

## New module ideas (prioritized)

- [x] **Letter Land** (`js/modes/letters.js`): press/tap any letter → uppercase and lowercase forms with a sound-consistent familiar example ("B. B is for ball."). The letter, word, and optional phonics relationship are separate replay targets so toddlers hear one association at a time.
- [x] **Number Fun** (`js/modes/numbers.js`): press 0–9 → big numeral, spoken name, that many objects appear one by one with counting voice-over.
- [ ] **Shapes & Colors**: "Tap the red circle!" — a few shapes on screen, tap the right one; spoken prompts, no keyboard needed at all.
- [ ] **Sight Words** (K–1st): flashcards from the Dolch pre-K/K lists; app speaks the word, child finds it among 2–3 choices (recognition before spelling).
- [ ] **Patterns**: what comes next — 🔴🔵🔴🔵❓ with 2–3 tappable choices (pre-K sequencing skill).
- [x] **Math Lab**: readiness-based skill paths with Singapore mastery, Traditional practice, Visual strategies, and Balanced mix presentation lenses; optional guided lessons remain in beta — see [06-math-methods-beta.md](06-math-methods-beta.md).

## Shared infrastructure

- [x] One `celebrate()` helper in `js/effects.js` used by every scoring module (done in P2).
- [x] Per-mode score persisted in `localStorage` (`lls-score-<mode>`; survives reloads, no accounts, no network).
- [x] Parent settings panel (`⚙️` hold-to-open 600ms so toddlers can't): speech on/off, phonics emphasis, and Math presentation/stage controls. *(volume control and per-module visibility still open)*
- [x] `js/speech.js` wrapping `speechSynthesis`: cancel on mode switch, prefers an English/child-friendly voice, no-op if unsupported or disabled.
