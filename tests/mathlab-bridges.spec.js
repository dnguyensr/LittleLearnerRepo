const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { gotoApp, seedSettings, stubSpeech, speechLog } = require('./helpers');

const KEY = 'edamame-mathlab-progress';
const foundation = [
    'count5',
    'subitize',
    'count10',
    'numeralMatch',
    'compareSets5',
    'decompose5',
    'addWithin5',
    'countOn',
    'addWithin10'
];
const ready = () => ({
    recentIndependent: Array(6).fill(true),
    mastered: true,
    confirmed: true,
    readyAt: 1
});

function atSkill(skill, overrides = {}) {
    return {
        version: 3,
        curriculumBypass: [],
        selectedPath: null,
        currentSkill: skill,
        skills: Object.fromEntries(
            foundation.slice(0, foundation.indexOf(skill)).map(id => [id, ready()])
        ),
        lessons: {},
        ...overrides
    };
}

async function open(page, progress, settings = {}) {
    await seedSettings(page, { mathLabLevel: 'auto', speech: false, ...settings });
    if (progress)
        await page.addInitScript(
            ([key, value]) => localStorage.setItem(key, JSON.stringify(value)),
            [KEY, progress]
        );
    await gotoApp(page);
    await page.locator('#mathlab-btn').click();
}

async function choose(page, value, lesson = false) {
    await page.locator(`.bridge-choice[data-choice="${value}"]`).click();
    await page.locator(lesson ? '.bridge-lesson-check' : '.lab-check').click();
}

async function displayedAnswer(page) {
    const equation = await page.locator('.bridge-equation').innerText();
    const [left, right] = equation.split(' = ');
    const parts = left.split(' + ');
    return right === '?'
        ? Number(parts[0]) + Number(parts[1])
        : Number(right) - Number(parts.find(part => part !== '?'));
}

test('bridge domains exhaust small wholes, zero parts, both unknown positions and sums through ten', async ({
    page
}) => {
    await gotoApp(page);
    const domains = await page.evaluate(async () => {
        const { bridgeVariants, bridgeProblem } = await import('../js/math/bridge-problems.js');
        return ['decompose5', 'countOn'].map(skill =>
            bridgeVariants(skill).map(variant => bridgeProblem(skill, variant))
        );
    });
    expect(domains[0]).toHaveLength(36);
    for (let whole = 2; whole <= 5; whole++) {
        for (let known = 0; known <= whole; known++) {
            for (const unknown of ['left', 'right']) {
                const problem = domains[0].find(
                    p => p.total === whole && p.a === known && p.unknownPart === unknown
                );
                expect(problem.answer).toBe(whole - known);
                expect(problem.equation).toBe(
                    unknown === 'left' ? `? + ${known} = ${whole}` : `${known} + ? = ${whole}`
                );
            }
        }
    }
    expect(domains[1]).toHaveLength(90);
    for (const problem of domains[1]) {
        expect(problem.task).toBe('countOnFrom');
        expect(problem.answer).toBe(problem.a + problem.b);
        expect(problem.answer).toBeLessThanOrEqual(10);
        expect(problem.a).toBeGreaterThan(0);
        expect(problem.b).toBeGreaterThan(0);
    }
    expect(domains[1].filter(p => p.answer === 10)).toHaveLength(18);
});

test('confirmation changes quantities and a taught response direction or representation for every baseline', async ({
    page
}) => {
    await gotoApp(page);
    const checks = await page.evaluate(async () => {
        const { bridgeVariants, confirmationProblem } =
            await import('../js/math/bridge-problems.js');
        return ['decompose5', 'countOn'].flatMap(skill =>
            bridgeVariants(skill).map(baseline => ({
                baseline,
                varied: confirmationProblem(skill, baseline, ['trays', 'objects', 'numberLine']),
                untaught: confirmationProblem(skill, baseline, []),
                corrupt: confirmationProblem(skill, { a: -1 }, ['trays'])
            }))
        );
    });
    for (const { baseline, varied, untaught, corrupt } of checks) {
        expect(varied).not.toBeNull();
        expect(
            varied.a !== baseline.a || varied.b !== baseline.b || varied.total !== baseline.total
        ).toBe(true);
        expect(
            varied.unknownPart !== baseline.unknownPart ||
                varied.representation !== baseline.representation
        ).toBe(true);
        expect(untaught).toBeNull();
        expect(corrupt).toBeNull();
    }
});

test('version three migration preserves routes without inventing decomposition evidence', async ({
    page
}) => {
    await gotoApp(page);
    const result = await page.evaluate(async () => {
        const { normalizeProgress, currentSkillForProgress, emptyProgress } =
            await import('../js/math/ladder.js');
        const skills = Object.fromEntries(
            ['count5', 'subitize', 'count10', 'numeralMatch', 'compareSets5', 'addWithin5'].map(
                id => [id, { mastered: true }]
            )
        );
        const raw = {
            version: 2,
            currentSkill: 'countOn',
            skills,
            lessons: { additionIntro: { status: 'inProgress', scene: 1 } }
        };
        const migrated = normalizeProgress(raw);
        const corrupt = normalizeProgress({
            version: 3,
            curriculumBypass: ['toString', null],
            skills: {
                countOn: {
                    mastered: true,
                    readinessItem: { a: -1 },
                    taughtRepresentations: ['bad'],
                    lastConfirmationAt: 'bad'
                }
            },
            lessons: { countOnIntro: { status: 'inProgress', scene: Infinity } }
        });
        return {
            migrated,
            again: normalizeProgress(migrated),
            skill: currentSkillForProgress(migrated),
            fresh: emptyProgress(),
            corrupt,
            oldPositions: [0, 1, 2, 3, 4].map(spine => {
                const progress = normalizeProgress({ spine });
                return {
                    current: currentSkillForProgress(progress),
                    idempotent:
                        JSON.stringify(progress) === JSON.stringify(normalizeProgress(progress))
                };
            }),
            invalidTime: normalizeProgress({
                version: 2,
                skills: { count5: { mastered: true, readyAt: 'bad', confirmed: false } }
            }),
            spine: normalizeProgress({ spine: 4 }),
            level: normalizeProgress({ level: 3 })
        };
    });
    expect(result.migrated.version).toBe(3);
    expect(result.migrated.curriculumBypass).toEqual(['decompose5']);
    expect(result.migrated.skills.decompose5).toBeUndefined();
    expect(result.migrated.lessons.decompositionIntro.status).toBe('unseen');
    expect(result.migrated.lessons.additionIntro).toEqual({ status: 'inProgress', scene: 1 });
    expect(result.skill).toBe('countOn');
    expect(result.again).toEqual(result.migrated);
    expect(result.fresh.curriculumBypass).toEqual([]);
    expect(result.corrupt.curriculumBypass).toEqual([]);
    expect(result.corrupt.skills.countOn.readinessItem).toBeNull();
    expect(result.corrupt.skills.countOn.confirmed).toBe(false);
    expect(result.corrupt.lessons.countOnIntro.scene).toBe(0);
    expect(result.invalidTime.skills.count5.confirmed).toBe(false);
    expect(result.oldPositions.map(position => position.current)).toEqual([
        'count5',
        'count10',
        'addWithin5',
        'addWithin10',
        'subWithin5'
    ]);
    expect(result.oldPositions.every(position => position.idempotent)).toBe(true);
    for (const legacy of [result.spine, result.level]) {
        expect(legacy.version).toBe(3);
        expect(legacy.currentSkill).toBe('subWithin5');
        expect(legacy.skills.decompose5).toBeUndefined();
    }
});

test('review clock, baseline, assistance and taught variants have separate outcomes', async ({
    page
}) => {
    await gotoApp(page);
    const checks = await page.evaluate(async () => {
        const {
            emptyProgress,
            recordSkillResult,
            confirmationSkillFor,
            beginConfirmation,
            REVIEW_DELAY_MS
        } = await import('../js/math/ladder.js');
        const { bridgeVariants, bridgeProblem, confirmationProblem } =
            await import('../js/math/bridge-problems.js');
        const progress = emptyProgress();
        progress.lessons.decompositionIntro = { status: 'complete', scene: 0 };
        const problem = bridgeProblem('decompose5', bridgeVariants('decompose5')[0]);
        for (let i = 0; i < 6; i++)
            recordSkillResult(progress, 'decompose5', true, {
                problem,
                now: 100,
                sessionId: 'first'
            });
        const state = progress.skills.decompose5;
        const saved = JSON.parse(JSON.stringify(state));
        const now = 100 + REVIEW_DELAY_MS;
        const same = confirmationSkillFor(progress, 'first', now);
        const early = confirmationSkillFor(progress, 'second', now - 1);
        const eligible = confirmationSkillFor(progress, 'second', now);
        beginConfirmation(progress, 'decompose5', 'second', now);
        const repeat = confirmationSkillFor(progress, 'second', now + REVIEW_DELAY_MS);
        const varied = confirmationProblem(
            'decompose5',
            state.readinessItem,
            state.taughtRepresentations
        );
        const assisted = recordSkillResult(progress, 'decompose5', false, {
            confirmation: true,
            problem: varied,
            now,
            sessionId: 'second'
        });
        const retryEarly = confirmationSkillFor(progress, 'third', now + 1);
        const identical = recordSkillResult(progress, 'decompose5', true, {
            confirmation: true,
            problem,
            now: now + REVIEW_DELAY_MS,
            sessionId: 'third'
        });
        const independent = recordSkillResult(progress, 'decompose5', true, {
            confirmation: true,
            problem: varied,
            now: now + 2 * REVIEW_DELAY_MS,
            sessionId: 'fourth'
        });
        state.confirmed = false;
        state.lastConfirmationAt = Number.MAX_SAFE_INTEGER;
        const future = confirmationSkillFor(progress, 'fifth', now);
        state.lastConfirmationAt = null;
        state.readinessItem = null;
        const missing = confirmationSkillFor(progress, 'fifth', now);
        recordSkillResult(progress, 'decompose5', true, {
            problem,
            now: now + 3 * REVIEW_DELAY_MS,
            sessionId: 'baseline'
        });
        return {
            saved,
            same,
            early,
            eligible,
            repeat,
            assisted,
            retryEarly,
            identical,
            independent,
            future,
            missing,
            baselineSession: state.readySession
        };
    });
    expect(checks.saved.mastered).toBe(true);
    expect(checks.saved.confirmed).toBe(false);
    expect(checks.saved.taughtRepresentations).toEqual(['trays']);
    for (const key of ['same', 'early', 'repeat', 'retryEarly', 'future', 'missing'])
        expect(checks[key]).toBeNull();
    expect(checks.eligible).toBe('decompose5');
    expect(checks.assisted.becameConfirmed).toBe(false);
    expect(checks.identical.becameConfirmed).toBe(false);
    expect(checks.independent.becameConfirmed).toBe(true);
    expect(checks.baselineSession).toBe('baseline');
});

test('decomposition models preserve counters, accept any split, and require a checked prediction', async ({
    page
}) => {
    await open(page, atSkill('decompose5'));
    const workspace = page.locator('#mathlab-workspace');
    await expect(workspace).toHaveAttribute('data-lesson', 'decompositionIntro');
    await expect(page.locator('.bridge-counter')).toHaveCount(5);
    await page.locator('.bridge-model-move').click();
    await expect(page.locator('.bridge-counter')).toHaveCount(5);
    await expect(page.locator('.bridge-equation')).toHaveText('1 + 4 = 5');
    await page.locator('.bridge-next').click();
    await expect(page.locator('.bridge-equation')).toHaveText('0 + 5 = 5');
    await page.locator('.bridge-next').click();
    await expect(page.locator('.bridge-next')).toBeDisabled();
    await page.locator('[data-part="left"] button').first().click();
    await page.locator('[data-part="left"] button').first().click();
    await expect(page.locator('.bridge-move')).toHaveCount(4);
    await expect(page.locator('.bridge-equation')).toHaveText('0 + 4 = 4');
    await page.locator('.bridge-next').click();
    await expect(page.locator('.bridge-unknown')).toHaveText('?');
    await expect(page.locator('.bridge-counter')).toHaveCount(2);
    await choose(page, 2, true);
    await expect(workspace).toHaveAttribute('data-lesson', 'decompositionIntro');
    await page.keyboard.press('Tab');
    await page.locator('.bridge-choice[data-choice="3"]').focus();
    await page.keyboard.press('Space');
    await expect(page.locator('.bridge-choice[data-choice="3"]')).toHaveAttribute(
        'aria-pressed',
        'true'
    );
    await page.locator('.bridge-lesson-check').focus();
    await page.keyboard.press('Enter');
    await expect(workspace).toHaveAttribute('data-skill', 'decompose5');
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    expect(stored.skills.decompose5).toBeUndefined();
    expect(stored.lessons.decompositionIntro.status).toBe('complete');
    expect(await page.evaluate(() => localStorage.getItem('edamame-score-mathlab'))).toBeNull();
});

test('counting on pairs each new object with one hop and one spoken number', async ({ page }) => {
    await stubSpeech(page);
    await open(page, atSkill('countOn'), { speech: true });
    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-lesson', 'countOnIntro');
    await page.locator('.bridge-add-one').click();
    await expect(page.locator('.bridge-hop')).toHaveCount(1);
    await expect(page.locator('.bridge-counted')).toHaveCount(1);
    await expect(page.locator('.bridge-equation')).toHaveText('4 + 2 = ?');
    await page.locator('.bridge-add-one').click();
    await expect(page.locator('.bridge-hop')).toHaveCount(2);
    await expect(page.locator('.bridge-counted')).toHaveCount(2);
    await expect(page.locator('.bridge-equation')).toHaveText('4 + 2 = 6');
    const spoken = (await speechLog(page))
        .filter(entry => entry.type === 'speak')
        .map(entry => entry.text);
    expect(spoken.slice(-2)).toEqual(['5', '6']);
    await page.locator('.bridge-next').click();
    await expect(page.locator('.bridge-add-one')).toBeDisabled();
    await page.locator('.bridge-choice[data-choice="2"]').click();
    await expect(page.locator('.bridge-add-one')).toBeDisabled();
    await page.locator('.bridge-choice[data-choice="3"]').click();
    await page.locator('.bridge-add-one').click();
    await page.locator('.bridge-add-one').click();
    await expect(page.locator('.bridge-equation')).toHaveText('3 + 2 = 5');
    await page.locator('.bridge-next').click();
    await expect(page.locator('.bridge-hop')).toHaveCount(0);
    await expect(page.locator('.bridge-equation')).toHaveText('5 + 3 = ?');
    await choose(page, 8, true);
    await page.locator('#free-btn').click();
    await page.waitForTimeout(1100);
    await expect(page.locator('#mathlab-container')).not.toHaveClass(/active/);
    await page.locator('#mathlab-btn').click();
    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'countOn');
});

for (const skill of ['decompose5', 'countOn']) {
    test(`${skill}: help is assisted; explicit choices and all lenses preserve the task`, async ({
        page
    }) => {
        const progress = atSkill(skill);
        progress.lessons = {
            decompositionIntro: { status: 'complete', scene: 0 },
            countOnIntro: { status: 'complete', scene: 0 }
        };
        progress.skills[skill] = {
            recentIndependent: [true, true, true, true, false],
            mastered: false,
            confirmed: false,
            readyAt: null
        };
        await open(page, progress);
        const answer = await displayedAnswer(page);
        await page.locator(`.bridge-choice[data-choice="${answer}"]`).click();
        expect(
            await page.evaluate(
                key =>
                    JSON.parse(localStorage.getItem(key)).skills[
                        document.querySelector('#mathlab-workspace').getAttribute('data-skill')
                    ].recentIndependent.length,
                KEY
            )
        ).toBe(5);
        await page.locator('.bridge-support').click();
        await page.locator('.lab-check').click();
        const state = await page.evaluate(
            ([key, id]) => JSON.parse(localStorage.getItem(key)).skills[id],
            [KEY, skill]
        );
        expect(state.mastered).toBe(false);
        expect(state.recentIndependent).toEqual([true, true, true, true, false, false]);
        for (const mathMethod of ['classical', 'commoncore', 'singapore', 'mix']) {
            await page.evaluate(async value => {
                const { setSetting } = await import('../js/settings.js');
                setSetting('mathMethod', value);
            }, mathMethod);
            await expect(page.locator('#mathlab-workspace')).toHaveAttribute(
                'data-method',
                'bridges'
            );
        }
    });
}

test('one review per session including exit, mode changes, and multiple pending skills', async ({
    page
}) => {
    const progress = atSkill('count10');
    progress.skills.count5 = { ...ready(), confirmed: false, readySession: 'old' };
    progress.skills.subitize = { ...ready(), confirmed: false, readySession: 'old' };
    await open(page, progress);
    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-review', 'true');
    await page.locator('.bridge-skip-review').click();
    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'count10');
    await page.locator('#free-btn').click();
    await page.locator('#mathlab-btn').click();
    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'count10');
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    expect(stored.skills.count5.mastered).toBe(true);
    expect(stored.skills.count5.confirmed).toBe(false);
    expect(stored.skills.count5.lastConfirmationAt).toBeGreaterThan(1);
    expect(stored.skills.subitize.lastConfirmationAt).toBeNull();
});

test('pinned bridge exploration does not run review or write readiness', async ({ page }) => {
    const progress = atSkill('count10');
    progress.skills.count5 = { ...ready(), confirmed: false, readySession: 'old' };
    await open(page, progress, { mathLabLevel: 'decompose5' });
    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'decompose5');
    await choose(page, await displayedAnswer(page));
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    expect(stored.skills.decompose5).toBeUndefined();
    expect(stored.skills.count5.lastConfirmationAt).toBeUndefined();
});

test('bridge controls fit, support reduced motion, and pass axe', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, null, { mathLabLevel: 'decompose5' });
    const audit = await new AxeBuilder({ page }).include('#mathlab-container').analyze();
    expect(audit.violations).toEqual([]);
    const targets = await page.locator('.bridge-board button').evaluateAll(buttons =>
        buttons.map(button => {
            const rect = button.getBoundingClientRect();
            const area = document.querySelector('#mathlab-workspace').getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
                visible: rect.top >= area.top - 1 && rect.bottom <= area.bottom + 1
            };
        })
    );
    for (const target of targets) {
        expect(target.width).toBeGreaterThanOrEqual(44);
        expect(target.height).toBeGreaterThanOrEqual(44);
        expect(target.visible).toBe(true);
    }
});

test('independent counting-on to ten records the taught task and advances to addition', async ({
    page
}) => {
    await page.addInitScript(() => {
        Math.random = () => 0.999;
    });
    const progress = atSkill('countOn');
    progress.lessons.countOnIntro = { status: 'complete', scene: 0 };
    progress.skills.countOn = {
        ...ready(),
        mastered: false,
        confirmed: false,
        recentIndependent: [true, true, true, true, false]
    };
    await open(page, progress);
    await expect(page.locator('.bridge-equation')).toHaveText('9 + 1 = ?');
    await choose(page, 10);
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    expect(stored.skills.countOn.mastered).toBe(true);
    expect(stored.skills.countOn.readinessItem).toMatchObject({
        task: 'countOnFrom',
        a: 9,
        b: 1,
        representation: 'numberLine'
    });
    expect(stored.skills.countOn.taughtRepresentations).toEqual(['objects', 'numberLine']);
    await expect(page.locator('#mathlab-workspace')).toHaveAttribute('data-skill', 'addWithin10', {
        timeout: 6000
    });
});

test('all new lesson scenes expose reachable controls and valid accessibility semantics', async ({
    page
}) => {
    await open(page, atSkill('decompose5'));
    for (const id of ['decompositionIntro', 'countOnIntro']) {
        const sceneCount = id === 'decompositionIntro' ? 4 : 3;
        for (let scene = 0; scene < sceneCount; scene++) {
            await page.evaluate(
                async ({ id, scene }) => {
                    const { lessons } = await import('../js/math/lessons.js');
                    const question = lessons[id].render(
                        scene,
                        document.getElementById('mathlab-workspace')
                    );
                    document.getElementById('mathlab-question').innerHTML = question.html;
                },
                { id, scene }
            );
            const audit = await new AxeBuilder({ page }).include('#mathlab-container').analyze();
            expect(audit.violations, `${id} scene ${scene}`).toEqual([]);
            const clipped = await page.locator('#mathlab-workspace').evaluate(workspace => {
                const box = workspace.getBoundingClientRect();
                return [...workspace.querySelectorAll('button')]
                    .filter(button => {
                        const target = button.getBoundingClientRect();
                        return (
                            target.top < box.top - 1 ||
                            target.bottom > box.bottom + 1 ||
                            target.right > innerWidth
                        );
                    })
                    .map(button => button.textContent);
            });
            expect(clipped, `${id} scene ${scene}`).toEqual([]);
        }
    }
});
