const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { gotoApp, seedSettings } = require('./helpers');

const stages = [
    'firstSoundsContinuous', 'firstSoundsStops', 'finalSounds', 'segmentSounds',
    'missingLetter', 'continuousCvc', 'shortVowelCvc', 'wordChains', 'blends',
    'digraphs', 'silentE', 'vowelTeams', 'wordParts', 'wordStars'
];

async function seriousViolations(page) {
    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
    return results.violations.filter(item => item.impact === 'serious' || item.impact === 'critical');
}

async function expectActivityFits(page) {
    const bounds = await page.evaluate(() => {
        const play = document.getElementById('play-area').getBoundingClientRect();
        const visibleContent = document.getElementById('word-path-chooser').hidden
            ? document.getElementById('word-activity') : document.getElementById('word-path-chooser');
        const activity = visibleContent.getBoundingClientRect();
        const controls = [...document.querySelectorAll(
            '#word-activity button:not([hidden]), #word-path-chooser button:not([hidden]), #word-paths-btn:not([hidden])'
        )].filter(element => element.getClientRects().length > 0).map(element => {
            const box = element.getBoundingClientRect();
            return { width: box.width, height: box.height, label: element.getAttribute('aria-label') || element.textContent };
        });
        return {
            play: { top: play.top, right: play.right, bottom: play.bottom, left: play.left },
            activity: { top: activity.top, right: activity.right, bottom: activity.bottom, left: activity.left },
            controls
        };
    });
    expect(bounds.activity.top).toBeGreaterThanOrEqual(bounds.play.top - 1);
    expect(bounds.activity.left).toBeGreaterThanOrEqual(bounds.play.left - 1);
    expect(bounds.activity.right).toBeLessThanOrEqual(bounds.play.right + 1);
    expect(bounds.activity.bottom).toBeLessThanOrEqual(bounds.play.bottom + 1);
    for (const control of bounds.controls) {
        expect(control.width, control.label).toBeGreaterThanOrEqual(44);
        expect(control.height, control.label).toBeGreaterThanOrEqual(44);
    }
}

test.describe('Words stage layout and accessibility', () => {
    for (const stage of stages) {
        test(`${stage} fits and has no serious accessibility violations`, async ({ page }) => {
            await seedSettings(page, { speech: false, wordStage: stage });
            await gotoApp(page);
            await page.locator('#words-btn').click();
            await expect(page.locator('#word-container')).toHaveClass(/active/);
            await expectActivityFits(page);
            expect(await seriousViolations(page)).toEqual([]);
        });
    }

    test('all three unlocked path cards fit and pass accessibility checks', async ({ page }) => {
        await seedSettings(page, { speech: false, wordStage: 'auto' });
        await page.addInitScript(() => {
            const skills = {};
            for (const skill of [
                'firstSoundsContinuous', 'firstSoundsStops', 'finalSounds', 'segmentSounds',
                'missingLetter', 'continuousCvc', 'shortVowelCvc'
            ]) skills[skill] = { recentIndependent: [true, true, true, true, true, true], mastered: true };
            localStorage.setItem('edamame-words-progress', JSON.stringify({
                version: 1, currentSkill: 'shortVowelCvc', selectedPath: 'soundBuilding',
                currentActivity: null, skills,
                lessons: {
                    firstSoundsIntro: { status: 'complete', scene: 2 },
                    wordBuildingIntro: { status: 'complete', scene: 2 }
                }
            }));
        });
        await gotoApp(page);
        await page.locator('#words-btn').click();
        await expect(page.locator('.word-path-card')).toHaveCount(3);
        await expectActivityFits(page);
        expect(await seriousViolations(page)).toEqual([]);
    });
});
