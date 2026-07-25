// Thin wrapper around speechSynthesis: queue-friendly, cancelable,
// no-op when unsupported or disabled in parent settings.
const synth = window.speechSynthesis || null;

let enabled = true;
let voice = null;

function pickVoice() {
    if (!synth) return;
    const voices = synth.getVoices();
    if (!voices.length) return;
    voice = voices.find(v => /en[-_]/i.test(v.lang) && /natural|kids|junior/i.test(v.name))
        || voices.find(v => v.default && /en[-_]/i.test(v.lang))
        || voices.find(v => /en[-_]/i.test(v.lang))
        || null;
}

if (synth) {
    pickVoice();
    synth.addEventListener?.('voiceschanged', pickVoice);
}

export function setSpeechEnabled(value) {
    enabled = value;
    if (!value) cancelSpeech();
}

export function isSpeechEnabled() {
    return enabled;
}

export function speak(text, { rate = 0.9, pitch = 1.1, interrupt = false } = {}) {
    if (!synth || !enabled || !text) return;
    try {
        if (interrupt) synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;
        if (voice) utterance.voice = voice;
        synth.speak(utterance);
    } catch (err) { /* speech is best-effort */ }
}

export function cancelSpeech() {
    try {
        synth?.cancel();
    } catch (err) { /* ignore */ }
}
