const js = require('@eslint/js');
const globals = require('globals');

// Flat config. Three environments live in this repo and they are genuinely
// different: js/ is browser ES modules that ship as-is, tests/ and tools/ are
// CommonJS running under Node.
//
// The stylistic rules here only encode what the codebase already does — they
// are aligned with .editorconfig (4-space indent) and with the existing single
// -quote, semicolon, 4-space style. Nothing here reformats working code.

module.exports = [
    {
        ignores: [
            'node_modules/**',
            'test-results/**',
            'playwright-report/**',
            'blob-report/**'
        ]
    },

    // The app itself: browser ES modules, no build step.
    {
        files: ['js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: globals.browser
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
            // `element.offsetHeight;` is a deliberate reflow trigger before
            // restarting an animation, in more than one mode.
            'no-unused-expressions': 'off',
            eqeqeq: ['error', 'smart'],
            'no-var': 'error',
            'prefer-const': 'error',
            indent: ['error', 4, { SwitchCase: 1 }],
            quotes: ['error', 'single', { avoidEscape: true }],
            semi: ['error', 'always'],
            'comma-dangle': ['error', 'never'],
            'eol-last': ['error', 'always'],
            'no-trailing-spaces': 'error'
        }
    },

    // Playwright specs and the dev tooling: CommonJS under Node.
    {
        files: ['tests/**/*.js', 'tools/**/*.js', 'playwright.config.js', 'eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: { ...globals.node, ...globals.browser }
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
            eqeqeq: ['error', 'smart'],
            'no-var': 'error',
            'prefer-const': 'error',
            indent: ['error', 4, { SwitchCase: 1 }],
            quotes: ['error', 'single', { avoidEscape: true }],
            semi: ['error', 'always'],
            'comma-dangle': ['error', 'never'],
            'eol-last': ['error', 'always'],
            'no-trailing-spaces': 'error'
        }
    }
];
