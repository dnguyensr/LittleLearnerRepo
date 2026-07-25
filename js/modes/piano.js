import { startPianoNote, stopPianoNote, stopAllPianoNotes } from '../audio.js';
import { setScoreVisible } from '../effects.js';

const pianoContainer = document.getElementById('piano-container');
const pianoEl = document.getElementById('piano');

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Standard virtual-piano mapping: bottom letter row = white keys C4-B4 with
// sharps on the home row; QWERTY row = C5-C6 with sharps on the number row.
const KEY_MAP = [
    { midi: 60, key: 'Z' }, { midi: 61, key: 'S' }, { midi: 62, key: 'X' }, { midi: 63, key: 'D' },
    { midi: 64, key: 'C' }, { midi: 65, key: 'V' }, { midi: 66, key: 'G' }, { midi: 67, key: 'B' },
    { midi: 68, key: 'H' }, { midi: 69, key: 'N' }, { midi: 70, key: 'J' }, { midi: 71, key: 'M' },
    { midi: 72, key: 'Q' }, { midi: 73, key: '2' }, { midi: 74, key: 'W' }, { midi: 75, key: '3' },
    { midi: 76, key: 'E' }, { midi: 77, key: 'R' }, { midi: 78, key: '5' }, { midi: 79, key: 'T' },
    { midi: 80, key: '6' }, { midi: 81, key: 'Y' }, { midi: 82, key: '7' }, { midi: 83, key: 'U' },
    { midi: 84, key: 'I' }
];

const keyToMidi = {};
for (const entry of KEY_MAP) {
    keyToMidi[entry.key] = entry.midi;
}

const midiToEl = new Map();
const heldKeys = new Set();
const pointerNotes = new Map();
let active = false;
let builtKeyCount = 0;

function isBlack(midi) {
    return [1, 3, 6, 8, 10].includes(midi % 12);
}

function noteName(midi) {
    return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

function visibleKeys() {
    // Narrow screens get one octave (C4-C5) with bigger keys
    return window.innerWidth < 640 ? KEY_MAP.filter(k => k.midi <= 72) : KEY_MAP;
}

function buildPiano() {
    const keys = visibleKeys();
    if (keys.length === builtKeyCount) return;
    builtKeyCount = keys.length;

    stopAllPianoNotes();
    pointerNotes.clear();
    heldKeys.clear();
    pianoEl.innerHTML = '';
    midiToEl.clear();

    const whiteCount = keys.filter(k => !isBlack(k.midi)).length;
    const blackWidth = (100 / whiteCount) * 0.62;
    let whiteIndex = -1;

    for (const k of keys) {
        const black = isBlack(k.midi);
        if (!black) whiteIndex++;

        const el = document.createElement('div');
        el.className = 'piano-key ' + (black ? 'black' : 'white');
        el.dataset.midi = k.midi;

        if (black) {
            el.style.width = blackWidth + '%';
            el.style.left = ((whiteIndex + 1) / whiteCount * 100) + '%';
        }

        if (!black && k.midi % 12 === 0) {
            const noteLabel = document.createElement('span');
            noteLabel.className = 'note-label';
            noteLabel.textContent = noteName(k.midi);
            el.appendChild(noteLabel);
        }

        const kbLabel = document.createElement('span');
        kbLabel.className = 'kb-label';
        kbLabel.textContent = k.key;
        el.appendChild(kbLabel);

        pianoEl.appendChild(el);
        midiToEl.set(k.midi, el);
    }
}

function noteOn(midi) {
    startPianoNote(midi);
    const el = midiToEl.get(midi);
    if (el) el.classList.add('active');
}

function noteOff(midi) {
    stopPianoNote(midi);
    const el = midiToEl.get(midi);
    if (el) el.classList.remove('active');
}

/* ---------- Pointer (touch/mouse) playing ---------- */

pianoEl.addEventListener('pointerdown', function(e) {
    const el = e.target.closest('.piano-key');
    if (!el) return;
    e.preventDefault();
    // Release implicit touch capture so sliding across keys (glissando) works
    try {
        if (el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) {
            el.releasePointerCapture(e.pointerId);
        }
    } catch (err) { /* ignore */ }

    const midi = Number(el.dataset.midi);
    pointerNotes.set(e.pointerId, midi);
    noteOn(midi);
});

pianoEl.addEventListener('pointerover', function(e) {
    if (!pointerNotes.has(e.pointerId)) return;
    const el = e.target.closest('.piano-key');
    if (!el) return;
    const midi = Number(el.dataset.midi);
    const previous = pointerNotes.get(e.pointerId);
    if (previous === midi) return;
    noteOff(previous);
    pointerNotes.set(e.pointerId, midi);
    noteOn(midi);
});

function endPointer(e) {
    const midi = pointerNotes.get(e.pointerId);
    if (midi === undefined) return;
    pointerNotes.delete(e.pointerId);
    noteOff(midi);
}

window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

/* ---------- Rebuild on resize (octave count may change) ---------- */

window.addEventListener('resize', function() {
    if (active) buildPiano();
});

export const pianoMode = {
    id: 'piano',
    label: 'Piano',
    icon: '🎹',
    oskLayout: null,
    instructions: 'Play the piano! Tap the keys, or use Z-M and Q-I on your keyboard 🎹',

    activate() {
        active = true;
        pianoContainer.classList.add('active');
        setScoreVisible(false);
        builtKeyCount = 0;
        buildPiano();
    },

    deactivate() {
        active = false;
        pianoContainer.classList.remove('active');
        stopAllPianoNotes();
        pointerNotes.clear();
        heldKeys.clear();
        for (const el of midiToEl.values()) {
            el.classList.remove('active');
        }
    },

    onKey(key) {
        const normalized = key.length === 1 ? key.toUpperCase() : key;
        const midi = keyToMidi[normalized];
        if (midi === undefined) return;
        if (heldKeys.has(normalized)) return; // ignore keyboard auto-repeat
        heldKeys.add(normalized);
        noteOn(midi);
    },

    onKeyUp(key) {
        const normalized = key.length === 1 ? key.toUpperCase() : key;
        const midi = keyToMidi[normalized];
        if (midi === undefined) return;
        heldKeys.delete(normalized);
        noteOff(midi);
    }
};
