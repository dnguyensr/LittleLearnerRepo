import { mathItems } from '../data/math-items.js';

/** @typedef {import('../types.js').Problem} Problem */
/** @typedef {import('../types.js').MathItem} MathItem */

// Every problem in Math Lab, keyed by skill. One generator per skill; the
// teaching methods decide how a problem is *shown*, never what it asks.
//
// Methods dispatch on a problem's SHAPE (`op`, `twoDigit`, `crossesTen`,
// `regroups`), not on its skill id — so adding a rung to the ladder does not
// mean editing all three methods.

export function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(list) {
    return list[rand(0, list.length - 1)];
}

// The eater stories need an animal, which only the food items carry.
const foodItems = mathItems.filter(item => item.isFood);

/**
 * Fill in the derived shape flags so no generator has to remember them.
 *
 * `twoDigit` defaults to false and is opted into by the generators that mean
 * it, rather than being sniffed from magnitude. Magnitude gets it wrong in both
 * directions: counting ten apples is not place-value work, and 15 − 7 is
 * count-back territory, not a column algorithm with a leading zero.
 *
 * @returns {Problem}
 */
function make(fields) {
    const { op, a } = fields;
    const b = fields.b ?? null;
    const other = b ?? 0;
    return {
        b: null,
        total: null,
        equation: null,
        item: fields.item,
        twoDigit: false,
        crossesTen: op === 'add' && a < 10 && other < 10 && a + other > 10,
        regroups: op === 'add'
            ? (a % 10) + (other % 10) >= 10
            : op === 'sub' && a % 10 < other % 10,
        ...fields
    };
}

/* ---------- Counting ---------- */

function counting(skill, max) {
    const item = pick(mathItems);
    const n = rand(1, max);
    return make({
        skill,
        op: 'count',
        a: n,
        answer: n,
        item,
        questionText: `Count the ${item.name}!<br>How many are there?`,
        speakText: `Count the ${item.name.toLowerCase()}. How many are there?`
    });
}

// "What comes before 7?" — counting backwards as its own idea, not subtraction.
function countBack() {
    const item = pick(mathItems);
    const n = rand(2, 10);
    return make({
        skill: 'countBack',
        op: 'count',
        a: n,
        answer: n - 1,
        item,
        questionText: `What number comes just before ${n}?`,
        speakText: `Counting backwards. What comes just before ${n}?`
    });
}

/* ---------- Addition ---------- */

function addition(skill, { maxSum, minSum = 2, crossTen = null }) {
    const item = pick(mathItems);
    let a, b;
    do {
        a = rand(1, Math.min(9, maxSum - 1));
        b = rand(1, Math.min(9, maxSum - a));
    } while (
        a + b < minSum
        || (crossTen === true && a + b <= 10)
        || (crossTen === false && a + b > 10)
    );

    return make({
        skill,
        op: 'add',
        a,
        b,
        answer: a + b,
        item,
        equation: `${a} + ${b} = ?`,
        questionText: `${a} + ${b} — how many ${item.name} altogether?`,
        speakText: `${a} plus ${b}. How many altogether?`
    });
}

// Doubles are worth knowing by heart, so they get their own rung.
function doubles() {
    const item = pick(mathItems);
    const a = rand(1, 9);
    return make({
        skill: 'doubles',
        op: 'add',
        a,
        b: a,
        answer: a + a,
        item,
        equation: `${a} + ${a} = ?`,
        questionText: `Double ${a}!`,
        speakText: `Double ${a}. ${a} plus ${a}.`
    });
}

// 10 + 4 = 14: the fact that makes teen numbers make sense.
function tenAndSome() {
    const item = pick(mathItems);
    const b = rand(1, 9);
    return make({
        skill: 'tenAndSome',
        op: 'add',
        a: 10,
        b,
        answer: 10 + b,
        item,
        equation: `10 + ${b} = ?`,
        questionText: `10 + ${b}`,
        speakText: `Ten plus ${b}.`
    });
}

// The same fact the other way round: you know 3 + 4, so what is 4 + 3?
function factFamily() {
    const item = pick(mathItems);
    let a, b;
    do {
        a = rand(1, 9);
        b = rand(1, 9);
    } while (a === b || a + b > 10);

    return make({
        skill: 'factFamily',
        op: 'add',
        a: b,
        b: a,
        answer: a + b,
        item,
        equation: `${b} + ${a} = ?`,
        questionText: `You know ${a} + ${b} = ${a + b}.<br>So what is ${b} + ${a}?`,
        speakText: `You know ${a} plus ${b} is ${a + b}. So what is ${b} plus ${a}?`
    });
}

/* ---------- Subtraction ---------- */

function subtraction(skill, { max }) {
    const item = pick(foodItems);
    const a = rand(2, max);
    const b = rand(1, a - 1);
    const eaten = b === 1 ? item.singular : item.name;
    return make({
        skill,
        op: 'sub',
        a,
        b,
        answer: a - b,
        item,
        equation: `${a} − ${b} = ?`,
        questionText: `${item.eater} The ${item.eaterName} eats ${b} ${eaten}!<br>How many ${item.name} are left?`,
        speakText: `There are ${a} ${item.name.toLowerCase()}. The ${item.eaterName.toLowerCase()} eats ${b}. How many are left?`
    });
}

/* ---------- Missing addend ---------- */

function missingAddend(skill, { total: fixedTotal = null, max = 20 } = {}) {
    const item = pick(mathItems);
    const total = fixedTotal ?? rand(5, max);
    const a = rand(1, total - 1);
    return make({
        skill,
        op: 'missing',
        a,
        b: null,
        total,
        answer: total - a,
        item,
        equation: `${a} + ? = ${total}`,
        questionText: `${a} + ? = ${total}<br>How many more to make ${total}?`,
        speakText: `${a} and how many more makes ${total}?`
    });
}

/* ---------- Place value ---------- */

// "How many tens in 47?" — the idea every two-digit strategy rests on.
function tensAndOnes() {
    const item = pick(mathItems);
    const n = rand(11, 99);
    const askTens = Math.random() < 0.5;
    return make({
        skill: 'tensAndOnes',
        op: 'count',
        a: n,
        answer: askTens ? Math.floor(n / 10) : n % 10,
        item,
        twoDigit: true,
        questionText: `In ${n}, how many <strong>${askTens ? 'tens' : 'ones'}</strong>?`,
        speakText: `In ${n}, how many ${askTens ? 'tens' : 'ones'}?`
    });
}

/* ---------- Two-digit ---------- */

function twoDigitAdd(skill, { regroup, tensOnly = false }) {
    const item = pick(mathItems);
    let a, b;
    do {
        a = rand(11, tensOnly ? 79 : 49);
        b = tensOnly ? rand(1, 8) * 10 : rand(10, Math.min(49, 99 - a));
    } while (
        a + b > 99
        || (tensOnly ? false : regroup !== ((a % 10) + (b % 10) >= 10))
    );

    return make({
        skill,
        op: 'add',
        a,
        b,
        answer: a + b,
        item,
        twoDigit: true,
        equation: `${a} + ${b} = ?`,
        questionText: `Big kid math! ${a} + ${b}`,
        speakText: `${a} plus ${b}.`
    });
}

function twoDigitSub(skill, { regroup }) {
    const item = pick(mathItems);
    let a, b;
    do {
        const answer = rand(10, 49);
        b = rand(10, Math.min(49, 99 - answer));
        a = answer + b;
    } while (a > 99 || regroup !== (a % 10 < b % 10));

    return make({
        skill,
        op: 'sub',
        a,
        b,
        answer: a - b,
        item,
        twoDigit: true,
        equation: `${a} − ${b} = ?`,
        questionText: `Big kid math! ${a} − ${b}`,
        speakText: `${a} take away ${b}.`
    });
}

/* ---------- The skill table ---------- */

/**
 * Every skill Math Lab can ask about. `stage` groups them for the parent
 * dropdown, which should never present twenty-odd individual rungs.
 *
 * @type {Record<string, { label: string, stage: string, generate: () => Problem }>}
 */
export const skills = {
    // Counting
    count5: { label: 'Counting to 5', stage: 'counting', generate: () => counting('count5', 5) },
    count10: { label: 'Counting to 10', stage: 'counting', generate: () => counting('count10', 10) },
    subitize: { label: 'How many did you see?', stage: 'counting', generate: () => counting('subitize', 10) },
    countBack: { label: 'Counting backwards', stage: 'counting', generate: countBack },
    numeralMatch: { label: 'Matching numerals', stage: 'counting', generate: () => counting('numeralMatch', 10) },

    // Adding to 10
    addWithin5: { label: 'Adding to 5', stage: 'adding10', generate: () => addition('addWithin5', { maxSum: 5 }) },
    countOn: { label: 'Counting on', stage: 'adding10', generate: () => addition('countOn', { maxSum: 9 }) },
    addWithin10: { label: 'Adding to 10', stage: 'adding10', generate: () => addition('addWithin10', { maxSum: 10 }) },
    doubles: { label: 'Doubles', stage: 'adding10', generate: doubles },
    factFamily: { label: 'Fact families', stage: 'adding10', generate: factFamily },
    bondTo10: { label: 'Number bonds to 10', stage: 'adding10', generate: () => missingAddend('bondTo10', { total: 10 }) },

    // Taking away to 10
    subWithin5: { label: 'Taking away to 5', stage: 'subtracting10', generate: () => subtraction('subWithin5', { max: 5 }) },
    subWithin10: { label: 'Taking away to 10', stage: 'subtracting10', generate: () => subtraction('subWithin10', { max: 10 }) },
    partWhole: { label: 'Finding the missing part', stage: 'subtracting10', generate: () => missingAddend('partWhole', { max: 10 }) },

    // Teen numbers
    makeTen: { label: 'Making a ten', stage: 'teens', generate: () => addition('makeTen', { maxSum: 18, minSum: 11, crossTen: true }) },
    tenAndSome: { label: 'Ten and some more', stage: 'teens', generate: tenAndSome },
    addWithin20: { label: 'Adding to 20', stage: 'teens', generate: () => addition('addWithin20', { maxSum: 18, minSum: 11 }) },
    subWithin20: { label: 'Taking away from teens', stage: 'teens', generate: () => subtraction('subWithin20', { max: 18 }) },
    missingAddend: { label: 'How many more?', stage: 'teens', generate: () => missingAddend('missingAddend', { max: 20 }) },
    tensAndOnes: { label: 'Tens and ones', stage: 'teens', generate: tensAndOnes },

    // Two-digit
    addTens: { label: 'Adding whole tens', stage: 'twodigit', generate: () => twoDigitAdd('addTens', { regroup: false, tensOnly: true }) },
    addWithin100: { label: 'Two-digit adding', stage: 'twodigit', generate: () => twoDigitAdd('addWithin100', { regroup: false }) },
    subWithin100: { label: 'Two-digit taking away', stage: 'twodigit', generate: () => twoDigitSub('subWithin100', { regroup: false }) },
    addRegroup: { label: 'Adding with carrying', stage: 'twodigit', generate: () => twoDigitAdd('addRegroup', { regroup: true }) },
    subRegroup: { label: 'Taking away with borrowing', stage: 'twodigit', generate: () => twoDigitSub('subRegroup', { regroup: true }) }
};

/**
 * @param {string} skillId
 * @returns {Problem}
 */
export function generateProblem(skillId) {
    const skill = skills[skillId] || skills.count5;
    return skill.generate();
}
