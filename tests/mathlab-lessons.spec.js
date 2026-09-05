const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { gotoApp, seedSettings } = require('./helpers');

const PROGRESS_KEY = 'edamame-mathlab-progress';
const FOUNDATION = [
    'count5', 'subitize', 'count10', 'numeralMatch',
    'compareSets5', 'addWithin5', 'countOn', 'addWithin10'
];

function forkReady() {
    return {
        version: 2,
        selectedPath: null,
        currentSkill: 'addWithin10',
        skills: Object.fromEntries(FOUNDATION.map(skill => [skill, {
            recentIndependent: [true, true, true, true, true, true],
            mastered: true
        }])),
        lessons: {
            subtractionIntro: { status: 'unseen', scene: 0 },
            placeValueAdditionIntro: { status: 'unseen', scene: 0 }
        }
    };
}

function readyForFirstAddition() {
    return {
        version: 2,
        selectedPath: null,
        currentSkill: 'addWithin5',
        skills: Object.fromEntries(FOUNDATION.slice(0, 5).map(skill => [skill, {
            recentIndependent: [true, true, true, true, true, true],
            mastered: true
        }])),
        lessons: {
            comparisonIntro: { status: 'complete', scene: 0 },
            additionIntro: { status: 'unseen', scene: 0 },
            subtractionIntro: { status: 'unseen', scene: 0 },
            placeValueAdditionIntro: { status: 'unseen', scene: 0 }
        }
    };
}

async function openFirstAddition(page) {
    await page.addInitScript(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [PROGRESS_KEY, readyForFirstAddition()]);
    await seedSettings(page, {
        mathLabLevel: 'auto', mathMethod: 'singapore', speech: false
    });
    await gotoApp(page);
    await page.locator('#mathlab-btn').click();
}

async function openChooser(page) {
    await page.addInitScript(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [PROGRESS_KEY, forkReady()]);
    await seedSettings(page, {
        mathLabLevel: 'auto', mathMethod: 'singapore', speech: false
    });
    await gotoApp(page);
    await page.locator('#mathlab-btn').click();
}

async function expectInsidePlayArea(page, locator) {
    const [box, play] = await Promise.all([
        locator.boundingBox(),
        page.locator('#play-area').boundingBox()
    ]);
    expect(box).not.toBeNull();
    expect(play).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(play.x - 1);
    expect(box.y).toBeGreaterThanOrEqual(play.y - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(play.x + play.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(play.y + play.height + 1);
}

test('subtraction lesson completes all three scenes without scoring', async ({ page }) => {
    await openChooser(page);
    await page.locator('[data-path="subtraction"]').click();
    await page.locator('.lesson-next').click();

    const eater = page.locator('[data-lesson-eater]');
    await eater.dispatchEvent('pointerdown', { pointerId: 1 });
    await eater.dispatchEvent('pointerdown', { pointerId: 1 });
    await page.locator('.lesson-next').click();

    await page.locator('[data-lesson-eater]').dispatchEvent('pointerdown', { pointerId: 1 });
    await expect(page.locator('.lesson-talk')).toBeVisible();
    await page.locator('.lesson-choice[data-correct="true"]').click();
    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'subWithin5');
    await expect(page.locator('#word-count')).toHaveText('0');

    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
    expect(stored.lessons.subtractionIntro).toEqual({ status: 'complete', scene: 0 });
});

test('first addition is modeled and guided before independent practice', async ({ page }) => {
    await openFirstAddition(page);
    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-lesson', 'additionIntro');
    await expect(page.locator('#mathlab-prompt')).toHaveText('Step 1 of 3');

    await page.locator('.lesson-next').click();
    await page.locator('.lesson-add-one').click();
    await expect(page.locator('.lesson-equation')).toHaveText('2 + 1 = 3');
    await page.locator('.lesson-next').click();
    await page.locator('.lesson-talk').click();
    await expect(page.locator('.lesson-talk-prompt')).toBeVisible();
    await expect(page.locator('#mathlab-prompt')).toHaveText('Step 3 of 3');
    await page.locator('.lesson-choice[data-correct="true"]').click();

    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'addWithin5');
    await expect(page.locator('#word-count')).toHaveText('0');
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
    expect(stored.lessons.additionIntro).toEqual({ status: 'complete', scene: 0 });
});

test('first-addition lesson scenes fit and pass serious accessibility checks', async ({ page }) => {
    await openFirstAddition(page);

    await expectInsidePlayArea(page, page.locator('.lesson-scene'));
    let results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact))).toEqual([]);

    await page.locator('.lesson-next').click();
    await expectInsidePlayArea(page, page.locator('.lesson-scene'));
    results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact))).toEqual([]);

    await page.locator('.lesson-add-one').click();
    await page.locator('.lesson-next').click();
    await page.locator('.lesson-talk').click();
    await expect(page.locator('.lesson-talk-prompt')).toBeVisible();
    await expectInsidePlayArea(page, page.locator('.lesson-scene'));
    results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact))).toEqual([]);
});

test('place-value lesson completes all three scenes without scoring', async ({ page }) => {
    await openChooser(page);
    await page.locator('[data-path="bigAddition"]').click();
    await page.locator('.lesson-next').click();
    await page.locator('.lesson-combine').click();
    await page.locator('.lesson-next').click();
    await expect(page.locator('.lesson-talk')).toBeVisible();
    await page.locator('.lesson-choice[data-correct="true"]').click();

    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'tensAndOnes');
    await expect(page.locator('#word-count')).toHaveText('0');
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
    expect(stored.lessons.placeValueAdditionIntro).toEqual({ status: 'complete', scene: 0 });
});

test('path chooser and lesson scenes fit and pass serious accessibility checks', async ({ page }) => {
    await openChooser(page);
    await expectInsidePlayArea(page, page.locator('.math-path-chooser'));

    let results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
    expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact))).toEqual([]);

    await page.locator('[data-path="subtraction"]').click();
    await expectInsidePlayArea(page, page.locator('.lesson-scene'));
    results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
    expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact))).toEqual([]);
});
