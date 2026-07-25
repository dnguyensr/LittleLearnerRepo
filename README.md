# LittleLearnerRepo

brought to you by an idea, built by iterative prompts, possibly marginally functional, fully ai slop

Little Learner Keys is a GitHub Pages web app for toddlers (pre-K–1st grade) with Free Play, Math, and Words modes. It works with a physical keyboard or on-screen touch keyboard. See [docs/plans/](docs/plans/) for the roadmap.

## Development

The app is plain HTML/CSS/JS with ES modules — no build step. Because browsers block ES modules over `file://`, run a local static server from the repo root:

```sh
python -m http.server 8000
# or
npx serve
```

Then open `http://localhost:8000/`. Deployment is automatic: GitHub Pages serves `index.html` straight from the `main` branch.
