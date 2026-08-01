// Thin wrapper around speechSynthesis: queue-friendly, cancelable,
// no-op when unsupported or disabled in parent settings.
//
// Voice selection is deliberately defensive, because every platform's
// getVoices() is broken in a different way:
//
//   - the list is EMPTY at page load and arrives asynchronously, so a voice
//     chosen once at startup is chosen from nothing;
//   - iOS Safari reports `default: true` for every voice, so `.default` is
//     not a usable signal;
//   - Android Chrome lists voices that aren't installed and silently
//     substitutes a generic one;
//   - Edge exposes 250+ voices spanning every English region, so "first
//     English match" can easily be Australian when the content is US English.
//
// So: score every candidate, break ties deterministically by name, and
// re-resolve lazily whenever the list changes. Same device, same voice, every
// time — the previous "first match wins" picked a different voice depending on
// when the async list happened to land.
const synth = window.speechSynthesis || null;

let enabled = true;
let chosenName = null;
let lastListSize = -1;

function isEnglish(voice) {
    return /^en(-|_|$)/i.test(voice.lang || '');
}

/**
 * Higher is better. Locale fit outranks quality markers: a plain US voice
 * reading "APPLES" beats a natural-sounding Australian one.
 *
 * @param {SpeechSynthesisVoice} voice
 */
function score(voice) {
    const lang = (voice.lang || '').replace('_', '-').toLowerCase();
    const preferred = (navigator.language || 'en-US').toLowerCase();

    let points = 0;
    if (lang === preferred) points += 60;
    else if (lang === 'en-us') points += 40;
    else points += 10;

    // Quality markers as the platforms spell them: Edge uses "(Natural)",
    // Apple uses "(Enhanced)"/"(Premium)".
    const name = voice.name || '';
    if (/natural|neural/i.test(name)) points += 25;
    else if (/premium|enhanced/i.test(name)) points += 20;

    // `voice.default` is deliberately NOT scored: iOS sets it on everything.
    return points;
}

/**
 * Pick the best English voice, deterministically. Exported for tests, which
 * can't rely on a headless browser exposing any real voices.
 *
 * @param {SpeechSynthesisVoice[]} voices
 * @returns {string|null} the chosen voice's name
 */
export function rankVoices(voices) {
    const english = voices.filter(isEnglish);
    if (!english.length) return null;

    return english
        .slice()
        .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0]
        .name;
}

// Resolved per utterance rather than cached at load: the list is empty at
// startup, so anything decided then is decided too early.
function currentVoice() {
    if (!synth) return null;
    const voices = synth.getVoices();
    if (!voices.length) return null;

    if (voices.length !== lastListSize) {
        lastListSize = voices.length;
        chosenName = rankVoices(voices);
    }
    return voices.find(v => v.name === chosenName) || null;
}

if (synth) {
    // Nudge the async population; the result is read lazily in speak().
    synth.getVoices();
    synth.addEventListener?.('voiceschanged', () => { lastListSize = -1; });
}

export function setSpeechEnabled(value) {
    enabled = value;
    if (!value) cancelSpeech();
}

export function isSpeechEnabled() {
    return enabled;
}

/** The voice actually in use, for the settings panel and for debugging. */
export function currentVoiceName() {
    const voice = currentVoice();
    return voice ? `${voice.name} (${voice.lang})` : null;
}

/**
 * @returns {boolean} whether an utterance was actually queued, so callers that
 *   pace visuals off the voice can fall back to a timer when it wasn't.
 */
export function speak(text, { rate = 0.9, pitch = 1.1, interrupt = false, onStart = null, onEnd = null } = {}) {
    if (!synth || !enabled || !text) return false;
    try {
        if (interrupt) synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;
        const voice = currentVoice();
        if (voice) utterance.voice = voice;
        if (onStart) utterance.addEventListener('start', onStart);
        if (onEnd) {
            utterance.addEventListener('end', onEnd);
            // A cancelled or failed utterance must not strand a caller waiting
            // for it to finish.
            utterance.addEventListener('error', onEnd);
        }
        synth.speak(utterance);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Speak several short phrases back to back, calling `onPhraseStart(index)` as
 * each one actually begins.
 *
 * The phrases are **queued**, never interrupted — speechSynthesis plays them in
 * order with its own natural gap, so counting paces itself to the voice instead
 * of to a guessed timer. The old approach fired every 500ms with
 * `interrupt: true`, which meant any voice slower than that got cut off by the
 * next number: the better the voice, the more chopped it sounded.
 *
 * Only the first phrase may interrupt, to clear whatever came before.
 *
 * @param {string[]} phrases
 * @param {{ onPhraseStart?: ((index: number) => void)|null, interrupt?: boolean,
 *           rate?: number, pitch?: number }} [options]
 * @returns {boolean} false when speech is unavailable, so the caller can
 *   pace the same sequence on a timer instead.
 */
export function speakEach(phrases, { onPhraseStart = null, interrupt = false, rate, pitch } = {}) {
    if (!synth || !enabled || !phrases.length) return false;

    let queued = false;
    phrases.forEach((text, index) => {
        const spoke = speak(text, {
            rate,
            pitch,
            interrupt: interrupt && index === 0,
            onStart: onPhraseStart ? () => onPhraseStart(index) : null
        });
        queued = queued || spoke;
    });
    return queued;
}

export function cancelSpeech() {
    try {
        synth?.cancel();
    } catch (err) { /* ignore */ }
}
