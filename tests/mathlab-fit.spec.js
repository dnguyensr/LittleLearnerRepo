const { test, expect } = require('@playwright/test');
const { gotoApp, seedSettings } = require('./helpers');

/**
 * The play area is only ~350px tall on a phone once the numpad is open, while
 * the viewport is 915 — so anything sized off `vh` fits the screen and misses
 * the box it actually lives in. That is how the answer entry ended up behind
 * the keyboard on eight of the eighteen classical rungs: the sum holding the
 * `?`, and the 🔊 button, were simply below the fold.
 *
 * It was invisible to a spec that measured `#mathlab-container`, because
 * `max-height: 100%` capped the container's own box while its children carried
 * on painting past it. These assertions measure the children, and the widgets
 * inside the workspace, so the same bug cannot come back quietly.
 */

// Every rung either curriculum can land on, including all three detour sets.
const SKILLS = [
    'count5', 'count10', 'subitize', 'countBack', 'numeralMatch',
    'addWithin5', 'countOn', 'addWithin10', 'doubles', 'factFamily', 'bondTo10',
    'subWithin5', 'subWithin10', 'partWhole',
    'makeTen', 'tenAndSome', 'addWithin20', 'subWithin20', 'missingAddend', 'tensAndOnes',
    'addTens', 'addWithin100', 'subWithin100', 'addRegroup', 'subRegroup'
];

const fit = page => page.evaluate(() => {
    const play = document.getElementById('play-area').getBoundingClientRect();
    const container = document.getElementById('mathlab-container');
    const question = document.getElementById('mathlab-question');
    const entry = document.getElementById('mathlab-entry');
    const speak = document.getElementById('mathlab-speak-btn');
    const score = document.getElementById('score-display').getBoundingClientRect();
    const q = question.getBoundingClientRect();

    const kids = [...container.children];
    const answer = document.querySelector('[data-slot], #mathlab-answer-display:not([hidden])');

    // Every control the method drew has to be reachable without dragging. The
    // first version of this spec only checked the answer and 🔊, and missed
    // Singapore's ✓ sitting below the fold on the very rung whose label tells
    // the child to press it.
    const workspace = document.getElementById('mathlab-workspace');
    const wsBox = workspace.getBoundingClientRect();
    const unreachable = [...workspace.querySelectorAll('button')]
        .filter(b => {
            const r = b.getBoundingClientRect();
            return r.bottom > wsBox.bottom + 1 || r.top < wsBox.top - 1;
        })
        .map(b => b.className.split(' ')[0]);

    return {
        unreachable: [...new Set(unreachable)],
        // A control smaller than this is not a target on a phone.
        tiny: [...new Set([...workspace.querySelectorAll('button')]
            .filter(b => {
                const r = b.getBoundingClientRect();
                return r.width > 0 && (r.width < 24 || r.height < 24);
            })
            .map(b => `${b.className.split(' ')[0]} ${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`))],
        // Nothing may paint past the play area, into the on-screen keyboard.
        spill: Math.round(Math.max(...kids.map(k => k.getBoundingClientRect().bottom)) - play.bottom),
        // The score badge is absolutely positioned in the same corner.
        scoreOverlapsQuestion: Math.min(q.right, score.right) > Math.max(q.left, score.left)
            && Math.min(q.bottom, score.bottom) > Math.max(q.top, score.top),
        // Where the answer goes, and the button that re-reads the question, are
        // the two things a child cannot work without.
        answerBottom: answer ? Math.round(answer.getBoundingClientRect().bottom) : null,
        speakBottom: Math.round(speak.getBoundingClientRect().bottom),
        entryBottom: Math.round(entry.getBoundingClientRect().bottom),
        playBottom: Math.round(play.bottom)
    };
});

for (const method of ['classical', 'commoncore', 'singapore']) {
    test(`${method}: every rung fits the play area with the numpad open`, async ({ page }) => {
        const failures = [];

        for (const skill of SKILLS) {
            await seedSettings(page, { betaModes: true, mathMethod: method, mathLabLevel: skill });
            await gotoApp(page);
            await page.locator('#mathlab-btn').click();
            await expect(page.locator('#mathlab-container')).toHaveClass(/active/);
            await page.waitForTimeout(200);

            const m = await fit(page);
            const problems = [];
            if (m.spill > 0) problems.push(`spills ${m.spill}px past the play area`);
            if (m.scoreOverlapsQuestion) problems.push('score badge sits on the question');
            if (m.answerBottom !== null && m.answerBottom > m.playBottom) {
                problems.push(`answer slot is ${m.answerBottom - m.playBottom}px below the fold`);
            }
            if (m.speakBottom > m.playBottom) {
                problems.push(`🔊 is ${m.speakBottom - m.playBottom}px below the fold`);
            }
            if (m.unreachable.length) {
                problems.push(`needs scrolling to reach: ${m.unreachable.join(', ')}`);
            }
            if (m.tiny.length) problems.push(`targets too small: ${m.tiny.join(', ')}`);
            if (problems.length) failures.push(`${skill}: ${problems.join('; ')}`);

            await page.locator('#free-btn').click();
        }

        expect(failures, `\n${failures.join('\n')}\n`).toEqual([]);
    });
}
