# Edamame — Technical README

This guide covers local development, repository structure, testing, browser/device profiles, and deployment. For the application overview and live site, see the [main README](README.md).

## Technical model

Edamame is a static HTML, CSS, and JavaScript application built with native ES modules. There is no application build step, framework, backend, or runtime package dependency. Files in the repository are served directly by GitHub Pages.

npm packages are development tools only:

- Playwright provides end-to-end testing and device emulation.
- axe-core provides automated accessibility checks through Playwright.
- TypeScript checks JSDoc types without compiling the JavaScript.

The app uses browser-provided Web Speech and Web Audio APIs and system emoji. Speech quality and available voices therefore vary by browser and operating system.

## Prerequisites

- Node.js 22 or a compatible current Node.js release
- npm
- Chromium and WebKit binaries installed through Playwright

All commands below assume the current directory is the repository root. Paths in commands are relative to that directory.

## Initial setup

Install the locked development dependencies:

```sh
npm ci
```

Install the browsers used by the full test matrix:

```sh
npx playwright install chromium webkit
```

On a Linux machine that also needs browser system packages, use:

```sh
npx playwright install --with-deps chromium webkit
```

Use `npm install` instead of `npm ci` only when intentionally updating dependencies or the lockfile.

## Running locally

Start the repository's zero-dependency static server:

```sh
npm run serve
```

Then open [http://localhost:8123/](http://localhost:8123/).

To stop the server, return to the terminal where it is running and press `Ctrl+C`. On Windows, enter `Y` if the terminal asks `Terminate batch job (Y/N)?`. Closing that terminal also stops the server.

The equivalent direct command is:

```sh
node ./tools/serve.js
```

Do not open `./index.html` through a `file://` URL. Browsers block its ES-module imports unless the files are served over HTTP.

## Validation and tests

Run the JSDoc type checker:

```sh
npm run typecheck
```

Run the full Playwright matrix, including axe accessibility coverage:

```sh
npm test
```

Open Playwright's interactive test runner:

```sh
npm run test:ui
```

Run one test file by its relative path:

```sh
npx playwright test ./tests/mathlab-progression.spec.js
```

Run tests matching a title:

```sh
npx playwright test --grep "Math readiness graph"
```

Run Chromium visibly or pause in Playwright's debugger:

```sh
npx playwright test --project=chromium --headed
npx playwright test --project=chromium --debug
```

If an HTML report was generated, open it with:

```sh
npx playwright show-report ./playwright-report
```

### Keeping the machine usable while tests run

Playwright's local default is half the logical cores — ten browsers on a
20-core machine — which is enough to make the desktop unresponsive. There is no
memory or CPU quota in Playwright; worker count is the lever, and
`./playwright.config.js` caps local runs at six. CI still uses the whole
machine.

Measured on a 20-core machine, all four browser projects: ~250s at ten workers,
277s at six, 417s at four. Six gives back 40% of the concurrent browsers for
about a tenth of the runtime; four is where the curve turns bad.

```sh
npm run test:quick    # Chromium only — ~60s, the inner-loop run
npm run test:quiet    # two workers, for when the machine is needed elsewhere
npm test -- --workers=10   # or PW_WORKERS=10, when nothing else is running
```

Run the full four-project suite before pushing; `test:quick` does not cover
WebKit, Pixel or iPhone layout.

Playwright's `./tests/global-setup.js` starts the same static server in the test runner and closes it after the suite. Keeping it in-process avoids the Windows shell teardown hang that previously left a fully reported run without an exit code. A separately running server on port 8123 is reused.

## Switching browser and device profiles

Playwright calls its browser/device profiles **projects**. Select one with `--project`:

| Profile | Emulation target | Command |
| --- | --- | --- |
| `chromium` | Desktop Chrome | `npx playwright test --project=chromium` |
| `webkit` | Desktop Safari/WebKit | `npx playwright test --project=webkit` |
| `mobile-chrome` | Pixel 7 | `npx playwright test --project=mobile-chrome` |
| `mobile-safari` | iPhone 16 Pro/WebKit | `npx playwright test --project=mobile-safari` |

Select more than one profile by repeating the option:

```sh
npx playwright test --project=chromium --project=mobile-chrome
```

Combine a profile with a relative test path to make a focused run:

```sh
npx playwright test ./tests/mathlab-lessons.spec.js --project=mobile-safari
```

These profiles are test configurations, not learner profiles. The application currently keeps one set of local progress per browser profile; separate child profiles remain a roadmap item.

## Repository structure

| Relative path | Purpose |
| --- | --- |
| `./index.html` | Application shell, module containers, and grown-up settings markup |
| `./css/styles.css` | Shared responsive and accessible presentation |
| `./js/main.js` | Application startup and mode registration |
| `./js/modes/` | Free Play, Piano, Letters, Numbers, Patterns, Math, and Words controllers |
| `./js/math/` | Math skill graph, problem generation, lessons, manipulatives, and presentation lenses |
| `./js/words/` | Words curriculum definitions, readiness graph, normalization, and persistence |
| `./js/numbers/` | The Numbers observation record a grown-up can read; deliberately not a readiness ladder |
| `./js/patterns/` | Pattern types, puzzle generation, and Patterns readiness |
| `./js/data/` | Learning content and decorative data |
| `./js/types.js` | Shared JSDoc contracts checked by TypeScript |
| `./tests/` | Playwright behavior, layout, accessibility, migration, and compatibility tests |
| `./tools/serve.js` | Local static HTTP server used by developers and Playwright |
| `./tools/contrast.js` | WCAG check of the background palette and panel surfaces; axe cannot judge text over a gradient |
| `./eslint.config.js` | Flat ESLint config, split across the browser-module and CommonJS parts of the repo |
| `./docs/plans/` | Shipped design history, current roadmap, and caregiver observation material |
| `./playwright.config.js` | Browser projects, test server, retries, traces, and reporters |
| `./.github/workflows/ci.yml` | Pull-request and `main` branch validation |

The original `./js/modes/math.js` module is intentionally unregistered. The shipped Math experience is `./js/modes/mathlab.js`, whose internal `mathlab` identifier is retained for storage compatibility.

## Runtime state and compatibility

The app stores data locally in the active browser:

- `edamame-settings` contains grown-up settings.
- `edamame-mathlab-progress` contains normalized versioned Math skill and lesson progress.
- `edamame-words-progress` contains normalized Words skill, path, lesson, and interrupted-activity progress.
- `edamame-patterns-progress` contains normalized Patterns type and readiness progress.
- `edamame-numbers-progress` contains the Numbers observation record: which numerals have been demonstrated, counted independently, and re-counted after a rearrangement. It is read only by the grown-up panel and is never written into Math progress.
- `edamame-score-<mode>` contains each scoring module's total. Math and Words
  score; Letters, Numbers, and Patterns deliberately do not.

Older `edamame-score-patterns` values are intentionally left inert. Reading or
deleting an obsolete score is unnecessary for runtime correctness, and silently
removing browser data would create a migration side effect for no learner
benefit.

Changes to stored contracts must safely normalize missing, corrupt, and legacy values. Math progress migrations and reset behavior are covered in `./tests/mathlab-progression.spec.js`; Words readiness and recovery are covered in `./tests/words.spec.js`; the Numbers record and its two-tap reset are covered in `./tests/numbers.spec.js`.

When modifying the learning experience, preserve these project constraints:

- use relative runtime URLs so deployment works under the GitHub Pages repository path;
- add no server-side requirement;
- keep controls tap-first and usable with a physical keyboard;
- provide visible behavior when speech is unavailable or disabled;
- keep wrong answers recoverable and avoid navigation dead ends; and
- add no analytics or personal data collection.

## Adding or changing a module

Each active mode exports a mode controller from `./js/modes/`. Register shipped modes in the `modes` array in `./js/main.js`. A mode owns its activation, deactivation, input handling, instructions, and on-screen-keyboard layout.

For shared Math contracts, update `./js/types.js` and keep curriculum skills independent from presentation lenses. New guided lessons belong in `./js/math/lessons.js`; readiness and persistence changes belong in `./js/math/ladder.js`.

Words keeps authored phonemes, graphemes, spelling patterns, and word pools in `./js/words/curriculum.js`. Its 5-of-6 readiness history and recoverable activity state live in `./js/words/progress.js`; the interaction shell lives in `./js/modes/words.js`. The lifetime `edamame-score-words` value is celebratory history only and must never be migrated into readiness.

Before handing off a change, run at minimum:

```sh
npm run typecheck
npx playwright test --project=chromium --project=mobile-chrome
```

Use all four profiles for layout, input, speech fallback, or browser compatibility changes.

## CI and deployment

The workflow in `./.github/workflows/ci.yml` runs on pushes and pull requests to `main`. It installs locked packages, typechecks the JavaScript, installs Chromium and WebKit, and runs the full Playwright matrix. Failed runs upload the Playwright HTML report.

GitHub Pages publishes the static application from the repository. There is no compiled output or generated deployment directory. Runtime references must remain relative, such as `./js/main.js` and `./css/styles.css`, so they work both locally and at the repository-scoped site URL.

## Development dependency licenses

The development toolchain is not shipped to visitors:

| Package | Purpose | License |
| --- | --- | --- |
| `@playwright/test` | End-to-end tests and device emulation | Apache-2.0 |
| `@axe-core/playwright` | Accessibility scans; wraps axe-core | MPL-2.0 |
| `typescript` | JSDoc type checking with no emitted output | Apache-2.0 |
| `@types/node` | Node.js type definitions for development scripts | MIT |

If a runtime dependency is ever added or vendored, document its purpose and license before it ships.
