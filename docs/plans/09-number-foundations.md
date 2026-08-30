# P9 — Stable, Meaningful Counting

> **Status (2026-08-30): Shipped.** Number Fun now uses stable counting slots, reveal-led narration, a cardinality recap, and guarded speech recovery across desktop and mobile layouts.

## Goal

Make Numbers a calm first counting experience for toddlers. Each numeral should be paired with a stable set of objects, one-to-one counting, and a clear statement that the final counting word names the quantity of the whole set.

## Evidence used

- The [IES *Teaching Math to Young Children* practice guide](https://ies.ed.gov/ncee/wwc/Docs/PracticeGuide/early_math_pg_111313.pdf) recommends teaching number and operations along a developmental progression, including recognizing very small quantities, one-to-one counting, and understanding that the last number word tells how many objects are in the set.
- The IES [Meaningful Counting teacher toolkit](https://ies.ed.gov/ncee/rel/math-young-children/pdf/TMYC_Mod2_Teacher_Learning_Journal.pdf) models slow, deliberate coordination of a spoken number word with pointing to or touching one object, followed by stating the set's cardinal quantity.
- Research with young children found that [correspondence between counting gestures and spoken number words is related to counting performance](https://www.sciencedirect.com/science/article/pii/S0022096599925201).
- Four-year-olds can detect substantial audiovisual timing mismatches, and that integration window narrows with age, in this [developmental audiovisual synchrony study](https://academic.oup.com/chidev/article/85/2/685/8260666).

The sources do not prescribe this application's exact grid. Reserving every object's final position before counting is a product inference: it reduces irrelevant motion so the child can track which object is paired with each spoken word.

## Experience design

- [x] Reserve the complete set's footprint before counting begins so earlier objects never move when another appears.
- [x] Reveal objects in a predictable left-to-right order, with a visible current-object highlight.
- [x] Make each object visible immediately before its number word is requested from text-to-speech; do not depend on the speech engine's imprecise audible-start event.
- [x] Use one guarded fallback per counting step so missing speech events cannot freeze the activity or let several timers race ahead.
- [x] Finish by highlighting the full set and stating cardinality, for example, “Four. There are four frogs.”
- [x] Present zero as an intentionally empty set and say, “Zero. There are no frogs.”
- [x] Keep speech-off counting fully functional with the same visual sequence and a predictable silent pace.
- [x] Cancel an interrupted count cleanly when the child chooses a new numeral or leaves Numbers.
- [x] Keep the experience child-led, score-free, and free of wrong-answer states.

## Visual and accessibility rules

- [x] Use fixed-size grid cells with at most five columns so sets through nine fit desktop, Pixel, and iPhone layouts.
- [x] Hidden objects retain their space but are excluded from accessibility output; the completed set receives a concise quantity label.
- [x] Do not animate opacity during the reveal. A small scale/glow cue may reinforce the current item without delaying visibility.
- [x] Respect reduced-motion preferences by removing reveal and completion animation.

## Acceptance coverage

- [x] All final slots exist immediately and the coordinates of earlier slots remain unchanged throughout the count.
- [x] Objects reveal one at a time in left-to-right order with speech on and off.
- [x] Each reveal occurs before its count word is queued.
- [x] The final narration states cardinality with correct singular/plural wording.
- [x] Speech stalls recover one step at a time without duplicate objects or narration.
- [x] A new numeral and a mode change cancel stale work.
- [x] Zero, desktop/mobile fit, reduced motion, and serious/critical axe coverage pass.

## Follow-on observations

- Observe whether children ages 2½–5 spontaneously recognize sets of one to three before counting; if so, pilot a brief “How many?” subitizing pause for those quantities.
- Add an optional child-controlled replay or tap-to-count interaction only if observation shows children want more control than numeral selection already provides.
- Later vary object arrangement after one-to-one correspondence is secure, so children learn that quantity remains constant when spacing or order changes.
