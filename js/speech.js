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
let chosenURI = null;
let lastListSize = -1;

function isEnglish(voice) {
    return /^en(-|_|$)/i.test(voice.lang || '');
}

// Apple's English voices carry no quality marker in the name — they are bare
// first names — so on iOS every candidate used to score identically and the
// alphabetical tiebreak decided the whole app. That tiebreak has no idea the
// list it is sorting contains gag voices, and `Albert` (a breathy croak) sorts
// above `Samantha`. That is the reported "whispering ghost".
//
// `voiceURI` is the signal the name doesn't give us:
//
//   com.apple.voice.premium.en-US.Ava       downloaded neural — best
//   com.apple.voice.enhanced.en-US.Ava      downloaded — good
//   com.apple.voice.compact.en-US.Samantha  preloaded — fine, always present
//   com.apple.eloquence.en-US.Reed          DECtalk-era formant synth
//   com.apple.speech.synthesis.voice.Bells  novelty (Boing, Zarvox, Whisper…)
//
// Note the last namespace also holds `Alex`, one of the best voices Apple
// ships, so the namespace alone can't be a reject rule — the novelty set is
// matched by name instead.
const UNUSABLE_NAMES = new Set([
    // Novelty: these sing, buzz, or whisper the text.
    'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos',
    'deranged', 'good news', 'hysterical', 'jester', 'organ', 'superstar',
    'trinoids', 'whisper', 'wobble', 'zarvox',
    // Legacy MacinTalk: intelligible but worse than anything else on the device.
    'fred', 'junior', 'kathy', 'princess', 'ralph', 'agnes', 'vicki', 'victoria',
    // Eloquence (iOS 16+), matched by name too in case voiceURI is unavailable.
    'eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley'
]);

// Apple's mainstream en-US voices, used only to break ties within a tier —
// never as a gate, since the list a device actually exposes varies with what
// the parent has downloaded.
const PREFERRED_NAMES = new Set([
    'samantha', 'ava', 'allison', 'susan', 'nicky', 'zoe', 'joelle', 'noelle',
    'alex', 'tom', 'evan', 'nathan', 'aaron'
]);

/** Apple appends "(Enhanced)" / locale suffixes to some names; compare the stem. */
function nameKey(voice) {
    return (voice.name || '').toLowerCase().replace(/\s*\(.*\)\s*$/, '').trim();
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

    // Quality markers as the platforms spell them: Edge puts "(Natural)" in the
    // name, Apple puts the tier in the voiceURI and sometimes in the name.
    const name = voice.name || '';
    const uri = (voice.voiceURI || '').toLowerCase();
    if (/premium/i.test(name) || uri.includes('.premium.')) points += 30;
    else if (/natural|neural/i.test(name)) points += 25;
    else if (/enhanced/i.test(name) || uri.includes('.enhanced.')) points += 20;

    const key = nameKey(voice);
    if (PREFERRED_NAMES.has(key)) points += 8;

    // A demotion, not a filter: if a device somehow exposes nothing else, a
    // silly voice still beats falling back to whatever the platform picks.
    if (UNUSABLE_NAMES.has(key) || uri.includes('eloquence')) points -= 1000;

    // `voice.default` is deliberately NOT scored: iOS sets it on everything.
    return points;
}

/**
 * Pick the best English voice, deterministically.
 *
 * @param {SpeechSynthesisVoice[]} voices
 * @returns {SpeechSynthesisVoice|null}
 */
function bestVoice(voices) {
    const english = voices.filter(isEnglish);
    if (!english.length) return null;

    return english
        .slice()
        .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0];
}

/**
 * Name of the best English voice. Exported for tests, which can't rely on a
 * headless browser exposing any real voices.
 *
 * @param {SpeechSynthesisVoice[]} voices
 * @returns {string|null}
 */
export function rankVoices(voices) {
    return bestVoice(voices)?.name ?? null;
}

// Resolved per utterance rather than cached at load: the list is empty at
// startup, so anything decided then is decided too early.
function currentVoice() {
    if (!synth) return null;
    const voices = synth.getVoices();
    if (!voices.length) return null;

    if (voices.length !== lastListSize) {
        lastListSize = voices.length;
        const best = bestVoice(voices);
        chosenName = best?.name ?? null;
        // Apple ships compact and enhanced variants under one name, so the URI
        // is what distinguishes the one that was actually chosen.
        chosenURI = best?.voiceURI ?? null;
    }
    return voices.find(v => chosenURI && v.voiceURI === chosenURI)
        || voices.find(v => v.name === chosenName)
        || null;
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

function sameVoice(a, b) {
    if (!a || !b) return false;
    return a.voiceURI && b.voiceURI ? a.voiceURI === b.voiceURI : a.name === b.name;
}

/**
 * Every voice this device exposes, in the order the ranking sees them.
 *
 * Purely diagnostic, and the reason it exists: the inventory is different on
 * every device and cannot be reproduced locally. Playwright's WebKit is not
 * Safari and runs on a machine with no Apple voices installed, so `getVoices()`
 * there is empty — reading the list off the actual phone is the only way to
 * know what iOS is really offering.
 *
 * @returns {{ name: string, lang: string, uri: string, score: number,
 *             chosen: boolean }[]}
 */
export function listVoices() {
    if (!synth) return [];
    const chosen = currentVoice();
    return synth.getVoices()
        .slice()
        .sort((a, b) =>
            Number(isEnglish(b)) - Number(isEnglish(a))
            || score(b) - score(a)
            || a.name.localeCompare(b.name))
        .map(v => ({
            name: v.name,
            lang: v.lang,
            uri: v.voiceURI || '',
            score: score(v),
            chosen: sameVoice(v, chosen)
        }));
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
