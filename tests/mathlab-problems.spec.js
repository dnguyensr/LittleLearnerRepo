const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

test('subitizing stays distinct from counting larger sets', async ({ page }) => {
    await gotoApp(page);
    const values = await page.evaluate(async () => {
        const { generateProblem } = await import('../js/math/problems.js');
        return Array.from({ length: 100 }, () => generateProblem('subitize').a);
    });

    expect(Math.min(...values)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...values)).toBeLessThanOrEqual(3);
});

test('comparison generators agree with more, fewer, and same answers', async ({ page }) => {
    await gotoApp(page);
    const problems = await page.evaluate(async () => {
        const { generateProblem } = await import('../js/math/problems.js');
        return Array.from({ length: 200 }, () => {
            const problem = generateProblem('compareSets5');
            return {
                left: problem.a,
                right: problem.b,
                word: problem.comparisonWord,
                answer: problem.answer
            };
        });
    });

    for (const { left, right, word, answer } of problems) {
        const expected = left === right
            ? 0
            : word === 'more'
                ? (left > right ? 1 : 2)
                : (left < right ? 1 : 2);
        expect(answer).toBe(expected);
        expect(left).toBeGreaterThanOrEqual(1);
        expect(left).toBeLessThanOrEqual(5);
        expect(right).toBeGreaterThanOrEqual(1);
        expect(right).toBeLessThanOrEqual(5);
    }
});
