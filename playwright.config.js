const { defineConfig, devices } = require('@playwright/test');

const chromiumArgs = ['--autoplay-policy=no-user-gesture-required'];

module.exports = defineConfig({
    testDir: 'tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: 'http://localhost:8123',
        trace: 'on-first-retry'
    },
    webServer: {
        command: 'node tools/serve.js',
        port: 8123,
        reuseExistingServer: !process.env.CI
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: { args: chromiumArgs }
            }
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        },
        {
            name: 'mobile-chrome',
            use: {
                ...devices['Pixel 7'],
                launchOptions: { args: chromiumArgs }
            }
        },
        {
            // The actual device this app is used on. Note it is a WebKit build,
            // not Safari — no speechSynthesis, no Apple voices, no iOS dynamic
            // viewport. It covers layout at the real screen size and JSC, and
            // nothing about how the app sounds.
            name: 'mobile-safari',
            use: { ...devices['iPhone 16 Pro'] }
        }
    ]
});
