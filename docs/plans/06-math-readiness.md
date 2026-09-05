# Math: readiness paths and guided learning

> **Status (2026-08-30):** Math Lab and its subtraction and place-value Guided
> Learn lessons ship as one main Math experience. The former beta preference is
> ignored for compatibility, so an older stored “off” value cannot hide the
> instruction from a child entering a new path.

## Product model

Math separates three concerns:

- **Skills:** a shared developmental sequence and three reversible paths.
- **Instruction:** short concrete → visual → symbolic lessons at new-concept gates.
- **Presentation:** Singapore mastery, Traditional practice, Visual strategies,
  or Balanced mix. The stored ids remain `singapore`, `classical`,
  `commoncore`, and `mix` for compatibility.

Singapore mastery is the default for new installations. Existing stored method
choices are preserved. The term “Common Core” is no longer presented as a
teaching method; Common Core is a standards framework, while the renderer in
this app is a collection of visual strategies.

## Readiness graph

The shared foundation is:

1. Counting to 5
2. Quantity recognition (subitizing)
3. Counting to 10
4. Numeral-to-quantity matching
5. Adding to 5
6. Counting on
7. Adding to 10

After addition to 10 is mastered, the child chooses:

- **Keep Adding:** addition-to-10 facts and strategies without forced advancement.
- **Learn Take Away:** subtraction to 5, count-back/part-whole work, then subtraction to 10.
- **Big Addition:** place value, teen strategies, whole tens, and two-digit addition without regrouping.

The child can reopen **Paths** at any time. Carrying, two-digit subtraction,
and borrowing remain available through parent-pinned stages, but are not in an
automatic path until they have guided lessons.

### Readiness rule

Each skill stores the last six completed outcomes. An outcome is independent
only when the problem is solved before any miss and without a hint. Five
independent outcomes among the latest six permanently master the skill.
Corrected and hinted work still scores and celebrates, but is recorded as
assisted. An unfinished problem is ignored.

## Guided Learn lessons

The first entry into subtraction or Big Addition opens a three-scene inline
lesson. Lesson scenes are tap-first, persist across reloads, award no score, and
may be replayed through **Learn Together** after two misses. A completed lesson
is skipped on later path changes unless the child intentionally chooses the
replay support.

- **Introduction to Subtraction:** watch a group shrink, remove a requested
  number of objects, then choose the amount left.
- **Place Value & Two-Digit Addition:** identify tens and ones, combine two
  block groups, then solve one no-regroup sum.

The reusable `LessonDefinition` contract keeps new lessons out of the Math mode
shell. See [math-learn-observation-checklist.md](math-learn-observation-checklist.md) for the
local-only observation protocol.

## Persistence and compatibility

`edamame-mathlab-progress` now stores:

```text
{
  version: 2,
  selectedPath,
  currentSkill,
  skills: { [skillId]: { recentIndependent, mastered } },
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

- Guided lessons for first addition, making ten, carrying, advanced subtraction,
  and borrowing.
- Local learner profiles for families sharing a device.
- Retire the unregistered legacy Math mode after this graph is stable in child use.
