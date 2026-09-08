# P18 — Batched child-observation round

> **Status (2026-09-05): Planned after the curriculum batch is frozen.** Do not
> spend scarce toddler/pre-K access on one-feature sessions. Continue automated
> behavior, fit, accessibility, migration, and content checks during development,
> then observe the release candidate in one coordinated round.

## Purpose and limits

This is a usability and comprehension check, not an efficacy study. It can show
where children misunderstand a prompt, discover an interface shortcut, need an
adult to translate, or disengage. It cannot establish learning gains, age norms,
retention, transfer, or standards mastery.

No child should complete every activity. One **round** means one frozen product
candidate, one recruitment/scheduling period, and one consolidated issue review.
Activities are distributed across short sessions so fatigue does not become the
thing being tested.

## Entry gate: freeze before observing

Begin the round only when:

- planned foundational Math changes for the candidate are complete;
- Words phoneme assets and their provenance are in their intended release state;
- child-facing prompts and grown-up controls are copy-frozen;
- Chromium and mobile-Chrome suites, typecheck, lint, and deterministic contrast
  checks pass;
- corrupt/legacy progress fixtures and one-learner storage behavior are covered;
- there is no known navigation dead end, clipped primary control, or unrecoverable
  answer state.

Changes after the freeze require automated regression testing. They do not
require another child round unless they materially change what a child sees,
hears, understands, or controls.

## Observation matrix

Recruit by demonstrated readiness for the activity, not age alone. Across the
round, seek at least three usable observations for each row. A child may cover
more than one row when engaged, but may stop or switch at any time.

| Experience                      | Critical observation                                                                        | Varied/transfer probe                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Numbers: count and rearrange    | Coordinates one touch with one count and understands the final total                        | Rearrange the same set; ask whether the amount changed                             |
| Math: compare groups            | Understands more, fewer, and same; uses the aligned rows rather than apparent occupied area | Change item, spacing, question direction, and include equal groups                 |
| Math: first addition            | Sees two parts make one whole and completes the guided action without answer leakage        | Make the same whole with different parts or household objects                      |
| Math: same whole, different parts | Preserves the whole while redistributing, understands an empty part, and predicts the missing part | Change which part is unknown; optionally use two plates and five objects |
| Math: known start, count on | Starts at the known amount and connects each new object with exactly one hop; predicts before revealing the endpoint | Change values and switch between taught objects and a number line; optionally act with physical objects |
| Math: subtraction               | Connects taking away with the remaining group and both parts                                | Change which part is removed or ask the child to act out the story                 |
| Math: place value               | Treats a ten rod as ten ones and connects blocks to the numeral                             | Rebuild a different teen/two-digit number with physical objects if appropriate     |
| Words: sound-to-spelling        | Hears the intended contrast, knows what to select, and recovers from a mismatch             | Change word/item; note dialect or audio ambiguity without labeling the child wrong |
| Letters: follow the stroke path | Understands the waypoint action without mistaking it for free handwriting                   | Offer an optional off-screen pencil copy separately                                |
| Patterns                        | Notices the repeating unit and recovers from a choice that does not fit                     | Copy or repair a similar pattern with physical objects                             |

## Session design

- Target 10–15 minutes of active interaction, with an earlier stop whenever the
  child disengages. A willing child may continue, but continuation is not a pass
  condition.
- Begin with one familiar/easy activity. Observe two or three target experiences,
  then finish with free choice.
- Rotate the order across children. Do not always show the newest feature first.
- The adult reads only the standard prompt initially. If help is needed, use the
  smallest neutral prompt and record it; do not demonstrate the answer unless the
  activity has entered its explicit guided state.
- Include at least one phone/tablet-sized touch device. Record device class, not
  child identity.
- Stop immediately for distress, repeated refusal, or physical/device discomfort.

## Shared record

Use one row per experience, not free-form profiles of a child:

```text
session code (non-identifying):
device class:
experience and version/commit:
understood first prompt: yes / after replay / after adult prompt / no
controlled intended target: yes / with recovery / no
used a non-mathematical shortcut: no / possibly / clearly
adult prompts: 0 / 1 / 2+
recovered after mismatch: yes / not observed / no
varied or physical probe: demonstrated / with support / not demonstrated / not attempted
speech or dialect ambiguity: none / possible / clear
disengaged or intentionally exited: no / yes
blocking issue code, if any:
brief behavior-only note (no names, recordings, or identifying details):
```

## Consolidated decision rule

After the round, triage all notes together:

1. **Blocker:** child cannot discover the required action, a control is unusable,
   feedback teaches the wrong relationship, or an audio contrast is materially
   ambiguous. Fix before release.
2. **High priority:** the same misunderstanding or workaround appears in two or
   more observations for an experience. Fix in one consolidated refinement pass.
3. **Backlog:** preference, isolated hesitation, or an extension idea without a
   repeated comprehension problem. Record it without expanding the release.

Rerun the full automated suite after the consolidated refinement pass. Schedule a
second child round only for a blocker whose fix materially changes the learning
interaction; avoid spending another round merely to confirm cosmetic changes.

## Privacy

Collect no names, contact details, birth dates, account identifiers, analytics,
photos, video, voice recordings, or unrestricted narrative profiles in the
repository. Consent and recruitment logistics remain outside the application and
must follow the caregiver/organization's requirements.
