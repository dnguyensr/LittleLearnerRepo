// Pattern types and the items they are built from.
//
// Difficulty here is the *structure of the repeating unit*, not the length of
// the row: `ab` alternation is easier than `aab` regardless of how many tiles
// are on screen. Research on early patterning finds that extending a repeating
// pattern comes before naming its unit, so every rung on this ladder asks the
// child to continue a pattern, never to describe it.
//
// See docs/plans/14-patterns.md.

/** @typedef {import('../types.js').PatternDefinition} PatternDefinition */

// Nothing here may appear in js/data/decor.js. A celebration particle drifts
// over the play area while a pattern is still on screen, and a particle that is
// also a pattern item makes "what comes next" ambiguous — the same rule Math,
// Numbers and Words already follow. tests/emoji-roles.spec.js enforces it.
export const patternItems = [
    { emoji: '🔴', name: 'red circle' },
    { emoji: '🔵', name: 'blue circle' },
    { emoji: '🟡', name: 'yellow circle' },
    { emoji: '🟩', name: 'green square' },
    { emoji: '🍎', name: 'apple' },
    { emoji: '🍌', name: 'banana' },
    { emoji: '🐶', name: 'dog' },
    { emoji: '🐱', name: 'cat' },
    { emoji: '🐸', name: 'frog' },
    { emoji: '🌙', name: 'moon' },
    { emoji: '🌻', name: 'sunflower' },
    { emoji: '🚗', name: 'car' }
];

export const patternEmojis = patternItems.map(item => item.emoji);

/** @type {PatternDefinition[]} */
export const PATTERN_TYPES = [
    {
        id: 'ab',
        label: 'Two that take turns',
        unit: ['a', 'b'],
        distinct: 2,
        // Two full repetitions plus a partial one, so the unit is always
        // visible twice before the child is asked to continue it.
        repetitions: 2
    },
    { id: 'aab', label: 'Two, then one', unit: ['a', 'a', 'b'], distinct: 2, repetitions: 2 },
    { id: 'abb', label: 'One, then two', unit: ['a', 'b', 'b'], distinct: 2, repetitions: 2 },
    { id: 'abc', label: 'Three in a row', unit: ['a', 'b', 'c'], distinct: 3, repetitions: 2 }
];

export const PATTERN_STAGE_OPTIONS = [
    { id: 'auto', label: 'Learning path' },
    ...PATTERN_TYPES.map(type => ({ id: type.id, label: type.label }))
];

const typeById = Object.fromEntries(PATTERN_TYPES.map(type => [type.id, type]));

/** @param {string} id */
export function patternType(id) {
    return typeById[id] || null;
}

export function itemByEmoji(emoji) {
    return patternItems.find(item => item.emoji === emoji) || null;
}

/**
 * Build one puzzle: the visible run, the item that continues it, and the
 * choices offered.
 *
 * Distractors come from the pattern's **own** items, never from unrelated ones.
 * A child who picks one has made a plausible confusion about the structure,
 * which is the thing being learned; a stray emoji from another pattern would
 * only be testing whether they were paying attention.
 *
 * @param {string} typeId
 * @param {(max: number) => number} randomBelow injected so tests are deterministic
 */
export function buildPattern(typeId, randomBelow) {
    const type = patternType(typeId) || PATTERN_TYPES[0];

    const pool = [...patternItems];
    const chosen = [];
    for (let i = 0; i < type.distinct; i++) {
        chosen.push(pool.splice(randomBelow(pool.length), 1)[0]);
    }
    const slots = { a: chosen[0], b: chosen[1], c: chosen[2] };

    const full = [];
    for (let repetition = 0; repetition < type.repetitions + 1; repetition++) {
        for (const slot of type.unit) full.push(slots[slot]);
    }

    // The row stops one item short of completing the final repetition, so what
    // comes next is always the continuation of a unit already seen twice.
    const shownLength = type.unit.length * type.repetitions
        + type.unit.length - 1;
    const shown = full.slice(0, shownLength);
    const answer = full[shownLength];

    const choices = [answer, ...chosen.filter(item => item.emoji !== answer.emoji)];
    // Shuffle so the answer is not always first.
    for (let i = choices.length - 1; i > 0; i--) {
        const j = randomBelow(i + 1);
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    return { type, shown, answer, choices, unitItems: chosen };
}
