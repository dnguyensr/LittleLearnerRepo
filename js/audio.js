const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99];

const keyToNote = {};
let noteIndex = 0;

export function unlockAudio() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
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

export function playDrum(type) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    if (type === 'kick') {
        osc.frequency.setValueAtTime(150, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioContext.currentTime + 0.1);
        gain.gain.setValueAtTime(1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.3);
    } else if (type === 'snare') {
        const noise = audioContext.createBufferSource();
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.2, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        noise.start(audioContext.currentTime);
    } else if (type === 'hihat') {
        const noise = audioContext.createBufferSource();
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;
        filter.type = 'highpass';
        filter.frequency.value = 5000;
        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        noise.start(audioContext.currentTime);
    } else if (type === 'tom') {
        osc.frequency.setValueAtTime(200 + Math.random() * 100, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.15);
        gain.gain.setValueAtTime(0.5, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.2);
    }
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
