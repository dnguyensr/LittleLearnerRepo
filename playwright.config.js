const { defineConfig, devices } = require('@playwright/test');

const chromiumArgs = ['--autoplay-policy=no-user-gesture-required'];

/**
 * How many browsers run at once.
 *
 * Playwright's local default is half the logical cores, which on a 20-core
 * developer machine means ten browsers — and a browser is not one process, so
 * that is dozens of processes competing for the machine someone is trying to
 * use. There is no memory or CPU quota in Playwright; worker count is the lever.
 *
 * CI has the machine to itself and should use it. A developer does not.
 *
 * Six is measured, not guessed. On a 20-core machine the full suite takes ~250s
 * at the default of ten workers, 277s at six (+11%) and 417s at four (+67%).
 * Six buys back 40% of the concurrent browsers for a tenth of the runtime, and
 * four is where the curve turns bad.
 *
 * Override for a one-off run with `--workers=N`, or set PW_WORKERS.
 */
function workerCount() {
    if (process.env.PW_WORKERS) return Number(process.env.PW_WORKERS);
    return process.env.CI ? '100%' : 6;
}

module.exports = defineConfig({
    testDir: 'tests',
    fullyParallel: true,
    workers: workerCount(),
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    globalSetup: require.resolve('./tests/global-setup.js'),
    use: {
        baseURL: 'http://localhost:8123',
        trace: 'on-first-retry'
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
