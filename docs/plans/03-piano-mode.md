# P3 — Piano Mode

Goal: a dedicated Piano mode that displays a playable on-screen piano (touch/mouse) and maps the computer keyboard in the standard virtual-piano layout so a real piano player can actually play tunes. The drum sounds (F1–F12 in Free Play) are removed to free those bindings and simplify the audio code.

## Remove drums

- [ ] Delete `playDrumSound` and the F1–F12 drum branch in the free-play sound path.
- [ ] Update the Free Play instructions text (it currently advertises "F1-F12 keys = 🥁 Drums!" and contains a mojibake character `�` to clean up).

## On-screen piano

- [ ] Render a piano of at least 1.5–2 octaves (C4 through E5 minimum; extend to C6 on wide screens) in HTML/CSS: white keys in a flex row, black keys absolutely positioned overlapping.
- [ ] Pointer-events based playing: `pointerdown` starts a note, `pointerup`/`pointercancel`/`pointerleave` releases it; track active pointers per key.
- [ ] Multi-touch chords on tablets: multiple simultaneous pointers each sound their own note (`setPointerCapture` per key, or track by `pointerId`).
- [ ] Optional glissando: sliding a finger across keys retriggers notes (nice-to-have; behind the same pointer tracking).
- [ ] Label each piano key with its mapped computer key (and note name, e.g. "C" on the C keys) so the mapping teaches itself.
- [ ] Highlight keys while active — from touch **and** from physical keyboard presses, using the same visual state.

## Keyboard mapping (standard virtual-piano convention)

Lower octave (C4–B4) on the bottom letter row, sharps on the home row above; upper octave (C5–E5/…) on the QWERTY row, sharps on the number row:

| Note | C4 | C#4 | D4 | D#4 | E4 | F4 | F#4 | G4 | G#4 | A4 | A#4 | B4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Key | Z | S | X | D | C | V | G | B | H | N | J | M |

| Note | C5 | C#5 | D5 | D#5 | E5 | F5 | F#5 | G5 | G#5 | A5 | A#5 | B5 | C6 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Key | Q | 2 | W | 3 | E | R | 5 | T | 6 | Y | 7 | U | I |

- [ ] Implement the mapping table above in `js/modes/piano.js`; keys not in the map do nothing in Piano mode (no wrong-buzz — toddlers will smash).
- [ ] Note frequencies from equal temperament: `freq = 440 * 2^((midi - 69) / 12)` — replace any use of the ad-hoc `notes` array in this mode.

## Piano voice (make it sound like a piano, not a beep)

- [ ] Fixed timbre (no more random sine/square/triangle per key): layered oscillators (e.g. fundamental + softer harmonics, slight detune) or a periodic wave, through a lowpass filter.
- [ ] Proper ADSR envelope: fast attack (~5 ms), natural decay, sustain while held, ~0.2–0.4 s release on key-up.
- [ ] **Sustain while held**: `keydown`/`pointerdown` starts the note, `keyup`/`pointerup` releases it. Ignore keyboard auto-repeat (`e.repeat`). Track held notes so releasing one key doesn't cut others.
- [ ] Per-note gain nodes summed through a master gain with headroom (e.g. master ~0.5, per-note ~0.2) so chords don't clip.
- [ ] Cap simultaneous voices (e.g. 10) and steal the oldest, so keyboard smashing can't blow up the audio graph.

## Integration

- [ ] Add Piano as a registered mode (`🎹 Piano` button) via the P2 mode registry; on-screen QWERTY keyboard from P1 is hidden in Piano mode (the piano itself is the touch surface).
- [ ] Free Play keeps its simple pop-tones; only Piano mode uses the sustained piano voice (decide later whether Free Play should upgrade to the piano timbre too).
- [ ] Verify on tablet: at least 2 octaves reachable in landscape; portrait falls back to 1 octave with bigger keys.
