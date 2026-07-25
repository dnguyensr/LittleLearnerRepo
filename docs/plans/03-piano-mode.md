# P3 — Piano Mode

Goal: a dedicated Piano mode that displays a playable on-screen piano (touch/mouse) and maps the computer keyboard in the standard virtual-piano layout so a real piano player can actually play tunes. The drum sounds (F1–F12 in Free Play) are removed to free those bindings and simplify the audio code.

> **Status (2026-07-25):** implemented (`js/modes/piano.js`, piano voice in `js/audio.js`). Smoke-tested headlessly; remaining unchecked items need a real tablet/ears.

## Remove drums

- [x] Delete `playDrum` and the F1–F12 drum branch in the free-play sound path.
- [x] Update the Free Play instructions text (drums line and mojibake character removed).

## On-screen piano

- [x] Render a piano of 2 octaves + top C (C4–C6) in HTML/CSS: white keys in a flex row, black keys absolutely positioned overlapping; narrow screens (<640px) fall back to one octave (C4–C5) with bigger keys, rebuilt on resize.
- [x] Pointer-events based playing: `pointerdown` starts a note, `pointerup`/`pointercancel` releases it; active pointers tracked by `pointerId`.
- [x] Multi-touch chords on tablets: each pointer tracks its own note (`pointerId` map; implicit touch capture released so pointers roam).
- [x] Glissando: sliding a finger/mouse across keys retriggers notes (`pointerover` while a pointer is down).
- [x] Label each piano key with its mapped computer key, plus note names (C4/C5/C6) on the C keys.
- [x] Highlight keys while active — from touch **and** physical keyboard presses, same `.active` visual state.

## Keyboard mapping (standard virtual-piano convention)

Lower octave (C4–B4) on the bottom letter row, sharps on the home row above; upper octave (C5–E5/…) on the QWERTY row, sharps on the number row:

| Note | C4 | C#4 | D4 | D#4 | E4 | F4 | F#4 | G4 | G#4 | A4 | A#4 | B4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Key | Z | S | X | D | C | V | G | B | H | N | J | M |

| Note | C5 | C#5 | D5 | D#5 | E5 | F5 | F#5 | G5 | G#5 | A5 | A#5 | B5 | C6 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Key | Q | 2 | W | 3 | E | R | 5 | T | 6 | Y | 7 | U | I |

- [x] Implement the mapping table above in `js/modes/piano.js`; keys not in the map do nothing in Piano mode (no wrong-buzz — toddlers will smash).
- [x] Note frequencies from equal temperament: `midiToFreq` in `js/audio.js` (`440 * 2^((midi - 69) / 12)`); verified A4 = 440.

## Piano voice (make it sound like a piano, not a beep)

- [x] Fixed timbre: three layered partials (triangle fundamental + sine 2nd/3rd harmonics, slight detune) through a per-note lowpass filter.
- [x] Envelope: ~8 ms attack, natural decay toward a quiet sustain (`setTargetAtTime`), ~0.2–0.4 s release on key-up (`cancelAndHoldAtTime` where available).
- [x] **Sustain while held**: `keydown`/`pointerdown` starts the note, `keyup`/`pointerup` releases it; keyboard auto-repeat ignored via a held-keys set; per-note voices so releasing one key doesn't cut others.
- [x] Per-note gain nodes summed through a master gain with headroom (master 0.6, per-note peak 0.25).
- [x] Cap simultaneous voices at 10 and steal the oldest, so keyboard smashing can't blow up the audio graph.

## Integration

- [x] Piano registered as a mode (`🎹 Piano` button, generated from the registry); the on-screen QWERTY keyboard and its toggle button are hidden in Piano mode (`setOskLayout(null)`).
- [x] Free Play keeps its simple pop-tones; only Piano mode uses the sustained piano voice (decide later whether Free Play should upgrade to the piano timbre too).
- [ ] Verify on tablet: at least 2 octaves reachable in landscape; portrait falls back to 1 octave with bigger keys. *(code in place; needs a real device — also give the timbre a listen and tune `pianoPartials`/filter to taste)*
