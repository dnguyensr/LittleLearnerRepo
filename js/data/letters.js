// Letter name, an approximate phonic sound the TTS can pronounce,
// and an example word + emoji for each letter.
//
// `spoken` is the letter's *name* respelled for a speech engine. The Web Speech
// API has no "read this as a character" control — an utterance carries only
// text, lang, voice, rate, pitch and volume, and Safari ignores SSML — so the
// only lever is the text itself. Hand iOS Safari the bare string "E" and it
// describes the character rather than naming it: "capital E", "capital A",
// "capital T" while a child spells EAT. Lowercasing dodges the "capital" prefix
// but trades it for word readings ("a" as the article, a schwa), so instead
// every letter is spelled the way it sounds. Real words are used wherever one
// happens to match the letter name — dictionaries pronounce those reliably —
// with respellings only where none does.
export const letterData = [
    { letter: 'A', spoken: 'ay', phonic: 'ah', word: 'APPLE', emoji: '🍎' },
    { letter: 'B', spoken: 'bee', phonic: 'buh', word: 'BALL', emoji: '⚽' },
    { letter: 'C', spoken: 'see', phonic: 'kuh', word: 'CAT', emoji: '🐱' },
    { letter: 'D', spoken: 'dee', phonic: 'duh', word: 'DOG', emoji: '🐕' },
    { letter: 'E', spoken: 'ee', phonic: 'eh', word: 'EGG', emoji: '🥚' },
    { letter: 'F', spoken: 'eff', phonic: 'fuh', word: 'FISH', emoji: '🐟' },
    { letter: 'G', spoken: 'jee', phonic: 'guh', word: 'GOAT', emoji: '🐐' },
    { letter: 'H', spoken: 'aitch', phonic: 'huh', word: 'HAT', emoji: '🎩' },
    { letter: 'I', spoken: 'eye', phonic: 'ih', word: 'ICE', emoji: '🧊' },
    { letter: 'J', spoken: 'jay', phonic: 'juh', word: 'JAM', emoji: '🫙' },
    { letter: 'K', spoken: 'kay', phonic: 'kuh', word: 'KITE', emoji: '🪁' },
    { letter: 'L', spoken: 'ell', phonic: 'luh', word: 'LION', emoji: '🦁' },
    { letter: 'M', spoken: 'em', phonic: 'muh', word: 'MOON', emoji: '🌙' },
    { letter: 'N', spoken: 'en', phonic: 'nuh', word: 'NOSE', emoji: '👃' },
    { letter: 'O', spoken: 'oh', phonic: 'oh', word: 'OWL', emoji: '🦉' },
    { letter: 'P', spoken: 'pee', phonic: 'puh', word: 'PIG', emoji: '🐷' },
    { letter: 'Q', spoken: 'cue', phonic: 'kwuh', word: 'QUEEN', emoji: '👸' },
    { letter: 'R', spoken: 'are', phonic: 'ruh', word: 'ROBOT', emoji: '🤖' },
    { letter: 'S', spoken: 'ess', phonic: 'sss', word: 'SUN', emoji: '☀️' },
    { letter: 'T', spoken: 'tee', phonic: 'tuh', word: 'TIGER', emoji: '🐯' },
    { letter: 'U', spoken: 'you', phonic: 'uh', word: 'UMBRELLA', emoji: '☂️' },
    { letter: 'V', spoken: 'vee', phonic: 'vuh', word: 'VIOLIN', emoji: '🎻' },
    { letter: 'W', spoken: 'double you', phonic: 'wuh', word: 'WHALE', emoji: '🐳' },
    { letter: 'X', spoken: 'ex', phonic: 'ks', word: 'X-RAY', emoji: '🩻' },
    { letter: 'Y', spoken: 'why', phonic: 'yuh', word: 'YO-YO', emoji: '🪀' },
    { letter: 'Z', spoken: 'zee', phonic: 'zzz', word: 'ZEBRA', emoji: '🦓' }
];

const byLetter = {};
for (const entry of letterData) {
    byLetter[entry.letter] = entry;
}

export function getLetterInfo(letter) {
    return byLetter[letter] || null;
}

/**
 * How to hand a single letter to the speech engine so it names the letter
 * instead of describing the character. Case-insensitive, because the fix is
 * pointless if the caller has to remember to normalise first.
 *
 * Anything that isn't a letter is passed straight back, so this is safe to wrap
 * around a key that may be a digit or a symbol.
 *
 * @param {string} letter
 * @returns {string}
 */
export function spokenLetter(letter) {
    const entry = byLetter[String(letter).toUpperCase()];
    return entry ? entry.spoken : letter;
}
