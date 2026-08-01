const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('url');
const path = require('path');

// Opening index.html directly can never work — browsers block ES modules over
// file:// — so the page has to explain itself rather than sitting blank behind
// a console error nobody has open.
test.describe('Opened as a file:// path', () => {
    const indexUrl = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

    test('explains how to run the server instead of failing silently', async ({ page }) => {
        await page.goto(indexUrl);

        const help = page.locator('#file-protocol-help');
        await expect(help).toBeVisible();
        await expect(help).toContainText('npm run serve');
        await expect(help.locator('a')).toHaveAttribute('href', 'http://localhost:8123/');

        // The broken app UI is replaced, not left half-rendered alongside it
        await expect(page.locator('#play-area')).toHaveCount(0);
    });

    test('served over http, the help is absent and the app boots', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#file-protocol-help')).toHaveCount(0);
        await expect(page.locator('#free-btn')).toBeVisible();
    });
});
