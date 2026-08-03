// Decoration and content must be disjoint sets.
//
// A celebration particle drifts *over* the play area while a problem is still
// on screen. If a particle is also something the child can be asked to count,
// "count exactly these objects" stops having one right answer — four of the
// sixteen countable subjects (⭐ ❤️ 🎈 🎁) used to double as particles, so on a
// quarter of counting problems a decoration was indistinguishable from a thing
// to be counted.
//
// So nothing here may appear in js/data/math-items.js (countable subjects and
// their eaters), js/modes/numbers.js (the objects Numbers mode reveals) or
// js/data/words.js (a word's picture). tests/emoji-roles.spec.js enforces that,
// and also guards the score badge in index.html.
//
// What a spec cannot catch is a *lookalike*: 🌟 reads as a star next to ⭐
// STARS, and 💜💙💚💛🧡 all read as "a heart" next to ❤️ HEARTS. Those were
// dropped by hand for the same reason and should stay out.
export const celebrationEmojis = ['✨', '💫', '🎉', '🎊', '🌈', '🎆', '🎇'];
