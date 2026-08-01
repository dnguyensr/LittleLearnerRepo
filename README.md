# LittleLearnerRepo

brought to you by an idea, built by iterative prompts, possibly marginally functional, fully ai slop

Little Learner Keys is a GitHub Pages web app for toddlers (pre-K–1st grade) with Free Play, Math, and Words modes. It works with a physical keyboard or on-screen touch keyboard. See [docs/plans/](docs/plans/) for the roadmap.

## Development

The app is plain HTML/CSS/JS with ES modules — no build step, and npm is dev tooling only. **Double-clicking `index.html` will not work**: browsers block ES modules loaded over `file://` (the page detects this and tells you so). Run the local static server from the repo root instead:

```sh
npm run serve
```

Then open `http://localhost:8123/`. Deployment is automatic: GitHub Pages serves `index.html` straight from the `main` branch.

## Testing

```sh
npm install
npx playwright install chromium   # once (CI also installs webkit)
npm test                          # E2E + axe accessibility scans
npm run test:ui                   # Playwright UI mode
```

Tests run on desktop Chromium/WebKit plus Pixel 7 and iPhone 14 emulation; run a subset locally with `npx playwright test --project=chromium --project=mobile-chrome`. CI (GitHub Actions) runs the full matrix on pushes and PRs to `main`.

## Dependencies & licenses

**The deployed site has zero runtime dependencies.** No frameworks, no CDN scripts, no webfonts — plain HTML/CSS/JS served as-is, plus browser built-ins: the Web Speech API for the voice, the Web Audio API for the piano and sound effects, and system emoji for all art.

The dev toolchain (never shipped — npm is dev tooling only):

| Package | Used for | License |
| --- | --- | --- |
| [@playwright/test](https://github.com/microsoft/playwright) | End-to-end tests and device emulation | Apache-2.0 |
| [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm) | Accessibility scans in the test suite (wraps [axe-core](https://github.com/dequelabs/axe-core), MPL-2.0) | MPL-2.0 |
| [typescript](https://github.com/microsoft/TypeScript) | `npm run typecheck` — JSDoc type checking only, no `.ts` files, nothing compiled | Apache-2.0 |
| [@types/node](https://github.com/DefinitelyTyped/DefinitelyTyped) | Type definitions for the dev scripts | MIT |

If a runtime dependency is ever vendored into the repo (see the GitHub Pages constraint in [docs/plans/](docs/plans/)), it gets a row here with its license before it lands.

### A note on the voice

Speech quality is whatever voices the browser exposes — the app ships no speech engine. [js/speech.js](js/speech.js) ranks the available voices by locale fit and quality markers, deterministically, but it can only choose among what the platform hands it:

- **Windows — Edge**: Microsoft's neural "(Natural)" voices. By far the best it sounds.
- **Windows — Chrome / Firefox**: only the old SAPI voices (David/Zira). The robotic one, and not fixable from our side — those browsers aren't given the natural voices.
- **iOS / Android**: decent preloaded voices, though both platforms' `getVoices()` misreports what's installed (see [docs/plans/07-speech-quality.md](docs/plans/07-speech-quality.md)).

Bundling a neural engine is tracked in [P7](docs/plans/07-speech-quality.md) and is not committed to — it would cost 63–92 MB on a child's tablet.
