const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { gotoApp, seedSettings } = require('./helpers');

const PROGRESS_KEY = 'edamame-mathlab-progress';
const PRIOR_SKILLS = ['count5', 'subitize', 'count10', 'numeralMatch'];

function mastered() {
    return { recentIndependent: [true, true, true, true, true, true], mastered: true };
}

function comparisonReady({ recent = [], lesson = 'complete' } = {}) {
    return {
        version: 2,
        selectedPath: null,
        currentSkill: 'compareSets5',
        skills: {
            ...Object.fromEntries(PRIOR_SKILLS.map(skill => [skill, mastered()])),
            compareSets5: { recentIndependent: recent, mastered: false }
        },
        lessons: {
            comparisonIntro: { status: lesson, scene: 0 },
            additionIntro: { status: 'unseen', scene: 0 },
            subtractionIntro: { status: 'unseen', scene: 0 },
            placeValueAdditionIntro: { status: 'unseen', scene: 0 }
        }
    };
}

async function seedProgress(page, progress) {
    await page.addInitScript(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [PROGRESS_KEY, progress]);
}

async function openComparison(page, progress = comparisonReady()) {
    await seedProgress(page, progress);
    await seedSettings(page, {
        mathLabLevel: 'auto', mathMethod: 'singapore', speech: false
    });
    await gotoApp(page);
    await page.locator('#mathlab-btn').click();
}

async function comparisonValues(page) {
    const counts = await page.locator('.comparison-group').evaluateAll(groups => (
        groups.map(group => group.querySelectorAll('.comparison-slot.filled').length)
    ));
    const word = await page.locator('#mathlab-question').textContent();
    const [left, right] = counts;
    const answer = left === right
        ? 0
        : /more/i.test(word)
            ? (left > right ? 1 : 2)
            : (left < right ? 1 : 2);
    return { left, right, answer };
}

async function selectAndCheck(page, value) {
    const choice = page.locator(`[data-compare-value="${value}"]`);
    await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.lab-check').click();
}

test('comparison is modeled, guided, and checked before scored practice', async ({ page }) => {
    await openComparison(page, comparisonReady({ lesson: 'unseen' }));
    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-lesson', 'comparisonIntro');
    await expect(page.locator('#mathlab-question')).toContainText('more than two');

    await page.locator('.lesson-next').click();
    await page.locator('[data-lesson-compare][data-compare-value="1"]').click();
    await expect(page.locator('#mathlab-prompt')).toHaveText('Step 2 of 3');
    await page.locator('[data-lesson-compare][data-compare-value="2"]').click();
    await expect(page.locator('#mathlab-prompt')).toHaveText('Step 3 of 3');
    await page.locator('.lesson-talk').click();
    await expect(page.locator('.lesson-talk-prompt')).toBeVisible();
    await expect(page.locator('#mathlab-prompt')).toHaveText('Step 3 of 3');
    await page.locator('[data-lesson-compare][data-compare-value="0"]').click();

    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'compareSets5');
    await expect(page.locator('#word-count')).toHaveText('0');
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
    expect(stored.lessons.comparisonIntro).toEqual({ status: 'complete', scene: 0 });
});

test('the child chooses a group or same without typing an internal answer code', async ({ page }) => {
    await openComparison(page);
    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-method', 'comparison');
    await expect(page.locator('#mathlab-answer-display')).toBeHidden();

    const { answer } = await comparisonValues(page);
    await selectAndCheck(page, answer);
    await expect(page.locator('#word-count')).toHaveText('1');
});

test('focused comparison controls work with the keyboard', async ({ page }) => {
    await openComparison(page);
    const { answer } = await comparisonValues(page);
    const choice = page.locator(`[data-compare-value="${answer}"]`);

    // Tab enters keyboard-navigation routing; focus() keeps the test independent
    // of how many unrelated controls precede Math in the document.
    await page.keyboard.press('Tab');
    await choice.focus();
    await page.keyboard.press('Enter');
    await expect(choice).toHaveAttribute('aria-pressed', 'true');

    await page.locator('.lab-check').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#word-count')).toHaveText('1');
});

test('five of six independent comparisons record recent readiness', async ({ page }) => {
    await openComparison(page, comparisonReady({ recent: [true, true, true, true, false] }));
    const { answer } = await comparisonValues(page);
    await selectAndCheck(page, answer);

    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-lesson', 'additionIntro', {
        timeout: 7000
    });
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
    expect(stored.skills.compareSets5.mastered).toBe(true);
    expect(stored.skills.compareSets5.confirmed).toBe(false);
    expect(stored.skills.compareSets5.readyAt).toBeGreaterThan(0);
});

test('comparison practice fits and has no serious accessibility violations', async ({ page }) => {
    await openComparison(page);
    const [workspace, play] = await Promise.all([
        page.locator('.comparison-board').boundingBox(),
        page.locator('#play-area').boundingBox()
    ]);
    expect(workspace).not.toBeNull();
    expect(play).not.toBeNull();
    expect(workspace.x).toBeGreaterThanOrEqual(play.x - 1);
    expect(workspace.y).toBeGreaterThanOrEqual(play.y - 1);
    expect(workspace.x + workspace.width).toBeLessThanOrEqual(play.x + play.width + 1);
    expect(workspace.y + workspace.height).toBeLessThanOrEqual(play.y + play.height + 1);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact))).toEqual([]);
});
