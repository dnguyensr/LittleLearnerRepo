const { test, expect } = require('@playwright/test');
const { gotoApp, openSettings, seedSettings, stubSpeech, spokenTexts } = require('./helpers');

async function openWords(page) {
    await page.locator('#words-btn').click();
    await expect(page.locator('#word-container')).toHaveClass(/active/);
}

async function activityData(page) {
    return page.evaluate(async () => {
        const progress = JSON.parse(localStorage.getItem('lls-words-progress'));
        const curriculumPath = '/js/words/curriculum.js';
        const curriculum = await import(curriculumPath);
        const activity = progress.currentActivity;
        const word = curriculum.wordByID(activity.wordId);
        let targets;
        if (activity.mode === 'wordStar') targets = word.spelling || [...word.word];
        else if (activity.mode === 'firstSound') targets = [word.phonemes[0].grapheme];
        else if (activity.mode === 'finalSound') targets = [word.phonemes.at(-1).grapheme];
        else if (activity.mode === 'segment') targets = word.phonemes.map(() => '●');
        else targets = word.phonemes.map(phoneme => phoneme.grapheme);
        return { progress, activity, word, targets };
    });
}

async function clickTile(page, value) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await page.locator('.word-tile').filter({ hasText: new RegExp(`^${escaped}$`) }).click();
}

async function solveCurrent(page) {
    const { activity, targets } = await activityData(page);
    for (let index = 0; index < targets.length; index++) {
        if (activity.placements[index] === null) await clickTile(page, targets[index]);
    }
}

async function pinStage(page, stage) {
    await page.evaluate(async value => {
        localStorage.removeItem('lls-words-progress');
        const settingsPath = '/js/settings.js';
        const settings = await import(settingsPath);
        settings.setSetting('wordStage', value);
        window.dispatchEvent(new CustomEvent('lls-words-progress-reset'));
    }, stage);
    await expect(page.locator('#word-container')).toHaveClass(/active/);
}

test.describe('Guided Words replacement', () => {
    test.beforeEach(async ({ page }) => {
        await seedSettings(page, { speech: false, wordStage: 'auto' });
        await gotoApp(page);
        await openWords(page);
    });

    test('fresh progress begins with a first-sound choice and no visible answer', async ({ page }) => {
        const { activity, word } = await activityData(page);
        expect(activity.skillId).toBe('firstSoundsContinuous');
        expect(activity.mode).toBe('firstSound');
        await expect(page.locator('.word-sound-box')).toHaveCount(1);
        await expect(page.locator('.word-sound-box')).toHaveText('');
        await expect(page.locator('.word-tile')).toHaveCount(3);
        await expect(page.locator('#word-reveal')).toBeHidden();
        await expect(page.locator('#word-activity')).not.toContainText(word.word);
        await expect(page.locator('.letter-box, #target-word, #word-emoji')).toHaveCount(0);
    });

    test('a mismatch gives support, preserves the activity, and offers help after two misses', async ({ page }) => {
        const { targets } = await activityData(page);
        const wrong = await page.locator('.word-tile').evaluateAll((tiles, target) => (
            tiles.map(tile => tile.dataset.wordTile).find(value => value !== target)
        ), targets[0]);

        await clickTile(page, wrong);
        await expect(page.locator('.word-sound-box.current')).toHaveCount(1);
        await expect(page.locator('#word-feedback')).toContainText('Listen to the word again');
        await expect(page.locator('#word-count')).toHaveText('0');
        await expect(page.locator('#word-learn-together')).toBeHidden();

        await clickTile(page, wrong);
        await expect(page.locator('#word-learn-together')).toBeVisible();
        await expect(page.locator('.word-tile:not(:disabled)')).toHaveCount(3);
    });

    test('Build It Together fills only the current relationship and records an assisted completion', async ({ page }) => {
        const { targets } = await activityData(page);
        const wrong = await page.locator('.word-tile').evaluateAll((tiles, target) => (
            tiles.map(tile => tile.dataset.wordTile).find(value => value !== target)
        ), targets[0]);
        await clickTile(page, wrong);
        await clickTile(page, wrong);
        await page.locator('#word-learn-together').click();

        await expect(page.locator('.word-sound-box.guided')).toHaveCount(1);
        await expect(page.locator('#word-reveal')).toBeVisible();
        await expect(page.locator('#word-next-actions')).toBeVisible();
        await expect(page.locator('#word-count')).toHaveText('1');
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lls-words-progress')));
        expect(saved.skills.firstSoundsContinuous.recentIndependent).toEqual([false]);
    });

    test('success waits for the child to choose Again or Next Word', async ({ page }) => {
        const firstWord = (await activityData(page)).word.id;
        await solveCurrent(page);
        await expect(page.locator('#word-reveal')).toBeVisible();
        await expect(page.locator('#word-next-actions')).toBeVisible();
        await page.waitForTimeout(700);
        expect((await activityData(page)).word.id).toBe(firstWord);
        await page.locator('#word-next-btn').click();
        await expect(page.locator('#word-reveal')).toBeHidden();
    });

    test('five independent successes in the latest six master permanently', async ({ page }) => {
        const result = await page.evaluate(async () => {
            const progressPath = '/js/words/progress.js';
            const module = await import(progressPath);
            const progress = module.emptyWordsProgress();
            for (const independent of [true, true, false, true, true, true]) {
                module.recordWordResult(progress, 'firstSoundsContinuous', independent);
            }
            const masteredAtSix = progress.skills.firstSoundsContinuous.mastered;
            for (const independent of [false, false, false, false, false, false]) {
                module.recordWordResult(progress, 'firstSoundsContinuous', independent);
            }
            return {
                masteredAtSix,
                stillMastered: progress.skills.firstSoundsContinuous.mastered,
                recent: progress.skills.firstSoundsContinuous.recentIndependent
            };
        });
        expect(result.masteredAtSix).toBe(true);
        expect(result.stillMastered).toBe(true);
        expect(result.recent).toEqual([false, false, false, false, false, false]);
    });

    test('mode switches and reloads restore an unfinished word without recording failure', async ({ page }) => {
        await pinStage(page, 'continuousCvc');
        const { targets } = await activityData(page);
        await clickTile(page, targets[0]);
        const before = (await activityData(page)).activity;

        await page.locator('#free-btn').click();
        await openWords(page);
        expect((await activityData(page)).activity.placements).toEqual(before.placements);

        await page.reload();
        await expect(page.locator('#free-btn')).toBeVisible();
        await openWords(page);
        const after = await activityData(page);
        expect(after.activity.wordId).toBe(before.wordId);
        expect(after.activity.placements).toEqual(before.placements);
        expect(after.progress.skills.continuousCvc).toBeUndefined();
    });

    test('physical letters and Backspace have parity with the tile tray', async ({ page }) => {
        await pinStage(page, 'continuousCvc');
        const { activity, word } = await activityData(page);
        for (const letter of word.phonemes[0].sequence) await page.keyboard.press(letter);
        await expect(page.locator('.word-sound-box.placed')).toHaveCount(1);
        await page.keyboard.press('Backspace');
        await expect(page.locator('.word-sound-box.placed')).toHaveCount(activity.fixed.length);
        await expect(page.locator('.word-sound-box.current')).toHaveCount(1);
    });

    test('word chains retain shared sounds and change exactly one grapheme', async ({ page }) => {
        await pinStage(page, 'wordChains');
        const { activity } = await activityData(page);
        expect(activity.fromWordId).not.toBeNull();
        expect(activity.fixed).toHaveLength(2);
        await expect(page.locator('.word-sound-box.placed')).toHaveCount(2);
        await expect(page.locator('.word-sound-box.current')).toHaveCount(1);
        await expect(page.locator('#word-prompt')).toContainText('Change');
    });

    test('digraph and silent-e activities use phoneme boxes rather than character count', async ({ page }) => {
        await pinStage(page, 'digraphs');
        let data = await activityData(page);
        await expect(page.locator('.word-sound-box')).toHaveCount(data.word.phonemes.length);
        expect(data.word.phonemes.length).toBeLessThan(data.word.word.length);
        expect(data.targets.some(tile => tile.length > 1)).toBe(true);

        await pinStage(page, 'silentE');
        data = await activityData(page);
        await expect(page.locator('.word-sound-box')).toHaveCount(3);
        expect(data.word.word.length).toBe(4);
        expect(data.targets.some(tile => tile.includes('…E'))).toBe(true);
    });

    test('Word Stars teach and mark unexpected spellings without changing regular-word readiness', async ({ page }) => {
        await pinStage(page, 'wordStars');
        const before = await activityData(page);
        expect(before.word.unexpected.length).toBeGreaterThan(0);
        await solveCurrent(page);
        await expect(page.locator('.word-sound-box.irregular')).toHaveCount(before.word.unexpected.length);
        const saved = (await activityData(page)).progress;
        expect(saved.skills.wordStars.recentIndependent).toEqual([true]);
        expect(saved.skills.shortVowelCvc).toBeUndefined();
    });

    test('the historical Words score is preserved but never used as readiness', async ({ page }) => {
        await page.evaluate(() => localStorage.setItem('lls-score-words', '41'));
        await page.locator('#free-btn').click();
        await openWords(page);
        await expect(page.locator('#word-count')).toHaveText('41');
        let saved = (await activityData(page)).progress;
        expect(saved.skills).toEqual({});
        await solveCurrent(page);
        await expect(page.locator('#word-count')).toHaveText('42');
        saved = (await activityData(page)).progress;
        expect(saved.skills.firstSoundsContinuous.recentIndependent).toEqual([true]);
    });

    test('the unlocked paths are reversible and never clear mastery', async ({ page }) => {
        await page.evaluate(() => {
            const mastered = {};
            for (const skill of [
                'firstSoundsContinuous', 'firstSoundsStops', 'finalSounds', 'segmentSounds',
                'missingLetter', 'continuousCvc', 'shortVowelCvc'
            ]) mastered[skill] = { recentIndependent: [true, true, true, true, true, true], mastered: true };
            localStorage.setItem('lls-words-progress', JSON.stringify({
                version: 1, currentSkill: 'shortVowelCvc', selectedPath: 'soundBuilding',
                currentActivity: null, skills: mastered,
                lessons: {
                    firstSoundsIntro: { status: 'complete', scene: 0 },
                    wordBuildingIntro: { status: 'complete', scene: 0 }
                }
            }));
        });
        await page.reload();
        await expect(page.locator('#free-btn')).toBeVisible();
        await openWords(page);
        await expect(page.locator('.word-path-card')).toHaveCount(3);

        await page.getByRole('button', { name: /New Patterns/ }).click();
        await expect(page.locator('#word-paths-btn')).toBeVisible();
        await page.locator('#word-paths-btn').click();
        await page.getByRole('button', { name: /Keep Building/ }).click();
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lls-words-progress')));
        expect(saved.selectedPath).toBe('practice');
        expect(saved.skills.shortVowelCvc.mastered).toBe(true);
    });

    test('corrupt progress normalizes safely and Words reset takes two taps', async ({ page }) => {
        await page.evaluate(() => localStorage.setItem('lls-words-progress', '{bad json'));
        await page.reload();
        await expect(page.locator('#free-btn')).toBeVisible();
        await openWords(page);
        expect((await activityData(page)).activity.skillId).toBe('firstSoundsContinuous');

        await openSettings(page);
        const reset = page.locator('#words-progress-reset');
        await reset.click();
        await expect(reset).toHaveText('Tap again to erase');
        expect(await page.evaluate(() => localStorage.getItem('lls-words-progress'))).not.toBeNull();
        await reset.click();
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lls-words-progress')));
        expect(saved.currentSkill).toBe('firstSoundsContinuous');
        expect(saved.skills).toEqual({});
    });

    test('authored sound cues, not bare capital letters, are spoken for placed tiles', async ({ page }) => {
        await stubSpeech(page);
        await page.reload();
        await expect(page.locator('#free-btn')).toBeVisible();
        await openWords(page);
        const { targets } = await activityData(page);
        await clickTile(page, targets[0]);
        const said = await spokenTexts(page);
        expect(said.some(text => /^[A-Z]$/.test(text))).toBe(false);
    });
});
