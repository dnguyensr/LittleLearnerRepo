# P4 — Learning Module Improvements & New Modules

Goal: make Math and Words genuinely useful for pre-K through 1st grade, then add new modules. Guiding principles: no reading required to navigate, no dead ends, wrong answers always recoverable, audio reinforcement everywhere (via `speechSynthesis` — built into browsers, no dependencies).

## Math improvements

- [ ] On-screen number pad (from P1) so Math works on touch devices.
- [ ] Difficulty tiers with a simple picker (or auto-progression after N correct):
  - [ ] Tier 1 — counting: show 1–5 emojis, "How many?" (no operation).
  - [ ] Tier 2 — addition within 10 (current behavior).
  - [ ] Tier 3 — subtraction within 10 (current "eater" stories).
  - [ ] Tier 4 — addition/subtraction within 20, missing-addend problems (3 + ? = 5) for 1st grade.
- [ ] Show the numeral equation alongside the emojis (e.g. `3 + 2 = ?`) so kids connect symbols to quantities.
- [ ] Read the problem aloud with `speechSynthesis` (replay button 🔊).
- [ ] Gentle hint after 2 wrong attempts: highlight and count the emojis one at a time with spoken numbers.
- [ ] Multi-digit answers need explicit confirm: current code auto-fails when length matches — add an Enter/✓ key on the number pad and a backspace instead of instant judgment.

## Words improvements

- [ ] Speak the word on presentation and on completion; speak each letter name as it's typed correctly.
- [ ] Phonics option: letter *sounds* instead of letter names (toggle in a parent settings panel).
- [ ] Hint mode: the on-screen keyboard (P1) highlights the next expected letter; wrong-letter shake stays, but after 2 misses the correct key pulses.
- [ ] Split the word list into tiers by length/difficulty (the current list mixes CAT with HAMBURGER and BUTTERFLY):
  - [ ] Tier 1 — 2–3 letter CVC words.
  - [ ] Tier 2 — 4-letter words.
  - [ ] Tier 3 — 5+ letters.
- [ ] Don't repeat the same word twice in a row; shuffle through the tier before repeating any word.
- [ ] Fix duplicate entries in the word list (e.g. NOSE appears twice) while extracting it to `js/data/words.js` (P2).

## New module ideas (prioritized)

- [ ] **Letter Land** (pre-K letter recognition): press/tap any letter → it fills the screen with an animation, speaks the letter name, its phonic sound, and an example word with emoji ("B! Buh! 🍌 Banana!"). Essentially Free Play with purpose — highest value, lowest effort.
- [ ] **Number Fun** (0–20): tap/press a number → big numeral, spoken name, and that many objects appear one by one with counting voice-over.
- [ ] **Shapes & Colors**: "Tap the red circle!" — a few shapes on screen, tap the right one; spoken prompts, no keyboard needed at all.
- [ ] **Sight Words** (K–1st): flashcards from the Dolch pre-K/K lists; app speaks the word, child finds it among 2–3 choices (recognition before spelling).
- [ ] **Patterns**: what comes next — 🔴🔵🔴🔵❓ with 2–3 tappable choices (pre-K sequencing skill).

## Shared infrastructure

- [ ] One `celebrate()` helper in `js/effects.js` used by every module (Math and Words currently duplicate ~identical celebration code).
- [ ] Per-mode score/progress persisted in `localStorage` (key per module; survives reloads, no accounts, no network).
- [ ] Parent settings panel (gear icon, maybe hold-to-open so toddlers can't): volume, speech on/off, phonics vs letter names, difficulty tier, which modules appear in the top bar.
- [ ] A small speech helper wrapping `speechSynthesis` (queue management, cancel on mode switch, pick a child-friendly voice when available, no-op if unsupported).
