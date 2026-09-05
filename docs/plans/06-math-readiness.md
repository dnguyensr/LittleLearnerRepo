# Math: readiness paths and guided learning

> **Status (2026-09-05):** Math Lab and its comparison, first-addition,
> subtraction, and place-value Guided Learn lessons ship as one main Math
> experience. The former beta preference is ignored for compatibility, so an
> older stored “off” value cannot hide instruction from a child entering a new
> relationship or path.

## Product model

The curriculum rationale, evidence strength, standards crosswalk boundaries,
and next objective order are maintained in
[the early-Math evidence review](../research/early-math-evidence.md). Stable,
standards-neutral goals and prerequisites are defined in the
[early-Math objective map](../research/early-math-objectives.md).

Math separates three concerns:

- **Skills:** a shared developmental sequence and three reversible paths.
- **Instruction:** short concrete → visual → symbolic lessons at new-concept gates.
- **Presentation:** Build, See & Write; Practice & Columns; Frames & Number
  Lines; or Variety. The stored ids remain `singapore`, `classical`,
  `commoncore`, and `mix` for compatibility.

Build, See & Write is the default for new installations. Existing stored method
choices are preserved. National programs and standards no longer name
child-facing presentation choices: Common Core is a standards framework, while
the corresponding renderer in this app is a collection of frames, number
lines, and blocks.

## Readiness graph

The shared foundation is:

1. Counting to 5
2. Quantity recognition (subitizing)
3. Counting to 10
4. Numeral-to-quantity matching
5. Comparing groups as more, fewer, or the same
6. Adding to 5
7. Counting on
8. Adding to 10

After addition to 10 is ready in recent practice, the child chooses:

- **Keep Adding:** addition-to-10 facts and strategies without forced advancement.
- **Learn Take Away:** subtraction to 5, count-back/part-whole work, then subtraction to 10.
- **Big Addition:** place value, teen strategies, whole tens, and two-digit addition without regrouping.

The child can reopen **Paths** at any time. Carrying, two-digit subtraction,
and borrowing remain available through parent-pinned stages, but are not in an
automatic path until they have guided lessons.

### Readiness rule

Each skill stores the last six completed outcomes. An outcome is independent
only when the problem is solved before any miss and without a hint. Five
independent outcomes among the latest six mark the skill ready in recent
practice and allow the path to continue. Corrected and hinted work still scores
and celebrates, but is recorded as assisted. An unfinished problem is ignored.

New readiness records also store the browser session and time. On a later page
session, Math mixes in one pending check without moving the learner backward or
blocking the current path. An independent result confirms that the skill
remained ready; assisted work defers confirmation to another session. Historical
`mastered` records are grandfathered as confirmed for compatibility. The stored
field name remains `mastered` until a versioned migration removes it.

## Guided Learn lessons

The first automatic entry into comparison, addition within 5, subtraction, or
Big Addition opens a three-scene inline lesson. Lesson scenes are tap-first,
persist across reloads, award no score, and may be replayed through **Learn
Together** after two misses. A completed lesson is skipped on later visits unless
the child intentionally chooses the replay support. Existing learners whose
saved progress predates a new foundation lesson are grandfathered rather than
being moved backward.

- **Compare Groups:** align two groups in equal-width rows, name more/fewer/same,
  make a guided comparison, then identify equal groups independently.
- **Introduction to Addition:** see two parts make a whole, add one object to a
  group, then put two small groups together independently.
- **Introduction to Subtraction:** watch a group shrink, remove a requested
  number of objects, then choose the amount left.
- **Place Value & Two-Digit Addition:** identify tens and ones, combine two
  block groups, then solve one no-regroup sum.

Every lesson's final scene includes an optional, non-scored **Talk together**
prompt. Solo use remains unblocked. The reusable `LessonDefinition` contract
keeps new lessons out of the Math mode shell. See the
[batched observation plan](18-batched-child-observation.md) and its short
[Math lesson sheet](math-learn-observation-checklist.md) for the local-only,
single-round protocol.

## Persistence and compatibility

`edamame-mathlab-progress` now stores:

```text
{
  version: 2,
  selectedPath,
  currentSkill,
  skills: { [skillId]: { recentIndependent, mastered, readyAt, readySession,
                         confirmed, confirmedAt, lastConfirmationSession } },
  lessons: { [lessonId]: { status, scene } }
}
```

The loader migrates the previous `{ spine, streak, done }` and four-level
formats, preserving the current skill, completed detours, and the nearest path.
Stored method ids and exact-skill parent settings remain valid. **Start over**
clears the whole graph and lesson state after its existing two-tap confirmation.

## Release gates

- JSDoc typecheck passes with no build step.
- Graph, migration, path, lesson, method, touch, keyboard, fit, and accessibility
  behavior pass on desktop and phone projects.
- Test runs terminate normally. The apparent teardown hang was a lesson test
  waiting on a disabled control after its counter state failed to advance; the
  interaction and regression test now complete correctly.
- The lessons have graduated into the main path and no longer have a runtime
  beta flag. The caregiver checklist remains useful for ongoing usability review
  and for deciding what to improve before adding later lessons.

## Next curriculum work

- Guided lessons for decomposition, counting on, making ten, fact relationships,
  carrying, advanced subtraction, and borrowing.
- Local learner profiles for families sharing a device.
- Retire the unregistered legacy Math mode after this graph is stable in child use.
