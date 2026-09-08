# P19 — Math concept bridges and the next curriculum section

> **Status (2026-09-07): Math batch implemented; automated Math validation complete.**
> Implemented batch: decomposition within five, explicit counting on,
> and stronger follow-up checks. Next section: Shapes & Space.
> Implements a bounded part of [P17](17-evidence-and-release-hardening.md),
> extends the shipped [Math experience](06-math-readiness.md), and uses the
> consolidated [P18 observation round](18-batched-child-observation.md).

## Recommendation and scope

The three Math milestones below are implemented. Shapes & Space remains the
next section, not part of this runtime batch. No commit or deployment is made
by this implementation task.

### Validation record

- [x] Focused bridge, comparison, progression, and fit coverage across Chromium,
      WebKit, mobile Chrome, and mobile Safari, using two workers. The 172-test
      run passed 171 checks; its remaining iPhone lesson-spacing failure was
      corrected, and the final 52-test bridge rerun passed on all four projects.
- [x] New lesson-scene accessibility scans, keyboard activation, generator-domain
      coverage, assistance handling, and controlled-clock confirmation checks.
- [x] Typecheck, lint, and deterministic contrast checks during development.
- [x] Full four-project browser suite executed: 1,056 passed, 30 skipped, and
      10 failures in the first run. Four failures were an outdated expected
      comparison-to-addition transition; five were new Math layouts on the
      smaller iPhone viewport. Those expectations/layouts were corrected and
      are covered by the focused Math runs above. No Math failures remain.
- [ ] Entire application suite green: one existing Letters replay-controls fit
      failure remains on `mobile-safari`. `#letter-make-btn` clips after W with
      both the current and original `HEAD` stylesheet; tracked in P17.
- [ ] Physical target-device speech/touch and assistive-technology checks.
- [ ] Consolidated P18 child-observation round and any resulting refinement.

Device and observation checks cannot be substituted with browser emulation.
The implementation is not an observed or efficacy-validated release.

Strengthen the connection between counting and arithmetic first. A child should
see why two parts make the same whole and how counting on represents addition
before being asked to repeat those calculations independently.

Deliver the three milestones below as one curriculum candidate. Then extend to
Shapes & Space before adding advanced arithmetic. Shapes is a parallel strand:
its place later in the implementation schedule must not become an arithmetic
prerequisite for children.

This batch does not include regrouping, a general curriculum-engine rewrite,
local learner profiles, a new scoring system, or every missing foundation lesson.
P17 retains those follow-ups and the broader release gates. Existing one-learner
storage limitations remain relevant when interpreting progress.

## Baseline before this implementation

Reviewed against the working tree before P19 implementation on 2026-09-07:

| Area             | Current implementation                                                                                                  | Implication for this plan                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation       | `count5 → subitize → count10 → numeralMatch → compareSets5 → addWithin5 → countOn → addWithin10` in `js/math/ladder.js` | Insert a small decomposition objective before first addition for new learners.                                                            |
| Lessons          | Comparison, addition, subtraction, and place-value lessons use `LessonDefinition` in `js/math/lessons.js`               | Reuse lesson entry, resume, replay, and score-free behavior.                                                                              |
| Decomposition    | Missing-part activities exist as `partWhole` and `bondTo10`; there is no dedicated within-five foundation skill         | Existing renderers do not establish systematic coverage of this objective.                                                                |
| Counting on      | `countOn` uses the ordinary addition generator, with sums at most nine                                                  | An answer alone cannot show which strategy the child used; add explicit instruction and a distinct task.                                  |
| Making ten       | `bondTo10` asks for a partner totaling ten; `makeTen` generates addition across ten, totaling 11–18                     | Preserve stored ids; do not map both to the objective-map id `make-ten`.                                                                  |
| Comparison       | Equally sized, aligned five-slot groups with quantities 1–5                                                             | Varied spacing, zero, numeral comparison, and comparison through ten remain extensions.                                                   |
| Follow-up checks | Later page sessions can confirm ready skills; ordinary random generation supplies the item                              | Variation is not guaranteed. The scheduler can also serve several due skills consecutively; there is no global one-check-per-session cap. |

The [objective map](../research/early-math-objectives.md) describes intended
learning relationships, not an exact transcription of the runtime ladder. Keep
that distinction explicit when updating it.

## Evidence behind the choice

Sources checked on 2026-09-07. These support instructional design; they do not
establish the effectiveness of independent Edamame use.

| Source and evidence strength                                                                                                                                                                                                              | Application                                                                                      | Limit                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [IES, Teaching Math to Young Children (2013)](https://ies.ed.gov/ncee/wwc/practiceguide/18): moderate evidence for developmental number/operations instruction; minimal evidence for its geometry/pattern/measurement/data recommendation | Connect quantity relationships before extending arithmetic; include Shapes as a parallel strand. | Preschool–kindergarten educator guidance. Minimal evidence is not evidence of no benefit, and does not justify ranking Shapes as ineffective. |
| [IES, Preparing Young Children for School (2022)](https://ies.ed.gov/ncee/wwc/PracticeGuide/30/i): strong evidence for intentional mathematics instruction; moderate for mathematical conversation                                        | Brief models, precise spoken language, and optional caregiver conversation.                      | Does not validate a particular three-scene app lesson or require a spoken answer.                                                             |
| [IES, elementary mathematics intervention guide (2021)](https://ies.ed.gov/ncee/wwc/practiceguide/26): strong evidence for systematic instruction, language, representations, number lines, and word-problem instruction                  | Explicitly connect counters, parts, number-line actions, and equations.                          | K–6 intervention context; applying this to preschool independent app use is an extrapolation.                                                 |
| [IES, Organizing Instruction and Study (2007)](https://ies.ed.gov/ncee/wwc/PracticeGuide/1): moderate evidence for spacing, worked-example/practice alternation, and concrete/abstract connections                                        | Revisit a relationship later with changed examples and a previously taught representation.       | Broad K–postsecondary scope; no support for Edamame's exact readiness threshold or a specific app-session delay.                              |

The delivery order, example ranges, review frequency, and migration policies
below are **product inferences**. Standards remain secondary compatibility
metadata. Use the existing research review for the wider evidence discussion.

## Milestone 1 — Make the same whole in different ways

Objective: `compose-decompose-5`. Proposed runtime skill: `decompose5`.
Prerequisite: existing numeral/quantity work; no silent import of Numbers
readiness. Add the skill immediately before `addWithin5` in the foundation.

- [x] Model five counters divided into two trays: two and three, then one and
      four. Keep every counter visible while it moves. Speak “part” and “whole”
      and connect each arrangement to its number bond and equation.
- [x] Guide a tap-based redistribution of four counters. A selected counter moves
      between trays; dragging is optional, never required. Use position and
      outlines as well as color to distinguish parts.
- [x] Give an independent missing-part turn: whole five, visible part two,
      unknown other part. The child builds or chooses three, then explicitly
      checks. Do not display the missing quantity or completed equation first.
- [x] Teach an empty part as zero before including it in independent items.
      Cover wholes 2–5, either unknown-part position, and more than one split per
      whole. Do not reject an alternative valid split in an open-build activity.
- [x] Distinguish exploration from assessable responses. “Split these any way”
      remains score-free; a fixed missing-part question can provide readiness
      evidence. Completing prescribed taps alone cannot establish readiness.
- [x] Add optional “Can you make five another way?” conversation and a household
      follow-up using five age-appropriate objects and two plates.

Acceptance: the whole stays invariant; parts always sum to it; swapping the
unknown part changes the required answer correctly; hints and corrected answers
never count as independent. Lesson completion itself awards no readiness.

## Milestone 2 — Teach counting on as a relationship

Objective: `count-on-10`; preserve runtime id `countOn`. Prerequisites are first
addition and the existing counting/numeral work through ten. Expand this skill's
range to include a total of ten with generator and renderer coverage.

- [x] Model `4 + 2`: identify the known four, then coordinate two new counters
      with the words “five, six,” two hops from four, and the resulting equation.
      Use tap-to-advance scenes so narration or animation timing cannot gate use.
- [x] Guide the child to select the starting quantity, then make one tap per
      added object/hop. Name why the first group need not be counted again;
      recounting remains an acceptable support strategy.
- [x] Ask an independent prediction with new values before revealing the final
      count, endpoint, or sum. Optional counters/hops remain available, but a
      support that reveals the answer makes that completion assisted.
- [x] Give this task explicit semantics, such as `countOnFrom`, instead of
      relying only on an addition-shaped problem or its skill label. Route it
      through a shared renderer where necessary, following the comparison task
      pattern. Every presentation setting must preserve the learning task.
- [x] Add “Start with four objects; add two more” as an optional physical
      extension. Record only observable answers/actions: a correct sum is not
      proof that the child mentally counted on.

Acceptance: two added objects mean exactly two hops and two additional number
words; the start is not counted as the first hop. Replay, rapid taps, mode changes,
speech-off, and reduced motion cannot produce duplicate steps or reveal the
independent answer before submission. Current path and lesson resume still work.

## Milestone 3 — Make follow-up evidence interpretable

Keep the existing five-independent-of-six readiness heuristic for this batch.
Do not present it as calibrated mastery or add response-speed thresholds.

- [x] For the two target skills, record a bounded signature of the latest
      readiness item: quantities, task/unknown position, and representation.
      Record the representations already taught. Do not store a full event log.
- [x] Generate confirmation from an explicit finite set of eligible variants.
      Change numerical values and at least one taught arrangement, response
      direction, or representation; an emoji substitution alone is insufficient.
      Avoid unbounded random retry loops. If no eligible variant exists, defer
      the check without interrupting the path.
- [x] Pilot eligibility after a different page session and at least 24 elapsed
      hours from recent readiness or the last attempted check. This is a
      configurable product heuristic, not a research-established retention
      interval. Invalid/future timestamps must defer safely, not block learning.
- [x] Cap automatic confirmation at one item per page session across Math.
      After completion, assistance, or an intentional exit, resume the child's
      current path. An assisted check stays pending; it never erases readiness.
- [x] Label the result as a later varied check. It does not demonstrate physical
      transfer, permanent retention, or the child's reasoning strategy.

Acceptance: controlled-clock and deterministic-item tests distinguish same
session, immediate reload, eligible later session, changed item, assisted check,
and multiple pending skills. Exiting a review must not repeatedly reopen it in
the same session. Review must never override parent-pinned exploration.

## Implementation and compatibility

Keep the plain ES-module, JSDoc, relative-path, no-runtime-dependency model.
Extend the registered `mathlab` mode; leave unregistered `js/modes/math.js` out
of this work.

| Files                                                  | Planned changes                                                                                                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `js/math/problems.js`, `js/types.js`                   | New decomposition and counting-on task contracts; bounded item variants and progress fields.                                                  |
| `js/math/lessons.js`, `js/math/manipulatives.js`       | Two lessons, reusable two-part controls, explicit representation connections, physical prompts. Extract a focused helper file only if needed. |
| `js/math/ladder.js`                                    | New foundation node, lesson gates, confirmation eligibility, versioned progress normalization.                                                |
| `js/modes/mathlab.js`, relevant presentation renderers | Dispatch new tasks, preserve assistance semantics, enforce review cap and resume behavior.                                                    |
| `css/styles.css`                                       | Responsive controls and stable counter/number-line layouts.                                                                                   |
| `tests/mathlab-*.spec.js`                              | Generator, progression, lesson, method, fit, and settings regressions.                                                                        |
| Research map, P6, P17, P18, Math observation sheet     | Record actual coverage, migration meaning, added observations, and implementation status in the same changes.                                 |

Use a version-3 progress record for the new evidence metadata and curriculum
insertion. Preserve stored method/skill ids, selected paths, scores, and existing
lesson positions. Retain legacy `mastered` as a compatibility field for now.

For an existing learner already at or beyond first addition, retain their route
and offer the new decomposition lesson through Learn Together. Store a separate
curriculum-bypass marker; do not manufacture six correct results, readiness, or
confirmation for the new skill. Fresh learners receive the full sequence.
An old `countOn` result remains historical task performance, not retroactive
evidence of the newly modeled strategy. Missing signatures cannot qualify as
verified variation: gather a baseline before scheduling a varied check.

Migration must be idempotent and normalize malformed nested records. Cover old
spine/four-level formats, version 2, version 3, incomplete lessons, and Start over.
Do not silently reset a learner because a new field or lesson id is absent.

## Delivery and validation

Implement in reviewable changes with tests alongside behavior:

1. **Curriculum/data contract:** objective-to-skill mapping, new task generation,
   version-3 migration, deterministic fixtures. Add the foundation node only when
   its lesson and renderer are ready in the following change.
2. **Decomposition:** lesson, practice interaction, foundation gate, accessibility.
3. **Counting on:** lesson, task semantics, all presentation settings, total ten.
4. **Follow-up checks:** bounded variation, timing, review cap, path recovery.
5. **Candidate validation:** documentation, device checks, and consolidated P18
   observation additions; one refinement pass after the round.

For each behavior change, run focused Math tests on Chromium and mobile Chrome
with two workers. Use exhaustive small-number fixtures rather than random runs
to establish domain coverage. Run typecheck, lint, and deterministic contrast
checks. Before candidate freeze, run the full browser suite with two workers,
including WebKit and mobile Safari, and check formatting of touched files.

Manually check target-device speech/touch, keyboard and screen-reader operation,
zoom, speech-off, reduced motion, recoverable errors, and visible primary controls.
Browser emulation cannot verify iOS voice or physical touch behavior.

Add two rows to the existing P18 matrix: “same whole, different parts” and
“known start, count on.” Seek at least three usable observations per row across
the single coordinated round, following P18's readiness-based recruitment,
privacy rules, and blocker/repeated-confusion triage. Observe whether children
understand the action or merely follow a button sequence; include an optional
physical or varied example. These observations assess comprehension/usability,
not learning efficacy. Do not require a new child round after each implementation
milestone. Shared P17/P18 release gates remain in effect.

## Next section: Shapes & Space

After this bounded Math batch, start `shape-attributes` as an independently
accessible strand. The first candidate should cover circles and triangles,
including varied triangle orientations/proportions and carefully chosen
nonexamples. Rectangles/squares and shape composition follow in a later slice.

The first interaction should model tracing a boundary and noticing straight
sides/corners, guide matching a rotated example, then ask the child to select
another example whose size or orientation differs. Circle language must not
imply straight sides or corners. Color and screen position must not identify the
answer. Provide spoken prompts, tap choices, optional shape-hunting with a
caregiver, and score-free recoverable exploration.

Use authored SVG geometry with semantic shape metadata, rather than emoji or
generated pictures. Register the mode through the existing app structure with
independent local progress; no arithmetic unlock or inherited Math readiness.
Expand the objective map and P4 idea into a detailed implementation plan before
coding that section, including content validation, navigation/fit, accessibility,
and its place in a coordinated observation candidate.

Keep these as later Math increments, not additions to this batch:

- varied set comparison, then numeral comparison and quantities through ten;
- decomposition through ten and a lesson for `bondTo10` (partner to ten);
- separate instruction for `makeTen` (using ten to add across ten);
- missing-change/start and comparison stories, then fact relationships;
- direct length comparison and shape composition alongside arithmetic.

If existing observation findings reveal a blocking counting/comparison problem,
fix that before enabling the new foundation node. No such findings were supplied
or established by this code/document review.
