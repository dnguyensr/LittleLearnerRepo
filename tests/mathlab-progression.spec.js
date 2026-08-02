const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings } = require('./helpers');

const PROGRESS_KEY = 'lls-mathlab-progress';

// Mirrors SPINE in js/math/ladder.js. Deliberately duplicated: if the spine is
// reordered, these specs should fail loudly rather than quietly follow along.
const SPINE = [
    'count5', 'count10', 'addWithin5', 'addWithin10', 'subWithin5', 'subWithin10',
    'makeTen', 'addWithin20', 'subWithin20', 'missingAddend', 'addTens',
    'addWithin100', 'subWithin100', 'addRegroup', 'subRegroup'
];
const STREAK_TO_ADVANCE = 4;

async function seedProgress(page, progress) {
    await page.addInitScript(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [PROGRESS_KEY, progress]);
}

async function openLab(page, settings = {}) {
    await seedSettings(page, { betaModes: true, mathLabLevel: 'auto', mathMethod: 'classical', ...settings });
    await gotoApp(page);
    await page.locator('#mathlab-btn').click();
    await expect(page.locator('#mathlab-container')).toHaveClass(/active/);
}

async function type(page, text) {
    for (const ch of String(text)) await page.keyboard.press(ch);
}

const skillOf = page => page.locator('#mathlab-workspace').getAttribute('data-skill');

// Counting rungs are answerable without knowing which method drew them.
async function solveCount(page, expectedScore) {
    const workspace = page.locator('#mathlab-workspace');
    const variant = await workspace.getAttribute('data-variant');
    const skill = await workspace.getAttribute('data-skill');

    // numeralbuild is answered by building the quantity and tapping ✓, not by
    // typing — see tests/mathlab-singapore.spec.js.
    if (variant === 'numeralbuild') {
        const target = Number(await page.locator('.numeral-card').textContent());
        const cells = page.locator('.tf-cell');
        for (let i = 0; i < target; i++) {
            await cells.nth(i).dispatchEvent('pointerdown', { pointerId: 1 });
        }
        await page.locator('.lab-check').dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#word-count')).toHaveText(String(expectedScore));
        await expect(page.locator('#mathlab-answer-display')).toHaveText('?', { timeout: 6000 });
        return;
    }

    let answer;
    if (skill === 'countBack') {
        // "What comes just before n?" shows the numeral n; the answer is n − 1
        answer = Number(await page.locator('.numeral-card').textContent()) - 1;
    }
    else if (variant === 'subitize') answer = await page.locator('.tf-cell.filled').count();
    else if (variant === 'pictorial') answer = await page.locator('.dot').count();
    else answer = await page.locator('#mathlab-workspace .math-emoji').count();

    await type(page, answer);
    await page.keyboard.press('Enter');
    await expect(page.locator('#word-count')).toHaveText(String(expectedScore));
    await expect(page.locator('#mathlab-answer-display')).toHaveText('?', { timeout: 6000 });
}

test.describe('Math Lab — the shared spine', () => {
    test('a fresh child starts at the bottom of the spine', async ({ page }) => {
        await openLab(page);
        expect(await skillOf(page)).toBe(SPINE[0]);
    });

    test('a stored spine position is where play resumes', async ({ page }) => {
        await seedProgress(page, { spine: 6, streak: 0, done: {} });
        await openLab(page);
        expect(await skillOf(page)).toBe('makeTen');
    });

    test('the spine position is shared across curriculums', async ({ page }) => {
        await seedProgress(page, { spine: 11, streak: 0, done: {} });

        for (const method of ['classical', 'commoncore', 'singapore']) {
            await openLab(page, { mathMethod: method });
            expect(await skillOf(page)).toBe('addWithin100');
            await page.locator('#free-btn').click();
        }
    });

    test('progress survives leaving the mode and coming back', async ({ page }) => {
        // spine 5 with no classical detour pending, so the rung is unambiguous
        await seedProgress(page, { spine: 5, streak: 2, done: {} });
        await openLab(page);
        expect(await skillOf(page)).toBe('subWithin10');

        await page.locator('#free-btn').click();
        await expect(page.locator('#mathlab-container')).not.toHaveClass(/active/);
        await page.locator('#mathlab-btn').click();

        expect(await skillOf(page)).toBe('subWithin10');
    });

    test('progress survives a reload', async ({ page }) => {
        await seedProgress(page, { spine: 3, streak: 0, done: {} });
        await openLab(page);
        expect(await skillOf(page)).toBe('addWithin10');

        await page.reload();
        await page.locator('#play-area').click();
        await page.locator('#mathlab-btn').click();
        expect(await skillOf(page)).toBe('addWithin10');
    });
});

test.describe('Math Lab — per-curriculum detours', () => {
    test('each curriculum inserts its own rung after counting to ten', async ({ page }) => {
        // classical -> countBack, commoncore -> (its detour is after count5),
        // singapore -> numeralMatch
        await seedProgress(page, { spine: 2, streak: 0, done: {} });

        await openLab(page, { mathMethod: 'classical' });
        expect(await skillOf(page)).toBe('countBack');
        await page.locator('#free-btn').click();

        await openLab(page, { mathMethod: 'singapore' });
        expect(await skillOf(page)).toBe('numeralMatch');
    });

    test('a detour already done is not offered again', async ({ page }) => {
        await seedProgress(page, { spine: 2, streak: 0, done: { classical: ['countBack'] } });
        await openLab(page, { mathMethod: 'classical' });
        expect(await skillOf(page)).toBe(SPINE[2]);
    });

    test('detours behind the spine position are skipped, not back-tracked', async ({ page }) => {
        // Arriving at spine 12 on a method never used before must not drag the
        // child back through that method's early detours.
        await seedProgress(page, { spine: 12, streak: 0, done: {} });
        await openLab(page, { mathMethod: 'commoncore' });
        expect(await skillOf(page)).toBe('subWithin100');
    });

    test('a detour comes due the moment its spine rung is mastered', async ({ page }) => {
        // Common Core's subitize sits after count5 (spine 0), so it is due at
        // exactly spine 1 — the off-by-one that made detours unreachable.
        await seedProgress(page, { spine: 1, streak: 0, done: {} });
        await openLab(page, { mathMethod: 'commoncore' });
        expect(await skillOf(page)).toBe('subitize');
    });

    test('a detour is only offered to the curriculum that owns it', async ({ page }) => {
        await seedProgress(page, { spine: 1, streak: 0, done: {} });

        // subitize sits after count5 on the Common Core ladder only
        await openLab(page, { mathMethod: 'commoncore' });
        expect(await skillOf(page)).toBe('subitize');
        await page.locator('#free-btn').click();

        await openLab(page, { mathMethod: 'classical' });
        expect(await skillOf(page)).toBe('count10');
    });
});

test.describe('Math Lab — streak advancement', () => {
    test('four correct in a row advance a rung, announced to the child', async ({ page }) => {
        await seedProgress(page, { spine: 0, streak: STREAK_TO_ADVANCE - 1, done: {} });
        await openLab(page);
        expect(await skillOf(page)).toBe('count5');

        await solveCount(page, 1);
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'count10');
    });

    test('the announcement names the new rung', async ({ page }) => {
        await seedProgress(page, { spine: 0, streak: STREAK_TO_ADVANCE - 1, done: {} });
        await openLab(page);

        const answer = await page.locator('#mathlab-workspace .math-emoji').count();
        await type(page, answer);
        await page.keyboard.press('Enter');
        await expect(page.locator('#mathlab-prompt')).toHaveText('New: Counting to 10 🎉');
    });

    test('a wrong answer resets the streak but never drops a rung', async ({ page }) => {
        await seedProgress(page, { spine: 3, streak: STREAK_TO_ADVANCE - 1, done: {} });
        await openLab(page);
        expect(await skillOf(page)).toBe('addWithin10');

        await page.keyboard.press('0');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Same rung, and the streak is back to zero
        expect(await skillOf(page)).toBe('addWithin10');
        const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
        expect(stored.spine).toBe(3);
        expect(stored.streak).toBe(0);
    });

    test('guessing cannot climb: three right then one wrong stays put', async ({ page }) => {
        await openLab(page);
        for (let i = 1; i <= 3; i++) await solveCount(page, i);
        expect(await skillOf(page)).toBe('count5');

        await page.keyboard.press('0');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        await solveCount(page, 4);
        // The wrong answer wiped the streak, so this is only #1 of the next four
        expect(await skillOf(page)).toBe('count5');
    });

    test('the top of the ladder is a ceiling, not a crash', async ({ page }) => {
        await seedProgress(page, {
            spine: SPINE.length - 1,
            streak: STREAK_TO_ADVANCE - 1,
            done: {}
        });
        await openLab(page);
        expect(await skillOf(page)).toBe('subRegroup');

        const { a, b } = await page.evaluate(() => {
            const digits = [...document.querySelectorAll('.column-sum .c-digit:not(.c-slot)')]
                .map(el => Number(el.textContent));
            return { a: digits[0] * 10 + digits[1], b: digits[2] * 10 + digits[3] };
        });
        const answer = a - b;

        await type(page, answer % 10);
        await page.keyboard.press('Enter');
        await expect(page.locator('.c-slot[data-slot="ones"]')).toHaveClass(/done/);
        await type(page, Math.floor(answer / 10));
        await page.keyboard.press('Enter');

        await expect(page.locator('#word-count')).toHaveText('1');
        await expect(page.locator('#mathlab-workspace'))
            .toHaveAttribute('data-skill', 'subRegroup', { timeout: 8000 });
    });
});

test.describe('Math Lab — pinned stages', () => {
    test('a pinned stage draws from that stage and never advances progress', async ({ page }) => {
        await seedProgress(page, { spine: 9, streak: 3, done: {} });
        await openLab(page, { mathLabLevel: 'counting' });
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-stage', 'counting');

        await solveCount(page, 1);
        await expect(page.locator('#mathlab-prompt')).toHaveText('');

        const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
        expect(stored).toEqual({ spine: 9, streak: 3, done: {} });
    });

    test('every stage in the dropdown produces a problem', async ({ page }) => {
        for (const stage of ['counting', 'adding10', 'subtracting10', 'teens', 'twodigit']) {
            await openLab(page, { mathLabLevel: stage });
            await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-stage', stage);
            await expect(page.locator('#mathlab-question')).not.toBeEmpty();
            await page.locator('#free-btn').click();
        }
    });
});

test.describe('Math Lab — stored progress is defended', () => {
    test('a corrupt entry falls back to the bottom of the spine', async ({ page }) => {
        await page.addInitScript(key => localStorage.setItem(key, 'not json'), PROGRESS_KEY);
        await openLab(page);
        expect(await skillOf(page)).toBe(SPINE[0]);
    });

    test('an out-of-range spine index is clamped', async ({ page }) => {
        await seedProgress(page, { spine: 999, streak: -5, done: {} });
        await openLab(page);
        expect(await skillOf(page)).toBe(SPINE[SPINE.length - 1]);
    });

    test('unknown detour ids in storage are dropped', async ({ page }) => {
        await seedProgress(page, { spine: 2, streak: 0, done: { classical: ['nonsense'] } });
        await openLab(page, { mathMethod: 'classical' });
        expect(await skillOf(page)).toBe('countBack');
    });

    test('progress from the old four-level ladder is carried over, not reset', async ({ page }) => {
        await seedProgress(page, { level: 4, streak: 2 });
        await openLab(page);
        // Old level 4 was two-digit work, so the child lands there, not at counting
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-stage', 'twodigit');
    });

    test('an old numeric mathLabLevel setting maps onto a stage', async ({ page }) => {
        await seedSettings(page, { betaModes: true, mathMethod: 'classical', mathLabLevel: '3' });
        await gotoApp(page);
        await page.locator('#mathlab-btn').click();
        await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-stage', 'subtracting10');
    });
});

test.describe('Math Lab — parent progress controls', () => {
    const { openSettings } = require('./helpers');

    test('the panel names the current rung', async ({ page }) => {
        await seedProgress(page, { spine: 6, streak: 0, done: {} });
        await openLab(page);
        await openSettings(page);
        await expect(page.locator('#mathlab-progress-label'))
            .toHaveText('Making a ten (step 7 of 15)');
    });

    test('one tap arms the reset, closing the panel disarms it', async ({ page }) => {
        await seedProgress(page, { spine: 6, streak: 0, done: {} });
        await openLab(page);
        await openSettings(page);

        const resetBtn = page.locator('#mathlab-progress-reset');
        await resetBtn.click();
        await expect(resetBtn).toHaveText('Tap again to erase');

        await page.locator('#settings-close').click();
        await openSettings(page);
        await expect(resetBtn).toHaveText('Start over');

        // Progress untouched by the armed-but-abandoned tap
        const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
        expect(stored.spine).toBe(6);
    });

    test('two taps erase progress and the live session re-deals from the bottom', async ({ page }) => {
        await seedProgress(page, { spine: 6, streak: 3, done: {} });
        await openLab(page);
        expect(await skillOf(page)).toBe('makeTen');
        await openSettings(page);

        const resetBtn = page.locator('#mathlab-progress-reset');
        await resetBtn.click();
        await resetBtn.click();

        await expect(page.locator('#mathlab-progress-label'))
            .toHaveText('Counting to 5 (step 1 of 15)');
        expect(await page.evaluate(key => localStorage.getItem(key), PROGRESS_KEY)).toBeNull();

        await page.locator('#settings-close').click();
        expect(await skillOf(page)).toBe('count5');
    });
});

test.describe('Math Lab — mix rotation', () => {
    test('mix cycles through all three methods, one per problem', async ({ page }) => {
        await openLab(page, { mathMethod: 'mix', mathLabLevel: 'count10' });
        const workspace = page.locator('#mathlab-workspace');

        const seen = [];
        for (let i = 1; i <= 3; i++) {
            seen.push(await workspace.getAttribute('data-method'));
            await solveCount(page, i);
        }

        expect(seen.sort()).toEqual(['classical', 'commoncore', 'singapore']);
    });

    test('a stale variant does not survive a switch to classical', async ({ page }) => {
        await openLab(page, { mathMethod: 'mix', mathLabLevel: 'count10' });
        const workspace = page.locator('#mathlab-workspace');

        for (let i = 1; i <= 4; i++) {
            if (await workspace.getAttribute('data-method') === 'classical') break;
            await solveCount(page, i);
        }

        await expect(workspace).toHaveAttribute('data-method', 'classical');
        expect(await workspace.getAttribute('data-variant')).toBeNull();
    });

    test('every method option is selectable', async ({ page }) => {
        await seedSettings(page, { betaModes: true });
        await gotoApp(page);
        await page.locator('#settings-btn').dispatchEvent('pointerdown', { pointerId: 1 });
        await expect(page.locator('#settings-panel')).toBeVisible();

        for (const value of ['classical', 'commoncore', 'singapore', 'mix']) {
            await expect(page.locator(`#set-math-method option[value="${value}"]`))
                .toHaveJSProperty('disabled', false);
        }
    });
});
