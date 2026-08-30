# P8 — Toddler Letter Foundations

> **Status (2026-08-29): Shipped.** The default Meet the Letter interaction, phonics emphasis, corrected examples, independent replay controls, and automated coverage are implemented.

## Goal

Make Letters an inviting first alphabet experience for toddlers: one visible letter, one familiar object, and one short spoken association at a time. The module remains exploratory, child-led, and free of scores or wrong-answer states.

## Evidence used

- The [National Early Literacy Panel](https://lincs.ed.gov/publications/pdf/NELPEarlyBeginnings09.pdf) identifies printed letter-name and letter-sound knowledge as strong predictors of later literacy.
- A randomized preschool study found that [combined letter-name and letter-sound instruction](https://pubmed.ncbi.nlm.nih.gov/20563245/) supported sound acquisition better than sound-only instruction, although alphabet instruction did not automatically transfer to other literacy skills.
- Conventional alphabet-book associations such as “B is for bear” produced greater phoneme-awareness gains than letter-name books without example words in [Murray, Stahl, and Ivey](https://doi.org/10.1007/BF00395111).
- [Head Start's developmental progression](https://headstart.gov/school-readiness/article/literacy-preschool) treats ages 36–48 months primarily as awareness-building; broader naming and sound production develop closer to ages 48–60 months.
- In a study of children 30–36 months, [plain alphabet books supported more letter learning than books with unrelated manipulative features](https://journals.sagepub.com/doi/abs/10.1177/1468798411430091). Celebrations should therefore remain secondary to the letter and its example.

The studies do not directly compare the exact spoken strings used by this application. The shipped wording is a conservative product decision derived from their shared principles: pair names with meaningful examples, retain access to sounds, and avoid presenting several abstract labels at once.

## Shipped experience

- [x] Replace the rapid “letter name, approximate sound, word” utterance with a calm default such as “A. A is for apple.”
- [x] Show uppercase and lowercase forms together.
- [x] Display a familiar example and visually highlight the associated letter in the word.
- [x] Let the child independently replay the letter name, example word, or phonics relationship.
- [x] Keep letter names in phonics mode; the setting emphasizes sounds rather than removing names.
- [x] Keep physical-keyboard and on-screen-keyboard selection.
- [x] Keep the module score-free with no mastery gate or punitive response.
- [x] Reduce each selection's decorative burst so the learning target stays visually dominant.

## Content corrections

- [x] `I`: replace **ice** with **igloo** so the example matches the taught short-I relationship.
- [x] `O`: replace **owl** with **octopus** so the example begins with the intended short-O relationship.
- [x] `X`: use **fox** and say “X is in fox,” because the common `/ks/` sound occurs at the end rather than the beginning of a toddler-friendly word.
- [x] Preserve familiar, regular examples for the remaining letters.

## Acceptance coverage

- [x] Exact default and phonics-emphasis speech contracts.
- [x] Independent letter, word, and sound replay.
- [x] Touchscreen replay and physical-keyboard selection.
- [x] Uppercase/lowercase and highlighted-example rendering.
- [x] Corrected I, O, and X relationships.
- [x] Minimum 44px replay targets and play-area containment.
- [x] Populated Letters state passes serious/critical axe checks.
- [x] Desktop Chromium, desktop WebKit, Pixel, and iPhone layouts covered.

## Follow-on observations

- Test the wording with children across the 2½–5 age range; note whether they attend to the letter or mainly name the picture.
- Consider small local recordings for isolated phonemes. Browser text-to-speech has no phoneme control, so generated approximations such as “buh” cannot be treated as pronunciation-quality audio.
- If children are ready for active practice, beta-test a no-score initial-sound match such as “Which picture starts like apple?” without changing the exploratory default.
- Explore meaningful first letters from a child's name after local learner profiles exist.
