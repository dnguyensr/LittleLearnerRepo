# P10 — Guided Word Building

> **Status (2026-08-30): Implemented; pre-release observation pending.** The sound-led interaction now directly replaces the visible-answer length tiers. Curriculum, readiness, recovery, paths, parent controls, later patterns, Word Stars, mobile fit, axe coverage, and teardown-safe tests are implemented. Reviewed repository-local human phoneme recordings and the three observed-child sessions remain release gates; the current build safely falls back to authored speech cues and documents that limitation.

## Goal

Turn Words into a developmental pre-K–1 word-building experience in which children hear a familiar word, attend to its phonemes, map those sounds to letters or graphemes, and blend the completed word. The complete conventional spelling is revealed after the child’s attempt rather than supplied as the answer.

The curriculum and interaction decisions are grounded in [the early-spelling evidence review](../research/early-spelling-evidence.md).

## Replacement decisions

- Preserve the top-level mode ID `words`, its navigation button, GitHub Pages deployment, local-only storage, and tap/keyboard accessibility.
- Replace `#target-word`’s prefilled letter boxes with phoneme-aware sound boxes and a child-facing tile tray.
- Remove automatic difficulty progression based on word length.
- Remove the current red shake, punitive wrong sound, and exact-key reveal as the instructional response.
- Do not retain the visible-answer interaction as a child-selectable legacy mode.
- Keep the picture as a meaning cue, but always speak its intended label and audit ambiguous emoji associations.
- Use text-to-speech for whole words and ordinary prompts. Use small, bundled local clips for isolated phonemes and graphemes so pronunciation does not depend on browser TTS.
- Preserve `lls-score-words` as a playful lifetime completion total, but never use the old score to infer curriculum readiness.

## Fresh learner experience

A fresh learner enters **Hear the First Sound**, not conventional spelling.

1. Show one large picture and speak its label, such as “Sun.”
2. Replay the whole word on picture or speaker tap.
3. Ask for its first sound using a spoken prompt and two or three large picture-backed letter choices.
4. A correct choice connects the isolated sound, letter, and word: “/s/. S starts sun.”
5. An incorrect choice remains recoverable: play that tile’s sound, contrast it with the target, and leave all choices available.
6. After two misses, offer **Build It Together** rather than revealing the answer automatically.

Once initial-sound readiness is demonstrated, the default activity becomes **Build a Word**:

1. Present and name a familiar picture without showing its spelling.
2. Display one empty box per phoneme.
3. On a first encounter with a pattern, model the word slowly while highlighting each sound box.
4. Offer a small tray containing the required letter/grapheme tiles and plausible contrasts.
5. Let the child tap or drag a tile into the active sound box. Physical-key input must provide equivalent placement.
6. Give informative, non-punitive feedback after a mismatch and preserve earlier correct placements.
7. After two misses on one box, offer **Build It Together**. Guided placement fills only the current relationship, then returns control.
8. On completion, sweep left to right across the boxes, play the phonemes, blend the whole word, reveal its conventional printed form, and reconnect it to the picture.
9. Offer large spoken **Again** and **Next Word** choices. Do not force the next word on a timer.

## Curriculum graph

Progression is based on independently demonstrated sound–spelling skills. A grown-up can pin any stage without modifying mastery.

### Shared oral and alphabetic foundation

1. **First sounds with continuous consonants** — identify `/m/`, `/s/`, `/f/`, `/n/`, `/r/`, `/l/`, `/v/`, and `/z/` in familiar pictured words.
2. **Additional first sounds** — introduce common stop consonants without adding a schwa.
3. **Final sounds** — identify a word’s final consonant using contrasts the child already knows.
4. **Two- and three-sound segmentation** — move neutral counters through sound boxes before requiring letters when the relationship is new.

### Regular word building

5. **Supported CVC completion** — one letter is missing from an otherwise built regular word.
6. **Continuous-onset CVC words** — build familiar words such as `SUN`, `FAN`, `MAP`, `RAT`, `LIP`, and `NET`, subject to a pronunciation and image audit.
7. **General short-vowel CVC words** — expand consonants while keeping one letter per phoneme.
8. **Word chains** — change one sound and tile at a time, such as `FAN → MAN → MAT → SAT`.
9. **Mixed CVC practice** — rotate mastered consonant and short-vowel patterns without introducing untaught spellings.

### Later word patterns

10. **Initial and final blends** — preserve each consonant phoneme in its own sound box.
11. **Common digraphs** — use one sound box for graphemes such as `SH`, `CH`, `TH`, and `CK` when they represent one phoneme.
12. **CVCC and CCVC words** — combine known blends and short vowels.
13. **Silent-e words** — visually distinguish the spelling letter that changes the vowel while not assigning silent `E` its own phoneme box.
14. **Common vowel teams** — introduce one explicitly taught team at a time.
15. **Simple meaningful word parts** — later 1st-grade work may add plural `-s`, `-ing`, or other taught units after the base word is secure.

### Word Stars

Regular and irregular high-frequency words become a distinct later path called **Word Stars**:

- Introduce only three to five recently taught words at a time.
- For regular portions, retain sound boxes and letter–sound analysis.
- Mark an unexpected or not-yet-decodable part visually and teach it directly.
- Practice recognition and reconstruction after teaching; never mix an unseen irregular word into independent CVC readiness history.
- Reconcile this path with the dormant Sight Words roadmap item rather than shipping a separate competing top-level mode.

## Content and data contracts

Replace the current length-only `{ word, emoji }` entries with structured definitions. Exact names may change during implementation, but the contract must represent:

```js
{
    id: 'sun',
    word: 'SUN',
    label: 'sun',
    emoji: '☀️',
    pattern: 'cvc-short-u',
    stage: 'continuousCvc',
    phonemes: [
        { id: 's', grapheme: 'S', audio: 'assets/phonemes/s.mp3' },
        { id: 'short-u', grapheme: 'U', audio: 'assets/phonemes/short-u.mp3' },
        { id: 'n', grapheme: 'N', audio: 'assets/phonemes/n.mp3' }
    ],
    decodable: true
}
```

Requirements:

- A sound box corresponds to `phonemes`, not `word.length`.
- A tile may contain more than one letter when one grapheme represents one sound.
- Every word identifies its taught pattern and required prerequisite sound–letter relations.
- Word selection draws only from definitions whose prerequisites are available at the current skill.
- Distractors are authored or generated from phonologically relevant contrasts; they must not create duplicate correct spellings.
- All labels, pictures, phoneme sequences, and General American English pronunciations receive a manual content audit.
- Avoid culturally narrow family labels and ambiguous pictures where the intended spoken word cannot be inferred after narration.
- Store isolated phoneme audio locally with documented provenance and a clear license. Do not fetch runtime audio from a third party.

## Guided instruction and feedback

Guided instruction is part of the replacement, not a parent-enabled experiment.

- The first problem for a new relationship begins with a short model→practice sequence.
- The child can replay the whole word, its slow segmentation, and the current sound at any time.
- A mismatched tile plays its own sound, then the target sound, while the corresponding visual elements highlight.
- Do not use a failure score, lose state, red error fill, or aversive buzz.
- Assisted and corrected completions receive the normal celebration and lifetime score.
- Only a first-attempt completion without a hint or guided placement enters readiness history as independent.
- Leaving a word unfinished records no failure.
- Switching mode or reloading restores the current word, box placements, tray, and guided step safely.

## Readiness and progression

Use per-skill history rather than a global completed-word counter:

- Record the latest six completed problems for the active skill as independent or assisted.
- Mark a skill mastered after at least six completions with five independent successes among the latest six.
- Mastery is permanent; later difficulty triggers support rather than regression.
- Introduce no more than one new sound–spelling relationship in a problem.
- Rotate mastered items so progress does not depend on memorizing one fixed word sequence.
- After mastery, let the child choose a spoken **Keep Practicing** or **Learn the Next Sound** card.
- Add a compact, spoken **Word Paths** control after the first branch is unlocked. Switching never clears progress.

Parent settings gain a Words stage selector with **Learning path** as the default and exact-stage pinning for observation or support. Parent pinning does not write independent readiness results into unrelated skills.

## Progress storage and compatibility

Add a normalized local-only `lls-words-progress` structure:

```js
{
    version: 1,
    currentSkill: 'firstSoundsContinuous',
    selectedPath: 'soundBuilding',
    currentActivity: null,
    skills: {
        firstSoundsContinuous: {
            recentIndependent: [],
            mastered: false
        }
    },
    lessons: {}
}
```

- Preserve the existing `lls-score-words` value as a historical celebration count.
- Do not convert that score or the old session tier into mastery because visible-answer completions did not measure independent encoding.
- Normalize corrupt, partial, and unknown versions safely.
- Add a two-step **Start Words Over** action that clears word skill, activity, and lesson progress while retaining other modules.
- No accounts, telemetry, learner names, or personal data.

## Speech and audio

- Continue using browser speech synthesis for the picture label, prompts, encouragement, and blended whole word.
- Bundle concise human-reviewed phoneme clips for isolated sounds. Clips must avoid adding a schwa to stop consonants.
- A grapheme replay may first play the phoneme and then, on a separate optional control, its letter name. Do not replace the spelling sound with the letter name.
- Pace modeled sequences as distinct word → phoneme → relationship units. Use one target-sound model rather than rapid duplication; the initial 450 ms boundary is a usability calibration documented in the evidence review, not a claimed universal threshold.
- Keep phonics and letter-name controls consistent with Letters, but the Words task’s instructional audio is governed by its authored phoneme data rather than approximate TTS strings.
- With speech disabled, keep all placement, highlighting, and completion controls usable. The grown-up panel should explain that sound–letter instruction is limited without audio.
- Cancel queued prompts and local audio on new activity, mode change, and reload restoration.

## Visual, input, and accessibility requirements

- Picture, sound boxes, and tile tray must fit simultaneously within the play area on desktop, Pixel, and iPhone profiles with the on-screen keyboard state accounted for.
- All primary controls meet a minimum 44×44 CSS-pixel target.
- Tapping is the default interaction. Dragging may be additive but never required.
- Physical keyboard input selects matching visible tiles; Backspace returns the most recent independently placed tile.
- Focus order follows picture/replay, sound boxes, tile tray, then navigation.
- Sound boxes announce position and state without exposing an unplaced answer.
- Color is never the only indication of current, placed, guided, or irregular state.
- Reduced-motion mode removes bouncing, pulsing, shaking, and travel animations while retaining every state change.
- The whole activity remains usable when speech is off, although the documented instructional limitation remains.
- Avoid automatic scene changes after success; the child controls replay and navigation.

## Implementation plan

### 1. Curriculum and contracts

- [x] Define word, phoneme, grapheme, skill, lesson, activity-state, and normalized-progress JSDoc contracts.
- [x] Replace length-derived tiers with the curriculum graph and prerequisite metadata.
- [x] Author and audit the first-sound and initial regular-CVC content set.
- [x] Separate regular word-building content from Word Stars content.
- [x] Audit emoji labels and replace ambiguous associations.
- [ ] Add licensed local phoneme clips and provenance documentation.

### 2. Progress and selection

- [x] Implement safe progress normalization, persistence, and interrupted-activity restoration.
- [x] Implement per-skill 5-of-6 independent mastery.
- [x] Preserve lifetime score without inferring mastery.
- [x] Add Learning path and exact-stage parent controls.
- [x] Add the two-step Words-only reset.

### 3. Replacement interface

- [x] Replace prefilled letter boxes with picture, replay, sound-box, and tile-tray components.
- [x] Implement first-sound identification as the fresh default.
- [x] Implement supported missing-letter and full CVC building.
- [x] Add tap, physical keyboard, and Backspace parity (drag remains optional and is not required).
- [x] Implement child-controlled Again, Next Word, and unlocked Word Paths controls.
- [x] Remove the old wrong animation/buzz, length-tier advancement, and automatic next-word timer.

### 4. Guided learning and feedback

- [x] Add reusable model→practice lesson state for first sounds and three-sound word building.
- [x] Add whole-word, segmented-word, current-phoneme, and grapheme replay.
- [x] Add informative sound comparison for mismatched tiles.
- [x] Offer Build It Together after two misses without launching it automatically.
- [x] Distinguish independent, corrected, and guided completions.
- [x] Reveal and blend the conventional spelling only after the attempt.

### 5. Later patterns and Word Stars

- [x] Implement word chains using single sound/grapheme substitutions.
- [x] Add blends, digraphs, CVCC/CCVC, silent-e, and vowel-team stages incrementally.
- [x] Implement Word Stars as the irregular/high-frequency branch inside Words.
- [x] Reconcile and close the separate Sight Words roadmap item when Word Stars ships.

### 6. Cleanup and documentation

- [x] Remove obsolete tier, queue, visible-answer, and next-letter-hint code.
- [x] Replace current Words tests that assert a prefilled answer.
- [x] Update the user README, technical README, P4 historical notes, and roadmap summary.
- [x] Document audio provenance requirements and curriculum conventions for future word additions.

## Acceptance coverage

- Fresh progress opens first-sound listening rather than a visible spelled word.
- A build problem contains one sound box per phoneme: a digraph shares one box, while silent `E` is displayed outside the phoneme boxes.
- The conventional answer is absent from the accessible and visual UI before an independent attempt is complete or guidance is requested.
- Picture and whole-word audio unambiguously identify the target.
- Each correct tile is paired with its authored phoneme; completion blends left to right and then names the whole word.
- Assisted, corrected, and guided words celebrate but do not count as independent readiness.
- Five independent successes among the latest six master a skill permanently.
- A mismatch gives contrastive support without clearing prior placements or changing score.
- Build It Together is offered after two misses, never forced, and returns control after one supported relationship.
- Reload and mode switching restore an unfinished activity without recording failure.
- Parent pinning, Words reset, corrupt storage, preserved historical score, and legacy settings remain safe.
- Word selection never deals an untaught pattern as independent practice.
- Word chains change exactly one authored sound/grapheme relationship at a time.
- Word Stars never contributes to regular CVC mastery.
- Touch, optional drag, keyboard, and Backspace behavior are equivalent.
- Every stage fits desktop, Pixel, and iPhone layouts and passes serious/critical axe scans.
- Speech-off, reduced-motion, slow-audio, missing-audio, interruption, and rapid-input states remain navigable.

## Release gate

This is a direct replacement, so the new module ships only when the complete replacement path and migration behavior pass the release suite. There is no beta toggle and no runtime fallback to the old visible-answer task.

Before release, observe at least three appropriately ready children across the intended range:

- A younger child can complete or intentionally leave the first-sound activity without a navigation dead end.
- A child with several known letter sounds can build a regular word with no more than one adult prompt.
- The child understands that each box represents a sound and can recover from a mismatched tile.
- The child intentionally chooses replay, continued practice, or the next sound.
- Caregiver notes report no ambiguous picture labels or misleading phoneme audio.

Record only a caregiver checklist. Add no analytics or personal data.
