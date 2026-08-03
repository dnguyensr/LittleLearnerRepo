const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

// Decoration and content must be disjoint sets — see js/data/decor.js. A
// celebration particle is spawned over the play area while a problem is still
// on screen, so a particle that is also a countable subject makes "count
// exactly these objects" ambiguous. Same for the score badge, which lives in
// the play area's top-right corner permanently.
//
// The module lists are read in the page rather than required here: they are ES
// modules the app already has loaded, so a dynamic import returns the very
// objects the running app is using.
async function readEmojiRoles(page) {
    return await page.evaluate(async () => {
        // Paths go through a variable so the typecheck reads them as the
        // server URLs they are, rather than trying to resolve them on disk.
        const [decor, items, words, numbers] = await Promise.all([
            '/js/data/decor.js',
            '/js/data/math-items.js',
            '/js/data/words.js',
            '/js/modes/numbers.js'
        ].map(path => import(path)));

        const content = new Set();
        for (const item of items.mathItems) {
            content.add(item.emoji);
            if (item.eater) content.add(item.eater);
        }
        for (const entry of words.easyWords) content.add(entry.emoji);
        for (const emoji of numbers.objectEmojis) content.add(emoji);

        return {
            decoration: decor.celebrationEmojis,
            content: [...content],
            badge: document.getElementById('score-display').textContent
        };
    });
}

test.describe('Decoration never doubles as content', () => {
    test('no celebration particle is a countable object or a word picture', async ({ page }) => {
        await gotoApp(page);
        const { decoration, content } = await readEmojiRoles(page);

        expect(decoration.length).toBeGreaterThan(0);
        expect(decoration.filter(emoji => content.includes(emoji))).toEqual([]);
    });

    test('the score badge carries no content emoji', async ({ page }) => {
        await gotoApp(page);
        const { content, badge } = await readEmojiRoles(page);

        expect(badge).toContain('Score:');
        expect(content.filter(emoji => badge.includes(emoji))).toEqual([]);
    });
});
