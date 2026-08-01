const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

// Headless browsers expose no real voices, so drive the pure ranking function
// with the voice lists the platforms actually hand us.
async function rank(page, voices, language = 'en-US') {
    return page.evaluate(async ([list, lang]) => {
        Object.defineProperty(navigator, 'language', { value: lang, configurable: true });
        const path = '/js/speech.js';
        const speech = await import(path);
        return speech.rankVoices(list);
    }, [voices, language]);
}

const EDGE_VOICES = [
    // Roughly Edge's order: regions ascending, so Australia lands before the US
    { name: 'Microsoft William Online (Natural) - English (Australia)', lang: 'en-AU', default: false },
    { name: 'Microsoft Natasha Online (Natural) - English (Australia)', lang: 'en-AU', default: false },
    { name: 'Microsoft Liam Online (Natural) - English (Canada)', lang: 'en-CA', default: false },
    { name: 'Microsoft Ryan Online (Natural) - English (United Kingdom)', lang: 'en-GB', default: false },
    { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US', default: true },
    { name: 'Microsoft Zira Desktop - English (United States)', lang: 'en-US', default: false },
    { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US', default: false },
    { name: 'Microsoft Ana Online (Natural) - English (United States)', lang: 'en-US', default: false }
];

test.describe('Voice selection', () => {
    test.beforeEach(async ({ page }) => gotoApp(page));

    test('prefers a US natural voice over an earlier-listed Australian one', async ({ page }) => {
        // The reported bug: "first English + natural match" picked William (AU)
        const chosen = await rank(page, EDGE_VOICES);
        expect(chosen).toContain('English (United States)');
        expect(chosen).toContain('Natural');
        expect(chosen).not.toContain('Australia');
    });

    test('is deterministic — same list, same voice, every time', async ({ page }) => {
        const first = await rank(page, EDGE_VOICES);
        const shuffled = [...EDGE_VOICES].reverse();
        const second = await rank(page, shuffled);
        expect(second).toBe(first);
    });

    test('locale preference beats the US default', async ({ page }) => {
        const chosen = await rank(page, EDGE_VOICES, 'en-GB');
        expect(chosen).toContain('United Kingdom');
    });

    test('ignores `default`, which iOS sets on every voice', async ({ page }) => {
        const iosVoices = [
            { name: 'Daniel', lang: 'en-GB', default: true },
            { name: 'Aaron', lang: 'en-US', default: true },
            { name: 'Samantha', lang: 'en-US', default: true }
        ];
        // All three claim to be the default; the US pair wins on locale and
        // then sorts deterministically by name rather than list order.
        expect(await rank(page, iosVoices)).toBe('Aaron');
    });

    test('a natural US voice outranks a plain US voice', async ({ page }) => {
        const chosen = await rank(page, [
            { name: 'Microsoft Zira Desktop - English (United States)', lang: 'en-US', default: true },
            { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US', default: false }
        ]);
        expect(chosen).toContain('Aria');
    });

    test('falls back to any English voice when none match the locale', async ({ page }) => {
        const chosen = await rank(page, [
            { name: 'Karen', lang: 'en-AU', default: false }
        ], 'en-US');
        expect(chosen).toBe('Karen');
    });

    test('returns null when no English voice exists at all', async ({ page }) => {
        expect(await rank(page, [{ name: 'Anna', lang: 'de-DE', default: true }])).toBeNull();
        expect(await rank(page, [])).toBeNull();
    });
});
