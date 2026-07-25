const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99];

const keyToNote = {};
let noteIndex = 0;

export function unlockAudio() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

export function getAudioState() {
    return audioContext.state;
}

function getFrequencyForKey(key) {
    if (!keyToNote[key]) {
        keyToNote[key] = notes[noteIndex % notes.length];
        noteIndex++;
    }
    return keyToNote[key];
}

export function playTone(frequency) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = ['sine', 'square', 'triangle'][Math.floor(Math.random() * 3)];

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

export function playKeyTone(key) {
    playTone(getFrequencyForKey(key));
}

function playChimeNote(frequency, duration) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + duration);
}

export function playSuccessSound() {
    playChimeNote(523.25, 0.3);
    setTimeout(() => playChimeNote(659.25, 0.3), 150);
    setTimeout(() => playChimeNote(783.99, 0.5), 300);
}

export function playWrongSound() {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = 200;
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.2);
}

/* ---------- Piano voice ---------- */

const MAX_PIANO_VOICES = 10;
const activePianoNotes = new Map();
let pianoMaster = null;

export function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

function getPianoMaster() {
    if (!pianoMaster) {
        pianoMaster = audioContext.createGain();
        pianoMaster.gain.value = 0.6;
        pianoMaster.connect(audioContext.destination);
    }
    return pianoMaster;
}

// Fixed piano-ish timbre: layered partials with a fast attack, a natural
// decay toward a quiet sustain while held, and a short release on key-up.
const pianoPartials = [
    { mult: 1, type: 'triangle', gain: 1.0, detune: 0 },
    { mult: 2, type: 'sine', gain: 0.35, detune: 3 },
    { mult: 3, type: 'sine', gain: 0.12, detune: -4 }
];

export function startPianoNote(midi) {
    unlockAudio();

    if (activePianoNotes.has(midi)) {
        stopPianoNote(midi, true);
    }
    if (activePianoNotes.size >= MAX_PIANO_VOICES) {
        stopPianoNote(activePianoNotes.keys().next().value, true);
    }

    const t = audioContext.currentTime;
    const freq = midiToFreq(midi);

    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(freq * 6, 9000);
    filter.Q.value = 0.5;
    gain.connect(filter);
    filter.connect(getPianoMaster());

    const oscs = [];
    for (const partial of pianoPartials) {
        const osc = audioContext.createOscillator();
        osc.type = partial.type;
        osc.frequency.value = freq * partial.mult;
        osc.detune.value = partial.detune;
        const partialGain = audioContext.createGain();
        partialGain.gain.value = partial.gain;
        osc.connect(partialGain);
        partialGain.connect(gain);
        osc.start(t);
        oscs.push(osc);
    }

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.008);
    gain.gain.setTargetAtTime(0.05, t + 0.008, 0.9);

    activePianoNotes.set(midi, { oscs, gain });
}

export function stopPianoNote(midi, immediate = false) {
    const voice = activePianoNotes.get(midi);
    if (!voice) return;
    activePianoNotes.delete(midi);

    const t = audioContext.currentTime;
    const param = voice.gain.gain;
    if (param.cancelAndHoldAtTime) {
        param.cancelAndHoldAtTime(t);
    } else {
        param.cancelScheduledValues(t);
    }
    param.setTargetAtTime(0.0001, t, immediate ? 0.02 : 0.09);

    const stopAt = t + (immediate ? 0.15 : 0.6);
    for (const osc of voice.oscs) {
        osc.stop(stopAt);
    }
}

export function stopAllPianoNotes() {
    for (const midi of [...activePianoNotes.keys()]) {
        stopPianoNote(midi);
    }
}
