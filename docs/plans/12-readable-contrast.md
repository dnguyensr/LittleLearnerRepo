# P12 — Readable at every background, audible at every mode change

> **Status (2026-09-03): Implemented.** Takes over the two open accessibility items
> in [05-testing-tooling.md](05-testing-tooling.md) — colour contrast and live
> regions — because both turned out to be product decisions rather than test
> configuration.

## The problem

Every module paints white text straight onto `document.body`'s gradient, and
[`randomBackground()`](../../js/effects.js) reassigns that gradient at random on
almost every keypress. The `color-contrast` axe rule was disabled in
`tests/a11y.spec.js` while a design pass was pending, so nothing caught what the
palette actually does.

Measured with `node tools/contrast.js` against the shipped palette: **83 of 90
text-on-gradient combinations fail**, most of them not marginally.

| Gradient stop | White text | Needs |
| --- | --- | --- |
| `#ffecd2` | 1.16:1 | 4.5:1 |
| `#89f7fe` | 1.25:1 | 4.5:1 |
| `#fecfef` | 1.36:1 | 4.5:1 |
| `#fcb69f` | 1.70:1 | 4.5:1 |
| `#667eea` (the default) | 3.66:1 | 4.5:1 |

At 1.2:1 white text is not "hard to read", it is invisible. And because the
background is re-rolled per keypress, a child counting objects can have the
numeral vanish mid-activity through no action of their own. This is the app's
largest quality defect and it affects every child on every screen, not only
users of assistive technology.

A second, smaller defect sits next to it: `setMode()` in `js/main.js` swaps the
entire screen and updates `#instructions`, which has no live region. To a screen
reader, changing mode is silent.

## What was considered

- **A scrim behind the learning containers.** Measured first, because it would
  keep the pastel palette. To bring `#ffecd2` to 4.5:1 the scrim has to reach
  roughly 55% black, which makes the panel darker than simply using a darker
  colour — and it does nothing for `#app-title`, `#tagline` or `#instructions`,
  which sit outside the play area on the raw gradient.
- **Keep the pastels, switch to dark text.** Genuinely viable and would preserve
  the light, airy look, but it inverts the design language of every module,
  every button, the piano and both on-screen keyboards.
- **Deepen the palette** *(chosen)*. Ten gradients whose every stop clears
  4.5:1 against white. It is a small, contained change, it fixes the top bar and
  the instructions line as well as the play area, and the existing white-on-
  colour design language survives intact.

The cost is honest and worth stating: the app moves from pastel to jewel tones.
It is still bright and still changes colour on every press; it is no longer
pale.

## Decisions

- [x] Replace the palette in `js/effects.js` with ten gradients whose every stop
      reaches at least 4.5:1 against white. Keep ten distinct entries — the old
      list repeated `#667eea → #764ba2` twice, which quietly double-weighted it.
- [x] Update the `body` default background in `css/styles.css` to match the new
      first entry, so the first paint and the first keypress agree.
- [x] Make `#tagline` and `#instructions` solid white. At `rgba(255,255,255,0.7)`
      they fail even against the darkest gradient in the new palette; translucent
      white over a gradient is the wrong tool for de-emphasis. They stay
      de-emphasised by size and weight instead.
- [x] Re-enable the `color-contrast` axe rule in `tests/a11y.spec.js`. It
      surfaced nothing, and that is the finding, not a clean bill of health: axe
      returns *incomplete* for text over a gradient, 14 nodes on the default
      screen alone. The rule is on so it can catch opaque panels; it never could
      have caught this palette.
- [x] Convert every translucent **white** panel that carries white text to a
      **dark** one. A white wash lightens the background while the text stays
      white, so it lowers contrast on every gradient — the app's lightest stop
      was at 3.97:1 behind even the faintest 0.12 wash. Nineteen rules changed.
- [x] Replace `#4CAF50` and `rgba(244,67,54,…)` with `#2e7d32` and `#b3261e`.
      The old green gave white text 3.46:1 at best, and it was used
      translucently, which made it worse.

## Why a tool as well as axe

axe can only judge the gradient that happens to be showing when it scans, and
the palette is random. `tools/contrast.js` checks every stop in the palette
against every text treatment painted onto it, deterministically, and exits
non-zero on failure.

- [x] Ship `tools/contrast.js`.
- [x] Assert the palette from a spec too, by importing `js/effects.js` in the
      page the way `tests/emoji-roles.spec.js` imports the content modules, so a
      new gradient cannot be added without the suite noticing.
- [x] Wire it into `npm run` scripts and CI.

## Mode changes must be announced

- [x] Give `#instructions` `role="status"` and `aria-live="polite"` so switching
      mode announces the new mode's instruction line.
- [x] Keep the mode buttons' existing `aria-pressed` state; the live region
      describes what changed, the buttons describe what is selected.
- [x] Cover it with a test that asserts the attributes and that the text changes
      on a mode switch.

## Acceptance coverage

- [x] `node tools/contrast.js` passes on the shipped palette.
- [x] A spec fails if any gradient stop in `js/effects.js` drops below 4.5:1.
- [x] The `color-contrast` axe rule is enabled and every mode scan passes with it
      on, in all four browser projects.
- [x] `#instructions` is a polite live region and its text changes per mode.
- [x] Every existing behavioural, layout, speech and reduced-motion test still
      passes — this is a presentation change and must alter no behaviour.

## Follow-on observations

- Watch whether the deeper palette reads as less playful to a child. If it does,
  the next move is the light-palette-with-dark-text option, which is a larger
  change but keeps the pastels.
- The celebration particles and the bubble colours were tuned against the pastel
  palette; check they still read against jewel tones.
- Re-check contrast if any module ever paints text on its own translucent panel
  rather than on the gradient.
