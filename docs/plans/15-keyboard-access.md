# P15 — Keyboard access without giving up the kiosk

> **Status (2026-09-03): Implemented.** Takes over the keyboard/focus
> item left open in [05-testing-tooling.md](05-testing-tooling.md), which
> correctly noted it "needs a deliberate design" rather than a fix.

## What is actually broken

Measured, not inferred:

| Check | Result |
| --- | --- |
| Tab from `<body>`, five presses | focus never leaves `<body>` |
| Tab inside Patterns, twelve presses | focus never leaves the mode button |
| Enter on a focused `.count-object` | nothing; the object is not counted |
| Space on a focused `.count-object` | nothing |
| Keys delivered to any other listener | none — the list is empty |
| Tab inside the grown-up panel | works |
| `:focus-visible` ring on `.count-object` | present, 4px, and it matches |

So: **no interactive element in the play area can be reached or activated by a
keyboard.** Not the mode buttons, not the on-screen keyboard, not a pattern
choice, not a tracing waypoint, not a Math Lab manipulative. Even `F5` and
`Escape` are swallowed. The one island that works is the grown-up panel, because
`handleKeyDown` returns early while it is open.

The focus styling is already right — the rings exist and `:focus-visible`
matches. Nothing is reachable to show them on.

This predates the recent work, but it now matters much more: P11, P13 and P14
added roughly forty new interactive elements across Numbers, Letters and
Patterns. Code comments added with them claim the objects are "keyboard- and
screen-reader-operable for free". The screen-reader half is true. The keyboard
half is not, and those comments are wrong as written — correcting them is part
of this work.

## The tension this has to resolve

`js/input.js` swallows every keydown on purpose, and the reason is good: this is
an app for a toddler who will hold down keys, mash whole rows, and find `F5`,
`Escape`, `Alt` and the Windows key without trying. Letting keys through means
letting a two-year-old reload the page, leave it, or open browser chrome
mid-activity.

At the same time Free Play is *literally* a keyboard smasher — every key is
content — and Letters, Numbers, Math Lab and Words all use letter, digit, Enter
and Backspace keys as their input. So "stop swallowing keys" is not available
either.

The two requirements are in direct conflict and any compromise that half-serves
both will be bad at both. What is needed is a rule that says, unambiguously,
which of the two is in force at any moment.

## Options considered

- **Let the focus keys through unconditionally.** Simple, but `Space` is a Free
  Play key and `Enter` is Math Lab's submit, so the same press would mean two
  things with no way to tell which.
- **A keyboard-access setting in the grown-up panel, off by default.** Clean
  separation, but it strands the person it is for: you cannot reach the settings
  button to switch it on without a keyboard. Chicken and egg.
- **A secret escape-hatch chord** (`Ctrl+Alt+K` or similar). Solves the
  chicken-and-egg, but nobody will ever discover it.
- **Route by focus** *(recommended)*. See below.

## The rule: route by focus

One sentence: **if focus is on a control, the keyboard drives the control; if
focus is on the page, the keyboard drives the mode.**

"Focus" here means *keyboard* focus, and deciding that turned out to be the
whole difficulty — see the build notes below.

- [x] `Tab` and `Shift+Tab` always move focus and are **never** routed to the
      mode. This is the signal that someone is navigating by keyboard, it is
      what browsers already use to decide `:focus-visible`, and the worst a
      toddler can do with it is make a focus ring appear.
- [x] While focus is inside an interactive control, `Enter` and `Space` activate
      that control and are not routed to the mode.
- [x] While focus is on `<body>` or the play area — the normal case, and where a
      toddler always is — behaviour is exactly as it is today: everything is
      swallowed and routed to `onKey`. Free Play keeps every key including
      `Space`; Math Lab keeps `Enter`.
- [x] `Escape` blurs back to the page, which is the way out of keyboard mode and
      back to kiosk behaviour. It continues to close the grown-up panel when the
      panel is open.
- [x] Everything else stays swallowed always: `F5`, `Backspace`'s browser
      default, function keys, the lot. The kiosk intent is preserved for every
      key that is not part of moving or using focus.

The cost, stated plainly: `Tab` stops being a Free Play key. It currently
displays `⇥`. That is a real if small loss, and it is the price of the signal.

## Focus order has to be curated

Making Tab work is not enough if it walks through fifty things.

- [x] Give the on-screen keyboard `tabindex="-1"` on its keys. The OSK is a
      *substitute* for a keyboard; a keyboard user does not need to tab through
      thirty of them to reach the play area. It stays fully operable by pointer.
- [x] Check the resulting tab order per mode and make sure it reads top bar →
      play area → instructions, not something arbitrary.
- [x] Letters' tracing already does the right thing by accident and should keep
      doing it: only the active waypoint is enabled, and disabled buttons are
      not focusable, so `Tab` lands on exactly the dot the child needs.
- [x] Numbers presents up to nine tappable objects. Nine tab stops is the
      activity, not a problem, and they stay.

## Focus rings are missing on about half the app

The rings that exist are good. These have none and need them, to the same 4px
`#ffeb3b` pattern already used elsewhere:

- [x] `.top-btn` — every mode button, plus Keyboard, Fullscreen and Grown-ups
- [x] `.osk-key` (still needed for pointer-focus, even with `tabindex="-1"`)
- [x] `.piano-key`
- [x] `.speak-btn`, `.reset-btn`, `.math-path-card`, `.lab-check`
- [x] `#letter-make-btn`, `#letter-watch-btn` — the existing rule names only
      `#letter-sound-btn`
- [x] The Math Lab manipulatives: `.tf-cell`, `.nl-tick`, `.ol-stop`, `.ol-hop`,
      `.dot`, `.nb-part`, `.eater-btn`

## Corrections to make alongside

- [x] `js/modes/numbers.js`, `js/modes/letters.js` and
      `js/math/manipulatives.js` each claim that using a real `<button>` makes
      the element "keyboard-operable for free". Rewrite these to say what is
      true: a real button is what makes keyboard operation *possible*, and P15
      is what makes it *work*.

## Acceptance coverage

- [x] `Tab` from a fresh load reaches the top bar, then the play area, in every
      mode.
- [x] `Enter` and `Space` activate a focused control in Numbers, Letters,
      Patterns, Words and Math Lab, and do the same thing the pointer does.
- [x] With focus on the page, Free Play still receives `Space` and Math Lab
      still receives `Enter` — the existing contracts do not change.
- [x] `Escape` returns focus to the page and restores kiosk routing.
- [x] `F5` and the other swallowed keys stay swallowed in both states.
- [x] The on-screen keyboard is not in the tab order but is still fully usable
      by pointer.
- [x] Every interactive element shows a visible focus ring when focused by
      keyboard.
- [x] A full keyboard-only pass through each mode completes its core activity —
      count a set, make a letter, finish a pattern, answer a Math Lab problem,
      build a word.
- [x] The grown-up panel keeps working exactly as it does now.
- [x] Serious/critical axe checks still pass, on all four browser projects.

## Notes from the build

- **Focus alone is not the signal.** Tapping a mode button leaves focus on it,
  so a plain focus check made the next physical Enter re-trigger that button
  instead of submitting a Math Lab answer. Eight existing Math Lab tests caught
  it, which is exactly what they are for.
- **`:focus-visible` is not the signal either**, though it looks like exactly
  the right tool. This app calls `preventDefault()` on nearly every key, but the
  digits a child types still count as keyboard interaction to the browser, so
  the mode button they last tapped starts matching `:focus-visible` and swallows
  the following Enter. The browser heuristic answers a slightly different
  question than the one being asked.
- So the state is tracked explicitly: **Tab turns keyboard navigation on, any
  pointer interaction turns it off.** Deterministic, and it means a child who
  taps is always in kiosk mode by construction.
- `transition: all` on `.top-btn` and `.math-emoji` was animating the focus ring
  in from zero width, because `all` includes `outline-width`. A focus indicator
  has to be instant; both are now explicit property lists.
- Taking the on-screen keyboard out of the tab order leaves nothing tabbable
  after the play area, so a Tab following a click in the play area exits to the
  browser. That is ordinary browser behaviour and not worth fighting, but it is
  why the tests start their walk from a known control.

## Follow-on observations

- Whether a switch-access or single-button user is served by this. Route-by-focus
  is the precondition for that but probably not the whole answer.
- Whether `Escape` is discoverable as the way back, or whether the app should
  drop out of keyboard mode on the next pointer interaction as well.
- Whether the tab order inside Math Lab's larger manipulatives (base-ten blocks,
  bar models) needs grouping rather than a flat walk.
