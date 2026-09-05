# P17 — Evidence, readiness, and release hardening

> **Status (2026-09-05): Active.** The independent project audit is complete.
> Phase 1 correctness work, the Phase 2 Math readiness pilot, and the Phase 3
> evidence/objective records are underway. Curriculum changes remain
> deliberately staged so product hypotheses are not presented as research
> findings.

## Outcome

Make Edamame a trustworthy early-learning supplement whose instructional
choices are traceable to evidence, whose readiness signals mean what they say,
and whose public claims match what has actually been validated.

Common Core remains an optional compatibility mapping. It does not name a
child-facing method, determine the curriculum sequence, or serve as evidence
that an activity teaches effectively.

## Product principles

1. **Evidence and standards are different things.** Research and developmental
   guidance inform instruction. Standards describe expected outcomes and may be
   mapped afterward.
2. **Observed behavior is narrower than mastery.** A short run of correct app
   responses can show recent readiness; retention and transfer require later,
   varied checks.
3. **Model before independent assessment.** Every genuinely new relationship
   receives a concise model and supported turn before it can affect readiness.
4. **Representations must be connected.** Objects, pictures, spoken language,
   and notation should refer to the same idea explicitly rather than merely
   appearing in rotation.
5. **The app supplements people and physical activity.** Caregiver prompts and
   off-screen extensions are part of the learning design, not disclaimers hidden
   in documentation.
6. **Release claims follow release gates.** A module is not called validated
   while required audio, device checks, or observed-child sessions are pending.

## Evidence hierarchy

Every instructional objective will record one or more sources using these
labels:

- `practice-guide`: evidence-graded recommendation from an authoritative review;
- `developmental-guidance`: age-range expectations from an authoritative body;
- `primary-study`: a directly relevant study, with population and limitations;
- `standards`: an outcome compatibility mapping, never an effectiveness claim;
- `product-inference`: a design decision consistent with evidence but not tested
  directly;
- `local-observation`: structured, privacy-preserving child/caregiver notes.

Core sources for the first pass:

- [IES: Teaching Math to Young Children](https://ies.ed.gov/ncee/wwc/practiceguide/18)
- [IES: Preparing Young Children for School](https://ies.ed.gov/ncee/wwc/PracticeGuide/30/i)
- [IES: Assisting Students Struggling with Mathematics](https://ies.ed.gov/ncee/wwc/practiceguide/26)
- [IES: Organizing Instruction and Study](https://ies.ed.gov/ncee/wwc/PracticeGuide/1)
- [Head Start preschool mathematics progression](https://headstart.gov/school-readiness/article/math-preschool)
- [IES foundational reading practice guide](https://ies.ed.gov/ncee/wwc/Docs/PracticeGuide/wwc_foundationalreading_040717.pdf)

## Curriculum record

Add a repository-owned record for each learning objective with this shape:

```text
objective id
  learner-facing goal
  age/grade band and prerequisite objectives
  evidence sources, evidence strength, and limitations
  model → guided practice → independent practice
  observable evidence captured by the app
  delayed/varied confirmation rule
  optional standards mappings
  accessibility and speech-off behavior
  local-observation status
```

The first implementation may be Markdown. Move it to JavaScript data only when
runtime behavior needs to consume it.

## Standards-neutral compatibility

- Keep child-facing names based on actions and representations: **Build, See &
  Write**, **Practice & Columns**, **Frames & Number Lines**, and **Variety**.
- Preserve stored ids such as `commoncore` as legacy compatibility aliases until
  a migration is tested.
- Maintain mappings outside presentation renderers. A skill may map to Common
  Core, Florida B.E.S.T., Virginia SOL, Texas TEKS, or another framework without
  changing how the child learns it.
- Report support at the objective level. Do not claim complete framework
  alignment while geometry, measurement, written-numeral comparison, writing
  numerals, or other required domains are absent.
- Review mappings against the primary standards publications and include the
  edition/year.

## Phase 1 — Correctness and truthful contracts

- [x] Reproduce the nested Numbers-progress startup crash.
- [x] Normalize Numbers digit keys and entry values before any grown-up readout.
- [x] Add regression coverage proving malformed nested progress cannot stop app
      startup.
- [x] Make Patterns score-free on correct and assisted completions, matching its
      plan and the score-free Numbers/Letters model.
- [x] Add score-free Patterns regression coverage.
- [x] Ignore `.claude/` so machine-local configuration cannot be committed.
- [x] Replace branded child-facing Math method names with neutral descriptions
      while preserving stored ids for compatibility.
- [x] Add public and grown-up-facing limits: one browser profile per learner,
      app use is supplemental, and Words audio/observation validation is pending.
- [x] Leave existing `edamame-score-patterns` values inert. Silently deleting
      browser data provides no learner benefit and is not required for correctness.
- [ ] Resolve the repository rename/deployment URL handoff and verify the public
      URL from a clean browser.
- [ ] Complete the iOS home-screen, audio, long-press, and orientation checks on
      physical target devices.

### Phase 1 acceptance

- Corrupt or stale local storage cannot prevent the default mode from opening.
- Patterns never shows or changes a score.
- The documented public URL loads the current commit.
- Public documentation distinguishes implemented, observed, and validated work.

## Phase 2 — Honest readiness and learner identity

- [x] Rename current grown-up-facing Math status to **ready in recent practice**.
      Words and Patterns terminology remains to migrate.
      Preserve stored fields initially and migrate only with explicit versioning.
- [ ] Record timestamps/session identifiers so six rapid responses cannot stand
      in for retention.
- [ ] Add a delayed confirmation state after a later session or suitable elapsed
      interval.
- [ ] Confirm with changed examples, arrangements, and representations; never
      repeat the exact assessment item as the transfer check.
- [ ] Add lightweight mixed review after readiness without trapping a child in
      already-secure material.
- [ ] Keep corrected/guided completions celebratory but exclude them from
      independent readiness.
- [x] Add an explicit one-learner-per-browser warning until profiles ship.
- [ ] Add local learner profiles so a sibling cannot inherit another child's
      path.
- [ ] Replace the global 5-of-6 convention with per-objective rules only where
      evidence or observed calibration justifies a difference.
- [x] Pilot delayed, non-blocking confirmation in Math: record session/time when
      recent readiness is reached, mix in one check on a later page session, and
      grandfather historical `mastered` records as confirmed.

### Phase 2 acceptance

- The interface never calls immediate performance permanent mastery.
- Readiness survives reloads but can request a later confirmation.
- Two local learners cannot write into the same progress record accidentally.
- Progress normalization and migrations are covered for every module.

## Phase 3 — Math instructional core

- [x] Write `docs/research/early-math-evidence.md` with the same
      evidence-to-product and limitations tables used by the Words review.
- [x] Define neutral objectives for counting sequence, one-to-one
      correspondence, cardinality, subitizing small sets, numeral/quantity matching,
      comparison, composing/decomposing, addition, subtraction, and place value in
      `docs/research/early-math-objectives.md`.
- [ ] Add model → guided → independent lessons for first addition, counting on,
      decomposing within 5/10, making ten, and fact relationships. First addition
      now has its entry lesson; the remaining relationships are pending.
- [ ] Connect concrete, pictorial, verbal, and symbolic forms within the same
      activity; do not count random renderer rotation as a connection.
- [ ] Expand story structures beyond result-unknown joining and separating:
      unknown change, unknown start, part-part-whole, and comparison.
- [ ] Add and invite precise language: more, fewer, same, part, whole, before,
      after, equal, tens, and ones. The comparison sequence now explicitly teaches
      more/fewer/same; remaining language connections are pending.
- [ ] Add optional **Talk together** prompts such as “How do you know?” and
      physical follow-ups using household objects. Optional prompts now ship in
      every current Math lesson; the physical extensions remain pending.
- [ ] Move carrying, borrowing, and arbitrary two-digit subtraction out of the
      stated early-first core until their scope, prerequisites, and lessons are
      explicit.
- [x] Replace “Big kid math” wording with concept-specific, non-hierarchical
      language.

### Phase 3 acceptance

- No new concept first appears as an unexplained scored question.
- Every representation names how it corresponds to the quantity or notation.
- Math covers comparison as well as counting and operations.
- Automated progression never reaches an objective outside the declared age and
  prerequisite scope.

## Phase 4 — Broader early mathematics

- [ ] Build **Shapes & Space** before adding more advanced arithmetic: recognize
      and describe attributes, compare shapes, and compose/decompose shapes.
- [ ] Add informal measurement comparisons using direct, concrete language.
- [ ] Expand Patterns from extension to copying, repairing, and creating once
      extension is secure.
- [ ] Add “same quantity, different arrangement” transfer checks across Numbers
      and Math without silently sharing readiness records.
- [ ] Consider simple sorting/data activities only after Shapes and comparison
      have observed-child validation.

## Phase 5 — Literacy validity

- [ ] Add licensed, human-reviewed local phoneme clips and complete provenance in
      `assets/phonemes/README.md`.
- [ ] Review dialect coverage and avoid presenting accent differences as errors.
- [ ] Complete the Words observed-child release checklist with at least three
      appropriately ready children during the consolidated P18 round; record no
      analytics or identifying data.
- [x] Change Letter Formation copy to **Follow the stroke path** while the child
      taps waypoints.
- [ ] Prototype forgiving drag tracing separately. Claim handwriting practice
      only if the child actually produces the path and physical-device observation
      supports the interaction.
- [ ] Add a printable/off-screen pencil extension rather than implying that
      tapping replaces handwriting.

## Phase 6 — Accessibility, validation, and maintenance

- [ ] Review all axe findings, not only serious/critical impact, and document any
      intentional exceptions.
- [ ] Stop disabling contrast in stage-fit tests; make the deterministic palette
      check reusable where axe cannot evaluate gradients.
- [ ] Complete manual screen-reader, switch/keyboard, zoom, speech-off, and
      physical touch-device checks using a recorded checklist.
- [ ] Retire the unregistered legacy Math container, controller, CSS, and seven
      skipped tests after a final recovery decision.
- [ ] Establish a Prettier baseline or remove `format:check` from the advertised
      validation workflow until it is expected to pass.
- [ ] Add focused unit tests for curriculum generators and normalization so every
      data defect does not require a full browser run. Direct subitizing-boundary
      and comparison-answer generator checks now provide the first coverage.
- [ ] Refresh roadmap counts and statuses that still describe earlier test/module
      states.

## Evidence and observation release gates

For each instructional objective:

- at least one appropriately scoped evidence or developmental source is recorded;
- extrapolations to a younger age, app-only delivery, or a different language are
  explicit;
- the activity exposes its instructional model before independent readiness;
- assisted, corrected, immediate, delayed, and transferred results are distinct;
- speech-off and reduced-motion behavior remains usable without pretending to be
  instructionally equivalent;
- observed-child notes cover comprehension, intentional control use, recovery,
  ambiguity, and disengagement;
- standards mappings are versioned, secondary metadata and make no efficacy
  claim.

Scarce child access is consolidated under
[P18](18-batched-child-observation.md): freeze the curriculum candidate first,
then distribute objectives across short sessions in one coordinated round rather
than requesting a new round for each feature.

## Recommended delivery order

1. Finish Phase 1 correctness and deployment gates.
2. Ship the Phase 2 readiness vocabulary/data migration before adding new
   curriculum, so new modules do not copy the current permanence problem.
3. Complete the Math evidence review and foundational lessons.
4. Validate the first comparison sequence and add Shapes & Space before advanced
   arithmetic.
5. Finish phoneme audio and letter-formation claim corrections.
6. Remove legacy code and close validation/tooling debt.
