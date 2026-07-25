// Letter name, an approximate phonic sound the TTS can pronounce,
// and an example word + emoji for each letter.
export const letterData = [
    { letter: 'A', phonic: 'ah', word: 'APPLE', emoji: '🍎' },
    { letter: 'B', phonic: 'buh', word: 'BALL', emoji: '⚽' },
    { letter: 'C', phonic: 'kuh', word: 'CAT', emoji: '🐱' },
    { letter: 'D', phonic: 'duh', word: 'DOG', emoji: '🐕' },
    { letter: 'E', phonic: 'eh', word: 'EGG', emoji: '🥚' },
    { letter: 'F', phonic: 'fuh', word: 'FISH', emoji: '🐟' },
    { letter: 'G', phonic: 'guh', word: 'GOAT', emoji: '🐐' },
    { letter: 'H', phonic: 'huh', word: 'HAT', emoji: '🎩' },
    { letter: 'I', phonic: 'ih', word: 'ICE', emoji: '🧊' },
    { letter: 'J', phonic: 'juh', word: 'JAM', emoji: '🫙' },
    { letter: 'K', phonic: 'kuh', word: 'KITE', emoji: '🪁' },
    { letter: 'L', phonic: 'luh', word: 'LION', emoji: '🦁' },
    { letter: 'M', phonic: 'muh', word: 'MOON', emoji: '🌙' },
    { letter: 'N', phonic: 'nuh', word: 'NOSE', emoji: '👃' },
    { letter: 'O', phonic: 'oh', word: 'OWL', emoji: '🦉' },
    { letter: 'P', phonic: 'puh', word: 'PIG', emoji: '🐷' },
    { letter: 'Q', phonic: 'kwuh', word: 'QUEEN', emoji: '👸' },
    { letter: 'R', phonic: 'ruh', word: 'ROBOT', emoji: '🤖' },
    { letter: 'S', phonic: 'sss', word: 'SUN', emoji: '☀️' },
    { letter: 'T', phonic: 'tuh', word: 'TIGER', emoji: '🐯' },
    { letter: 'U', phonic: 'uh', word: 'UMBRELLA', emoji: '☂️' },
    { letter: 'V', phonic: 'vuh', word: 'VIOLIN', emoji: '🎻' },
    { letter: 'W', phonic: 'wuh', word: 'WHALE', emoji: '🐳' },
    { letter: 'X', phonic: 'ks', word: 'X-RAY', emoji: '🩻' },
    { letter: 'Y', phonic: 'yuh', word: 'YO-YO', emoji: '🪀' },
    { letter: 'Z', phonic: 'zzz', word: 'ZEBRA', emoji: '🦓' }
];

const byLetter = {};
for (const entry of letterData) {
    byLetter[entry.letter] = entry;
}

export function getLetterInfo(letter) {
    return byLetter[letter] || null;
}
