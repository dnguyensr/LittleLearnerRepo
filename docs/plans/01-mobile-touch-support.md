# P1 — Mobile & Touch Input Support

Goal: the app works fully on phone, tablet, laptop, and desktop. Touch users get an on-screen keyboard/number pad; physical-keyboard users lose nothing. All modes route input through one abstraction instead of raw `keydown` handling.

## Input abstraction

- [ ] Create a single input dispatch function (e.g. `dispatchKey({ key, source })`) that all modes consume; `source` is `'physical' | 'onscreen' | 'pointer'`.
- [ ] Rewire the existing `handleKeyDown` logic so physical `keydown` events call `dispatchKey` instead of containing mode logic inline.
- [ ] On-screen keyboard taps call the same `dispatchKey`, so every mode automatically supports touch with no per-mode work.
- [ ] Keep swallowing browser shortcuts from physical keys (preventDefault on keydown/keyup/keypress) but do **not** preventDefault on touch events needed for scrolling disabled UI (there should be none — the app is single-screen).

## On-screen keyboard

- [ ] Build a toggleable on-screen QWERTY keyboard component (A–Z, 0–9, space) rendered in HTML/CSS at the bottom of the screen.
- [ ] Show it by default on coarse-pointer devices (`@media (pointer: coarse)` / `matchMedia`), hidden by default on desktop, with a toggle button (⌨️) in the top bar for both.
- [ ] Touch targets at least 48×48 px; keys scale with viewport width; `touch-action: manipulation` on all interactive elements to eliminate double-tap-zoom delay.
- [ ] Use `pointerdown` (not `click`) for key taps so response feels instant; support multi-touch (two fingers on two keys = two events, important for Free Play smashing).
- [ ] Pressed-state visual feedback on tap and when the matching physical key is pressed.
- [ ] On-screen keys must not steal focus or open the OS virtual keyboard (no `<input>` elements; use `<button>` with `preventDefault` on pointerdown as needed).

## On-screen number pad

- [ ] Math mode shows a large 0–9 number pad (plus a backspace/clear key) instead of relying on physical number keys.
- [ ] Reuse the same component styling as the QWERTY keyboard; share the `dispatchKey` path.

## Touch-friendly Free Play

- [ ] Tapping anywhere on the play area (outside the keyboard/buttons) spawns bubbles/stars and plays a tone at the tap position — so a phone with the on-screen keyboard hidden is still a "smasher".
- [ ] Multi-touch: each simultaneous finger produces its own effect/sound.

## Audio on mobile

- [ ] Extend the audio-unlock handler (currently `click` only) to `pointerdown` and `touchend` so the Web Audio context resumes on first touch.
- [ ] Verify sound works on iOS Safari (context starts `suspended`; must resume inside a user gesture) and Android Chrome.

## Responsive layout

- [ ] Replace the four fixed-position top-right buttons with a responsive top bar that wraps or collapses on narrow screens (mode buttons are icon-first with labels hidden on small widths).
- [ ] Fix collisions between the title/tagline (top-left), key history, and score display on small screens; consider hiding key history on very narrow viewports.
- [ ] Use `100dvh` (with `100vh` fallback) instead of `min-height: 100vh` so mobile browser chrome doesn't cause jumps.
- [ ] Prevent scrolling/rubber-banding: `overscroll-behavior: none`, `position: fixed` body or `touch-action: none` on the play surface as appropriate.
- [ ] Add `maximum-scale=1` alternatives carefully — do **not** disable pinch zoom globally (accessibility); prevent accidental zoom via `touch-action` instead.
- [ ] Test portrait and landscape on phone-sized (≈375×667) and tablet-sized (≈768×1024) viewports.

## Mobile-hostile behaviors to remove or soften

- [ ] Remove the `beforeunload` blocker (it shows confusing dialogs and is ignored/broken on mobile browsers). If a "toddler lock" is desired, fullscreen mode already covers most of it.
- [ ] Remove the `window.blur → window.focus()` trap; it fights mobile task switching and does nothing useful on touch devices.
- [ ] Keep `contextmenu` suppression (long-press menu) on the play surface — verify long-press on iOS doesn't trigger text selection callout (`-webkit-touch-callout: none`).
- [ ] Verify the Fullscreen button: hide or degrade gracefully on iPhone Safari where `requestFullscreen` is unavailable.
