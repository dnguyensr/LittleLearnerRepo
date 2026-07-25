# LittleLearnerRepo

brought to you by an idea, built by iterative prompts, possibly marginally functional, fully ai slop

Little Learner Keys is a GitHub Pages web app for toddlers (pre-K–1st grade) with Free Play, Math, and Words modes. It works with a physical keyboard or on-screen touch keyboard. See [docs/plans/](docs/plans/) for the roadmap.

## Development

The app is plain HTML/CSS/JS with ES modules — no build step, and npm is dev tooling only. Because browsers block ES modules over `file://`, run the local static server from the repo root:

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
