# P16 — Rebrand to Edamame

> **Status (2026-09-04): Implemented, with two items carried.** The product
> outgrew its name: eight modes shipped while the name, tagline and icon still
> sold a keyboard smasher. Renaming the storage prefix was folded in because
> pre-release was the last moment it was free. The GitHub repo rename and the
> on-device install check are the two things this commit cannot do for itself.

## Why the old name no longer fitted

The app was already half-renamed — "Little Learner **Keys**", not "Keyboard" —
but three surfaces still framed the whole product as key-mashing:

| Surface | Was | Problem |
| --- | --- | --- |
| `#tagline` | "The marginally educational keyboard smasher" | True and funny once. The app now ships handwriting stroke order (P13), conservation of number (P11), ten frames, grapheme tiles (P10) and no-wrong-answer pattern extension (P14). The tagline talked a caregiver *out* of the app at the moment they decided whether to hand over the tablet. |
| `#app-title` | `🎹 Little Learner Keys` | Piano is 1 of 8 modes. |
| `#keyboard-btn` | In the top bar | Implied the keyboard framed every mode. See Phase 3 — this one did not survive contact. |

Missing entirely: favicon, `meta description`, Open Graph tags, web manifest.
There was no home-screen icon for an app whose primary target is a tablet.

## The name

**Edamame**, with a descriptor lockup rather than as a standalone word.

Why it held up better than the alternatives considered and dropped (Little
Learner Lab, Lilypad, Squiggle, Pipkin, Tinkerpin):

- **It starts with "Ed."** A hidden affordance for an education product —
  noticed a beat after hearing it, which is what makes a name stick.
- **The metaphor is the architecture.** A pod with beans inside is eight modes
  under one shell, and it scales when a ninth lands from
  [04-learning-modules.md](04-learning-modules.md).
- **Countable objects are the pedagogy.** P09 and P11 are built on touchable
  things a child counts and rearranges. Beans in a pod *are* that.
- **Arbitrary means ownable.** Descriptive names in this category are
  exhausted; "Little Learner Lab" and "Lilypad" were both already taken.

### Collision research (2026-09-04, web search — not a registry search)

| Finding | Class | Verdict |
| --- | --- | --- |
| [EDAMAME Technologies](https://www.edamame.tech) — endpoint security, iOS + Play apps, GitHub org, funded | 9 (software) | Real, but a different field. Styles itself all-caps. Will outrank us in app-store search. |
| `edamame.com` — active MT5 gold-trading SaaS | — | The bare `.com` is unobtainable, not parked. |
| `edamame.agency`, `edamame.site` | — | Live, unrelated. |
| "Edamame" restaurant-ordering app (UK App Store); 2016 board game | 9 / 28 | Negligible. |
| *Keiko the Edamame* teether (Oli&Carol) and edamame fidget toys | 28 (toys) | No conflict, and a mild **asset** — the pod already reads as a friendly character in the toddler market. |
| USPTO reg #6691736 (Changsha Maodou Trade Co.) | Lubricants and fuel | Irrelevant. |
| **Children's education software** | 9 / 41 | **Clear. Nothing owns this name in our category.** |

- [ ] **Carried.** Before any public claim to the name, confirm with a direct
      TSDR search rather than the web search above, and check registrar
      availability for `edamame.app` / `edamameplay.com`. WHOIS was not run.

### Naming decisions

- [x] **Display name: `Edamame`**, in the H1, `<title>` and prose.
- [x] **Tagline: "Letters, numbers, and sounds to play with."** Chosen from the
      three candidates; it replaces the smasher joke with something a caregiver
      can act on.
- [x] **Technical handles compound** so we never compete head-on with a funded
      security company: `edamame-play` for the npm `name` and the repo.

## Storage keys — clean break while we still could

**Decision (2026-09-04): `lls-` renamed to `edamame-`, no migration shim.** The
app is pre-release with no installed base, so the usual objection — that
renaming keys silently wipes a child's saved work — did not apply yet. It stops
being free the moment anyone else is running this.

### Why `edamame-` and not `eda-`

GitHub Pages project sites all live under `dnguyensr.github.io`, and origin is
scheme + host + port — **the path does not scope storage.** Every project site
on this account shares one `localStorage`. A terse prefix invites a silent
collision with a future project; `edamame-` cannot. It also reads as itself in
devtools, which `lls-` never did.

- [x] All eight keys renamed across the 11 modules that write them and the 10
      spec files that read them: `edamame-settings`, `edamame-score-<modeId>`,
      `edamame-mathlab-progress`, `edamame-numbers-progress`,
      `edamame-patterns-progress`, `edamame-words-progress` and the four
      `edamame-*-progress-reset` confirmations.
- [x] Mode ids unchanged. The coupling in `edamame-score-<modeId>` is to the
      *suffix*; the prefix swap does not touch it.
- [x] No back-compat shim. A pre-release profile carrying `lls-*` keys is
      ignored and falls back to defaults, which is the correct behaviour.
- [x] The key names in `TECHNICAL_README.md` and in plans P04, P06, P10 and P11
      updated too, so those records still describe what the code does.
- [ ] **Carried.** Clear the stale `lls-*` keys from the observation devices by
      hand — nothing in the app will do it, and they sit in a shared origin.

## Phase 1 — Name and voice

- [x] `index.html` — `<title>`, `#app-title`, `#tagline`, and the `file://`
      help block's heading and body text.
- [x] `package.json` — `name`, `description`, plus a new `icons` script.
- [x] `tools/serve.js` — startup banner.
- [x] `README.md` — title, intro, Try-it link, closing project line.
- [x] `TECHNICAL_README.md` — title and intro.
- [x] `docs/plans/README.md` — roadmap title and intro.

`#app-title` and `#tagline` are ids, not content, so `css/styles.css` needed no
change. No test asserted the app name — `file-protocol.spec.js` matches
`#file-protocol-help` by id — so this phase was test-safe by inspection, and was.

Two "keyboard smasher" mentions deliberately survive, in
[15-keyboard-access.md](15-keyboard-access.md) and `js/input.js`. Both describe
what Free Play actually is, which has not changed. They are not brand copy.

## Phase 2 — The identity that did not exist

- [x] `assets/favicon.svg` — a pod at 45° with three beans. SVG so it renders
      at any size without a raster set.
- [x] `manifest.json` — `short_name: "Edamame"`, `display: standalone`,
      relative `start_url`/`scope` per the Pages constraint, 192 and 512 icons
      plus a maskable 512.
- [x] `apple-mobile-web-app-*` meta and `apple-touch-icon` — Safari ignores the
      manifest when adding to the home screen, and will not take an SVG.
- [x] `meta name="description"` and Open Graph title/description/image/url.
- [x] **`theme_color` is `#2e7d32`** — not a fresh choice by eye, but the
      confirm/active green already validated against white text in
      `tools/contrast.js`. It reports 5.13:1. P12 exists because colours here
      were picked badly once.
- [x] `tools/icons.js` renders the PNGs procedurally from the same geometry as
      the SVG, 4× supersampled, with a hand-rolled PNG encoder. Committing
      binaries nobody can regenerate was the alternative. `npm run icons`.

## Phase 3 — Fixing what the old name encoded

- [x] **Mode buttons reordered** to `Letters, Numbers, Words, Patterns, Math,
      Piano, Free Play`, so a grown-up sizing the app up meets the learning
      modes first. Free Play is still `defaultModeId` and still where tapping
      an active mode's button returns to; only the button order moved.
- [x] `keyboard.spec.js`'s tab-order walk now starts at `#letters-btn` and
      looks for `#free-btn`, since Free Play is no longer the first button.
- [ ] **Attempted and reverted: moving the keyboard toggle out of the top bar.**
      Putting it in its own row above the OSK cost ~54px of vertical space and
      broke five mobile-Safari fit tests — `numbers.spec.js` (the nine-object
      set), the three `mathlab-fit.spec.js` rung checks, and `learning.spec.js`
      replay controls. The child's activity has to fit on the device before the
      information architecture is tidy, which is what the toddler-first rules
      in the roadmap say. It stays in the top bar, where it already sat between
      the modes and the grown-up controls rather than among them. A version
      that costs no vertical space is a real design problem, not a move.
- [x] H1 emoji is a fixed 🫛, not one that rotates per mode. Rotating remains
      an option; a stable mark is the safer default for a page a caregiver is
      learning to recognise.

## Phase 4 — Repo and deployment

- [x] Pages URL updated in `README.md` and the served-path note in
      [02-refactor-es-modules.md](02-refactor-es-modules.md), and the absolute
      Open Graph URLs in `index.html`, all to `/edamame-play/`.
- [ ] **Carried, and must be done by hand.** Rename the GitHub repo
      `LittleLearnerRepo` → `edamame-play`. **Until that happens the links
      above 404**, because they now name a repo that does not exist yet.
      GitHub redirects the old URL once renamed, and the P02 relative-path
      discipline means the app itself survives the move.
- [x] `.github/workflows/ci.yml` contains no name references — nothing to do.
- [x] `.claude/settings.local.json` holds absolute local paths; left alone.

## Acceptance coverage

- [x] `grep -riE "little learner|keyboard smasher"` returns only the two
      deliberate Free Play descriptions named in Phase 1.
- [x] `grep -rn "lls-"` returns nothing outside this plan.
- [x] `npm run typecheck`, `npm run lint` and `npm run contrast` pass.
- [x] Full Playwright run: **946 passed, 30 skipped, 0 failed** across all four
      browser projects, including the specs that seed storage directly.
- [x] `manifest.json`, `favicon.svg` and all three PNGs return 200 with correct
      content types; no console errors and no 4xx on load.
- [x] Button order verified in the running app:
      `letters → numbers → words → patterns → mathlab → piano → free →
      keyboard → fullscreen → settings`.
- [ ] **Carried.** Install to an iOS home screen and confirm the icon, name and
      standalone display on the real device. WebKit under Playwright does not
      cover home-screen install.

## Follow-on observations

- The Open Graph image is currently `icon-512.png`, a square icon standing in
  for a 1200×630 banner. It will letterbox in an unfurl. A designed banner with
  the wordmark is wanted, and `tools/icons.js` cannot draw text.
- Whether the descriptor lockup belongs in the H1 permanently or only on first
  run — it is caregiver-facing text sitting in a child-facing UI.
- Whether a pod-of-beans motif should replace the per-mode button emoji, or
  whether that trades recognisable icons for brand consistency at the child's
  expense. The toddler-first rules say the child wins.
- `npx prettier --check .` fails on 73 files, and failed on 78 before this
  work. It is pre-existing debt, CI does not run it, and fixing it here would
  have buried the rename in an unrelated diff.
- Whether "Edamame" is ever spoken aloud by `speech.js`. Probably not — it is a
  caregiver-facing word, and P07 voice selection is hard enough without a
  loanword.
