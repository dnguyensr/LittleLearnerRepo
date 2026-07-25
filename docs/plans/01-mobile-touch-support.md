# P1 — Mobile & Touch Input Support

Goal: the app works fully on phone, tablet, laptop, and desktop. Touch users get an on-screen keyboard/number pad; physical-keyboard users lose nothing. All modes route input through one abstraction instead of raw `keydown` handling.

> **Status (2026-07-25):** implemented in `index.html`. Remaining unchecked items are real-device verification (iOS/Android) that can't be done from a desktop.

## Input abstraction

- [x] Create a single input dispatch function (`dispatchKey(key, source)`) that all modes consume; `source` is `'physical' | 'onscreen'`.
- [x] Rewire the existing `handleKeyDown` logic so physical `keydown` events call `dispatchKey` instead of containing mode logic inline (mode logic now lives in `handleFreePlayKey` / `handleWordKey` / `handleMathKey`).
- [x] On-screen keyboard taps call the same `dispatchKey`, so every mode automatically supports touch with no per-mode work.
- [x] Keep swallowing browser shortcuts from physical keys (preventDefault on keydown/keyup/keypress) but do **not** preventDefault on touch events needed for scrolling disabled UI (there should be none — the app is single-screen).

## On-screen keyboard

- [x] Build a toggleable on-screen QWERTY keyboard component (A–Z, 0–9, space) rendered in HTML/CSS at the bottom of the screen.
- [x] Show it by default on coarse-pointer devices (`matchMedia('(pointer: coarse)')`), hidden by default on desktop, with a toggle button (⌨️) in the top bar for both.
- [x] Touch targets at least 48×48 px; keys scale with viewport width; `touch-action: manipulation` on all interactive elements to eliminate double-tap-zoom delay.
- [x] Use `pointerdown` (not `click`) for key taps so response feels instant; support multi-touch (two fingers on two keys = two events, important for Free Play smashing).
- [x] Pressed-state visual feedback on tap and when the matching physical key is pressed (`flashOskKey`).
- [x] On-screen keys must not steal focus or open the OS virtual keyboard (no `<input>` elements; `<button>` with `preventDefault` on pointerdown).

## On-screen number pad

- [x] Math mode shows a large 0–9 number pad (plus a backspace key) instead of relying on physical number keys.
- [x] Reuse the same component styling as the QWERTY keyboard; share the `dispatchKey` path. (Backspace also works from a physical keyboard in Math mode now.)

## Touch-friendly Free Play

- [x] Tapping anywhere on the play area (outside the keyboard/buttons) spawns bubbles/stars and plays a tone at the tap position (`freePlayTapBurst`; pitch maps to horizontal tap position).
- [x] Multi-touch: each simultaneous finger produces its own effect/sound (per-pointer `pointerdown` events).

## Audio on mobile

- [x] Extend the audio-unlock handler (previously `click` only) to `pointerdown` and `touchend` so the Web Audio context resumes on first touch (`unlockAudio`, also called from every `dispatchKey`).
- [ ] Verify sound works on iOS Safari (context starts `suspended`; must resume inside a user gesture) and Android Chrome. *(needs a real device)*

## Responsive layout

- [x] Replace the four fixed-position top-right buttons with a responsive top bar (`#top-bar`) that wraps on narrow screens; mode buttons collapse to icon-only below 640px (`.btn-label` hidden).
- [x] Fix collisions between the title/tagline, key history, and score display on small screens: history/score are now positioned inside the play area below the header; tagline and key history are hidden on narrow viewports.
- [x] Use `100dvh` (with `100vh` fallback) instead of `min-height: 100vh` so mobile browser chrome doesn't cause jumps.
- [x] Prevent scrolling/rubber-banding: `overscroll-behavior: none` on html/body, `touch-action: none` on the play surface.
- [x] Pinch zoom NOT disabled globally (no `maximum-scale`); accidental-zoom prevention via `touch-action` only.
- [ ] Test portrait and landscape on phone-sized (≈375×667) and tablet-sized (≈768×1024) viewports. *(do as part of P5 Playwright device projects, plus a real-device pass)*

## Mobile-hostile behaviors to remove or soften

- [x] Remove the `beforeunload` blocker (showed confusing dialogs; ignored/broken on mobile browsers).
- [x] Remove the `window.blur → window.focus()` trap; it fights mobile task switching and does nothing useful on touch devices.
- [x] Keep `contextmenu` suppression and add `-webkit-touch-callout: none` / `-webkit-user-select: none` for iOS long-press.
  - [ ] Verify long-press behavior on a real iOS device.
- [x] Fullscreen button degrades gracefully: hidden entirely when `requestFullscreen` is unavailable (iPhone Safari).
