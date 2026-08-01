import { mathItems } from '../data/math-items.js';

/** @typedef {import('../types.js').Problem} Problem */
/** @typedef {import('../types.js').MathItem} MathItem */

// One problem generator shared by every teaching method, so the same problem
// can be rendered through a different lens without changing its difficulty.
// Methods only decide how a problem is *represented and worked*.

export const MAX_LEVEL = 4;
export const PROBLEMS_PER_LEVEL = 5;

export const levelLabels = {
    1: 'Learning to count',
    2: 'Single-digit addition',
    3: 'Single-digit subtraction',
    4: 'Double-digit add & subtract'
};

export function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(list) {
    return list[rand(0, list.length - 1)];
}

// The subtraction stories need an eater, which only the food items carry.
const foodItems = mathItems.filter(item => item.isFood);

// Keep a level in range whatever it came from — a parent's dropdown, stored
// progress, or a hand-edited localStorage value.
export function clampLevel(value) {
    if (!Number.isFinite(value)) return 1;
    return Math.min(MAX_LEVEL, Math.max(1, Math.floor(value)));
}

/** @returns {Problem} */
function countProblem() {
    const item = pick(mathItems);
    const n = rand(1, 10);
    return {
        level: 1,
        op: 'count',
        a: n,
        b: null,
        answer: n,
        item,
        equation: null,
        questionText: `Count the ${item.name}!<br>How many are there?`,
        speakText: `Count the ${item.name.toLowerCase()}. How many are there?`
    };
}

/** @returns {Problem} */
function addProblem() {
    const item = pick(mathItems);
    const a = rand(1, 9);
    const b = rand(1, 9);
    return {
        level: 2,
        op: 'add',
        a,
        b,
        answer: a + b,
        item,
        equation: `${a} + ${b} = ?`,
        questionText: `${a} + ${b} — how many ${item.name} altogether?`,
        speakText: `${a} plus ${b}. How many altogether?`
    };
}

/** @returns {Problem} */
function subtractProblem() {
    const item = pick(foodItems);
    const a = rand(2, 9);
    const b = rand(1, a - 1);
    const eatenName = b === 1 ? item.singular : item.name;
    return {
        level: 3,
        op: 'sub',
        a,
        b,
        answer: a - b,
        item,
        equation: `${a} − ${b} = ?`,
        questionText: `${item.eater} The ${item.eaterName} eats ${b} ${eatenName}!<br>How many ${item.name} are left?`,
        speakText: `There are ${a} ${item.name.toLowerCase()}. The ${item.eaterName.toLowerCase()} eats ${b}. How many are left?`
    };
}

// Double-digit stays inside 2 columns on purpose: sums never reach 100 and
// differences never drop below 10, so the answer is always exactly two digits
// and the column algorithm never needs a hundreds column or a leading zero.
/**
 * @param {MathItem} item
 * @returns {Problem}
 */
function doubleAddProblem(item) {
    const a = rand(10, 45);
    const b = rand(10, Math.min(49, 99 - a));
    return {
        level: 4,
        op: 'add',
        a,
        b,
        answer: a + b,
        item,
        equation: `${a} + ${b} = ?`,
        questionText: `Big kid math! ${a} + ${b}`,
        speakText: `${a} plus ${b}. Start with the ones.`
    };
}

/**
 * @param {MathItem} item
 * @returns {Problem}
 */
function doubleSubProblem(item) {
    const answer = rand(10, 49);
    const b = rand(10, Math.min(49, 99 - answer));
    return {
        level: 4,
        op: 'sub',
        a: answer + b,
        b,
        answer,
        item,
        equation: `${answer + b} − ${b} = ?`,
        questionText: `Big kid math! ${answer + b} − ${b}`,
        speakText: `${answer + b} take away ${b}. Start with the ones.`
    };
}

/** @returns {Problem} */
function doubleDigitProblem() {
    const item = pick(mathItems);
    return Math.random() < 0.5 ? doubleAddProblem(item) : doubleSubProblem(item);
}

/** @type {Record<number, () => Problem>} */
const generators = {
    1: countProblem,
    2: addProblem,
    3: subtractProblem,
    4: doubleDigitProblem
};

/**
 * @param {number} level
 * @returns {Problem}
 */
export function generateProblem(level) {
    return (generators[level] || countProblem)();
}
