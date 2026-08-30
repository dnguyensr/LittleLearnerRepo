const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings, openSettings } = require('./helpers');

const PROGRESS_KEY = 'lls-mathlab-progress';
const FOUNDATION = [
    'count5', 'subitize', 'count10', 'numeralMatch',
    'addWithin5', 'countOn', 'addWithin10'
];

function mastered() {
    return { recentIndependent: [true, true, true, true, true, true], mastered: true };
}

function v2(overrides = {}) {
    return {
        version: 2,
        selectedPath: null,
        currentSkill: 'count5',
        skills: {},
        lessons: {
            subtractionIntro: { status: 'unseen', scene: 0 },
            placeValueAdditionIntro: { status: 'unseen', scene: 0 }
        },
        ...overrides
    };
}

function forkReady(overrides = {}) {
    return v2({
        skills: Object.fromEntries(FOUNDATION.map(skill => [skill, mastered()])),
        currentSkill: 'addWithin10',
        ...overrides
    });
}

async function seedProgress(page, progress) {
    await page.addInitScript(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [PROGRESS_KEY, progress]);
}

async function openLab(page, settings = {}) {
    await seedSettings(page, { mathLabLevel: 'auto', mathMethod: 'classical', ...settings });
    await gotoApp(page);
    await page.locator('#mathlab-btn').click();
}

async function type(page, text) {
    for (const ch of String(text)) await page.keyboard.press(ch);
}

async function solveClassicalCount(page) {
    const answer = await page.locator('#mathlab-workspace .math-emoji').count();
    await type(page, answer);
    await page.keyboard.press('Enter');
}

test.describe('Math readiness graph', () => {
    test('a fresh learner starts at counting to five', async ({ page }) => {
        await openLab(page);
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'count5');
    });

    test('five independent results in the latest six master a skill', async ({ page }) => {
        await seedProgress(page, v2({
            skills: { count5: { recentIndependent: [true, true, true, true, false], mastered: false } }
        }));
        await openLab(page);
        await solveClassicalCount(page);
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'subitize', { timeout: 6000 });

        const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
        expect(stored.skills.count5.mastered).toBe(true);
    });

    test('a corrected answer is assisted and does not complete mastery', async ({ page }) => {
        await seedProgress(page, v2({
            skills: { count5: { recentIndependent: [true, true, true, true, false], mastered: false } }
        }));
        await openLab(page);
        await page.keyboard.press('0');
        await page.waitForTimeout(900);
        await solveClassicalCount(page);
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'count5', { timeout: 6000 });

        const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
        expect(stored.skills.count5.mastered).toBe(false);
        expect(stored.skills.count5.recentIndependent).toEqual([true, true, true, true, false, false]);
    });

    test('leaving an unfinished problem records no failure', async ({ page }) => {
        await openLab(page);
        await page.locator('#free-btn').click();
        expect(await page.evaluate(key => localStorage.getItem(key), PROGRESS_KEY)).toBeNull();
    });
});

test.describe('Child-facing math paths', () => {
    test('the path chooser is unavailable before addition mastery', async ({ page }) => {
        await openLab(page);
        await expect(page.locator('#mathlab-paths-btn')).toBeHidden();
        await expect(page.locator('.math-path-card')).toHaveCount(0);
    });

    test('addition mastery opens all three spoken picture choices', async ({ page }) => {
        const skills = Object.fromEntries(FOUNDATION.slice(0, -1).map(skill => [skill, mastered()]));
        skills.addWithin10 = { recentIndependent: [true, true, true, true, false], mastered: false };
        await seedProgress(page, v2({ currentSkill: 'addWithin10', skills }));
        await openLab(page);

        const nums = await page.locator('.vertical-sum .v-num').allTextContents();
        await type(page, Number(nums[0]) + Number(nums[1]));
        await expect(page.locator('.math-path-card')).toHaveCount(3, { timeout: 7000 });
        await expect(page.locator('.math-path-card')).toContainText([
            'Keep Adding', 'Learn Take Away', 'Big Addition'
        ]);
    });

    test('Keep Adding never deals a subtraction problem', async ({ page }) => {
        await seedProgress(page, forkReady());
        await openLab(page);
        await page.locator('[data-path="additionPractice"]').click();
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-stage', 'adding10');
        await expect(page.locator('#mathlab-question')).not.toContainText('−');
    });

    test('Big Addition starts with place value and never deals subtraction', async ({ page }) => {
        await seedProgress(page, forkReady());
        await openLab(page, { guidedLessonsBeta: false });
        await page.locator('[data-path="bigAddition"]').click();
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'tensAndOnes');
        await expect(page.locator('#mathlab-question')).not.toContainText('−');
    });

    test('the Paths button switches routes without clearing mastery', async ({ page }) => {
        await seedProgress(page, forkReady());
        await openLab(page);
        await page.locator('[data-path="additionPractice"]').click();
        await page.locator('#mathlab-paths-btn').dispatchEvent('pointerdown', { pointerId: 1 });
        await page.locator('[data-path="subtraction"]').click();
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'subWithin5');

        const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
        expect(stored.selectedPath).toBe('subtraction');
        expect(stored.skills.addWithin10.mastered).toBe(true);
    });
});

test.describe('Guided Learn beta', () => {
    test('subtraction path starts the inline lesson when beta is enabled', async ({ page }) => {
        await seedProgress(page, forkReady());
        await openLab(page, { guidedLessonsBeta: true });
        await page.locator('[data-path="subtraction"]').click();
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-lesson', 'subtractionIntro');
        await expect(page.locator('#mathlab-prompt')).toHaveText('Step 1 of 3');
        await expect(page.locator('#word-count')).toHaveText('0');
    });

    test('a lesson resumes its saved scene after a mode switch', async ({ page }) => {
        await seedProgress(page, forkReady());
        await openLab(page, { guidedLessonsBeta: true });
        await page.locator('[data-path="subtraction"]').click();
        await page.locator('.lesson-next').click();
        await expect(page.locator('#mathlab-prompt')).toHaveText('Step 2 of 3');

        await page.locator('#free-btn').click();
        await page.locator('#mathlab-btn').click();
        await expect(page.locator('#mathlab-prompt')).toHaveText('Step 2 of 3');
    });

    test('beta off goes directly to practice', async ({ page }) => {
        await seedProgress(page, forkReady());
        await openLab(page, { guidedLessonsBeta: false });
        await page.locator('[data-path="subtraction"]').click();
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'subWithin5');
        await expect(page.locator('#mathlab-workspace')).not.toHaveAttribute('data-lesson');
    });

    test('two misses offer Learn Together on a supported concept', async ({ page }) => {
        await seedProgress(page, forkReady({ selectedPath: 'subtraction', currentSkill: 'subWithin5' }));
        await openLab(page, { guidedLessonsBeta: true });
        await page.keyboard.press('0');
        await page.waitForTimeout(900);
        await page.keyboard.press('0');
        await expect(page.locator('.learn-together-btn')).toBeVisible();
    });
});

test.describe('Progress compatibility and controls', () => {
    test('legacy spine progress migrates to version 2 at the same skill', async ({ page }) => {
        await seedProgress(page, { spine: 4, streak: 2, done: {} });
        await openLab(page);
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'subWithin5');
        const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
        await expect(page.locator('#mathlab-paths-btn')).toBeVisible();
        expect(stored.version).toBe(2);
    });

    test('corrupt progress falls back safely', async ({ page }) => {
        await page.addInitScript(key => localStorage.setItem(key, 'not json'), PROGRESS_KEY);
        await openLab(page);
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'count5');
    });

    test('Start over clears skills, paths, and lesson state', async ({ page }) => {
        await seedProgress(page, forkReady({
            selectedPath: 'subtraction',
            currentSkill: 'subWithin5',
            lessons: {
                subtractionIntro: { status: 'complete', scene: 0 },
                placeValueAdditionIntro: { status: 'unseen', scene: 0 }
            }
        }));
        await openLab(page);
        await openSettings(page);
        const reset = page.locator('#mathlab-progress-reset');
        await reset.click();
        await reset.click();
        await page.locator('#settings-close').click();
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'count5');
        expect(await page.evaluate(key => localStorage.getItem(key), PROGRESS_KEY)).toBeNull();
    });
});
