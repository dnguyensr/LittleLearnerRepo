import { mathItems } from '../data/math-items.js';

export const BRIDGE_SKILLS = ['decompose5', 'countOn'];

/** A finite content domain also makes confirmation variation deterministic. */
export function bridgeVariants(skill) {
    const variants = [];
    if (skill === 'decompose5') {
        for (let total = 2; total <= 5; total++) {
            for (let a = 0; a <= total; a++) {
                for (const unknownPart of ['left', 'right']) {
                    variants.push({
                        task: 'decomposeWhole',
                        a,
                        b: null,
                        total,
                        unknownPart,
                        representation: 'trays'
                    });
                }
            }
        }
    } else if (skill === 'countOn') {
        for (let a = 1; a < 10; a++) {
            for (let b = 1; b <= 10 - a; b++) {
                for (const representation of ['objects', 'numberLine']) {
                    variants.push({
                        task: 'countOnFrom',
                        a,
                        b,
                        total: null,
                        unknownPart: null,
                        representation
                    });
                }
            }
        }
    }
    return variants;
}

export function itemSignature(problem) {
    if (!problem || !BRIDGE_SKILLS.includes(problem.skill)) return null;
    return normalizeSignature(problem.skill, problem);
}

export function normalizeSignature(skill, raw) {
    if (!raw || typeof raw !== 'object') return null;
    return (
        bridgeVariants(skill).find(variant =>
            Object.keys(variant).every(key => variant[key] === (raw[key] ?? null))
        ) || null
    );
}

/** @returns {import('../types.js').Problem} */
export function bridgeProblem(skill, variant, item = mathItems[0]) {
    const { a, b, total, unknownPart, representation } = variant;
    const decomposition = skill === 'decompose5';
    const equation = decomposition
        ? `${unknownPart === 'left' ? '?' : a} + ${unknownPart === 'right' ? '?' : a} = ${total}`
        : `${a} + ${b} = ?`;
    const prompt = decomposition
        ? `The whole is ${total}. One part is ${a}. How many in the other part?`
        : `Start with ${a}. Add ${b} more. How many altogether?`;
    return {
        skill,
        task: decomposition ? 'decomposeWhole' : 'countOnFrom',
        op: decomposition ? 'missing' : 'add',
        a,
        b,
        total,
        unknownPart,
        representation,
        answer: decomposition ? total - a : a + b,
        equation,
        item,
        questionText: prompt,
        speakText: prompt,
        twoDigit: false,
        crossesTen: false,
        regroups: false
    };
}

export function generateBridgeProblem(skill) {
    const variants = bridgeVariants(skill);
    return bridgeProblem(skill, variants[Math.floor(Math.random() * variants.length)]);
}

export function confirmationProblem(skill, signature, taughtRepresentations) {
    const baseline = normalizeSignature(skill, signature);
    if (!baseline || !Array.isArray(taughtRepresentations)) return null;
    const eligible = bridgeVariants(skill).filter(
        variant =>
            taughtRepresentations.includes(variant.representation) &&
            (variant.a !== baseline.a ||
                variant.b !== baseline.b ||
                variant.total !== baseline.total) &&
            (variant.unknownPart !== baseline.unknownPart ||
                variant.representation !== baseline.representation)
    );
    return eligible.length
        ? bridgeProblem(skill, eligible[Math.floor(Math.random() * eligible.length)])
        : null;
}
