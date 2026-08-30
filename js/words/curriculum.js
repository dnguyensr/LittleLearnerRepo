/** @typedef {import('../types.js').WordDefinition} WordDefinition */

export const WORD_SKILLS = [
    { id: 'firstSoundsContinuous', label: 'First sounds: stretchy sounds', activity: 'firstSound', prerequisites: [] },
    { id: 'firstSoundsStops', label: 'First sounds: quick sounds', activity: 'firstSound', prerequisites: ['firstSoundsContinuous'] },
    { id: 'finalSounds', label: 'Last sounds', activity: 'finalSound', prerequisites: ['firstSoundsStops'] },
    { id: 'segmentSounds', label: 'Tap each sound', activity: 'segment', prerequisites: ['finalSounds'] },
    { id: 'missingLetter', label: 'Finish a word', activity: 'missing', prerequisites: ['segmentSounds'] },
    { id: 'continuousCvc', label: 'Build stretchy-sound words', activity: 'build', prerequisites: ['missingLetter'] },
    { id: 'shortVowelCvc', label: 'Build short-vowel words', activity: 'build', prerequisites: ['continuousCvc'] },
    { id: 'wordChains', label: 'Change a word', activity: 'chain', prerequisites: ['shortVowelCvc'] },
    { id: 'blends', label: 'Consonant blends', activity: 'build', prerequisites: ['wordChains'] },
    { id: 'digraphs', label: 'Two letters, one sound', activity: 'build', prerequisites: ['blends'] },
    { id: 'silentE', label: 'Silent E', activity: 'build', prerequisites: ['digraphs'] },
    { id: 'vowelTeams', label: 'Vowel teams', activity: 'build', prerequisites: ['silentE'] },
    { id: 'wordParts', label: 'Word parts', activity: 'build', prerequisites: ['vowelTeams'] },
    { id: 'wordStars', label: 'Word Stars', activity: 'wordStar', prerequisites: ['shortVowelCvc'] }
];

export const FOUNDATION_WORD_SKILLS = WORD_SKILLS.slice(0, 7).map(skill => skill.id);
export const PATTERN_WORD_SKILLS = WORD_SKILLS.slice(7, 13).map(skill => skill.id);
export const WORD_PATHS = {
    practice: ['continuousCvc', 'shortVowelCvc'],
    patterns: PATTERN_WORD_SKILLS,
    wordStars: ['wordStars']
};

export const WORD_PATH_LABELS = {
    practice: 'Keep Building',
    patterns: 'New Patterns',
    wordStars: 'Word Stars'
};

export const WORD_STAGE_OPTIONS = [
    { id: 'auto', label: 'Learning path' },
    ...WORD_SKILLS.map(skill => ({ id: skill.id, label: skill.label }))
];

const PHONEME_CUES = {
    m: 'mmmm', s: 'ssss', f: 'ffff', n: 'nnnn', r: 'rrrr', l: 'llll', v: 'vvvv', z: 'zzzz',
    p: 'p', t: 't', k: 'k', b: 'b', d: 'd', g: 'g', h: 'h', j: 'j', w: 'w',
    sh: 'shhh', ch: 'ch', th: 'th',
    'short-a': 'short a, as in apple',
    'short-e': 'short e, as in egg',
    'short-i': 'short i, as in igloo',
    'short-o': 'short o, as in octopus',
    'short-u': 'short u, as in umbrella',
    'long-a': 'long a', 'long-e': 'long e', 'long-i': 'long i', 'long-o': 'long o'
};

/** @param {string} id */
export function phonemeCue(id) {
    return PHONEME_CUES[id] || id;
}

function p(id, grapheme, sequence = grapheme) {
    return { id, grapheme, sequence, cue: phonemeCue(id) };
}

/** @type {WordDefinition[]} */
export const WORD_DEFINITIONS = [
    { id: 'sun', word: 'SUN', label: 'sun', emoji: '☀️', pattern: 'cvc-short-u', phonemes: [p('s', 'S'), p('short-u', 'U'), p('n', 'N')], skills: ['firstSoundsContinuous', 'finalSounds', 'segmentSounds', 'missingLetter', 'continuousCvc', 'shortVowelCvc'] },
    { id: 'fan', word: 'FAN', label: 'fan', emoji: '🪭', pattern: 'cvc-short-a', phonemes: [p('f', 'F'), p('short-a', 'A'), p('n', 'N')], skills: ['firstSoundsContinuous', 'finalSounds', 'segmentSounds', 'missingLetter', 'continuousCvc', 'shortVowelCvc'] },
    { id: 'map', word: 'MAP', label: 'map', emoji: '🗺️', pattern: 'cvc-short-a', phonemes: [p('m', 'M'), p('short-a', 'A'), p('p', 'P')], skills: ['firstSoundsContinuous', 'finalSounds', 'segmentSounds', 'missingLetter', 'continuousCvc', 'shortVowelCvc'] },
    { id: 'rat', word: 'RAT', label: 'rat', emoji: '🐀', pattern: 'cvc-short-a', phonemes: [p('r', 'R'), p('short-a', 'A'), p('t', 'T')], skills: ['firstSoundsContinuous', 'finalSounds', 'continuousCvc', 'shortVowelCvc', 'wordChains'], chain: 'at' },
    { id: 'lip', word: 'LIP', label: 'lip', emoji: '👄', pattern: 'cvc-short-i', phonemes: [p('l', 'L'), p('short-i', 'I'), p('p', 'P')], skills: ['firstSoundsContinuous', 'finalSounds', 'continuousCvc', 'shortVowelCvc'] },
    { id: 'net', word: 'NET', label: 'net', emoji: '🥅', pattern: 'cvc-short-e', phonemes: [p('n', 'N'), p('short-e', 'E'), p('t', 'T')], skills: ['firstSoundsContinuous', 'finalSounds', 'continuousCvc', 'shortVowelCvc'] },

    { id: 'cat', word: 'CAT', label: 'cat', emoji: '🐱', pattern: 'cvc-short-a', phonemes: [p('k', 'C'), p('short-a', 'A'), p('t', 'T')], skills: ['firstSoundsStops', 'finalSounds', 'missingLetter', 'shortVowelCvc', 'wordChains'], chain: 'at' },
    { id: 'hat', word: 'HAT', label: 'hat', emoji: '🎩', pattern: 'cvc-short-a', phonemes: [p('h', 'H'), p('short-a', 'A'), p('t', 'T')], skills: ['firstSoundsStops', 'finalSounds', 'missingLetter', 'shortVowelCvc', 'wordChains'], chain: 'at' },
    { id: 'dog', word: 'DOG', label: 'dog', emoji: '🐕', pattern: 'cvc-short-o', phonemes: [p('d', 'D'), p('short-o', 'O'), p('g', 'G')], skills: ['firstSoundsStops', 'finalSounds', 'missingLetter', 'shortVowelCvc'] },
    { id: 'pig', word: 'PIG', label: 'pig', emoji: '🐷', pattern: 'cvc-short-i', phonemes: [p('p', 'P'), p('short-i', 'I'), p('g', 'G')], skills: ['firstSoundsStops', 'finalSounds', 'shortVowelCvc'] },
    { id: 'bed', word: 'BED', label: 'bed', emoji: '🛏️', pattern: 'cvc-short-e', phonemes: [p('b', 'B'), p('short-e', 'E'), p('d', 'D')], skills: ['firstSoundsStops', 'finalSounds', 'shortVowelCvc'] },
    { id: 'cup', word: 'CUP', label: 'cup', emoji: '🥤', pattern: 'cvc-short-u', phonemes: [p('k', 'C'), p('short-u', 'U'), p('p', 'P')], skills: ['firstSoundsStops', 'finalSounds', 'shortVowelCvc'] },

    { id: 'frog', word: 'FROG', label: 'frog', emoji: '🐸', pattern: 'ccvc', phonemes: [p('f', 'F'), p('r', 'R'), p('short-o', 'O'), p('g', 'G')], skills: ['blends'] },
    { id: 'stop', word: 'STOP', label: 'stop', emoji: '🛑', pattern: 'ccvc', phonemes: [p('s', 'S'), p('t', 'T'), p('short-o', 'O'), p('p', 'P')], skills: ['blends'] },
    { id: 'hand', word: 'HAND', label: 'hand', emoji: '✋', pattern: 'cvcc', phonemes: [p('h', 'H'), p('short-a', 'A'), p('n', 'N'), p('d', 'D')], skills: ['blends'] },
    { id: 'milk', word: 'MILK', label: 'milk', emoji: '🥛', pattern: 'cvcc', phonemes: [p('m', 'M'), p('short-i', 'I'), p('l', 'L'), p('k', 'K')], skills: ['blends'] },

    { id: 'ship', word: 'SHIP', label: 'ship', emoji: '🚢', pattern: 'digraph-sh', phonemes: [p('sh', 'SH'), p('short-i', 'I'), p('p', 'P')], skills: ['digraphs'] },
    { id: 'fish', word: 'FISH', label: 'fish', emoji: '🐟', pattern: 'digraph-sh', phonemes: [p('f', 'F'), p('short-i', 'I'), p('sh', 'SH')], skills: ['digraphs'] },
    { id: 'chop', word: 'CHOP', label: 'chop', emoji: '🔪', pattern: 'digraph-ch', phonemes: [p('ch', 'CH'), p('short-o', 'O'), p('p', 'P')], skills: ['digraphs'] },
    { id: 'thin', word: 'THIN', label: 'thin', emoji: '🪶', pattern: 'digraph-th', phonemes: [p('th', 'TH'), p('short-i', 'I'), p('n', 'N')], skills: ['digraphs'] },

    { id: 'cake', word: 'CAKE', label: 'cake', emoji: '🎂', pattern: 'silent-e', phonemes: [p('k', 'C'), p('long-a', 'A…E', 'AE'), p('k', 'K')], skills: ['silentE'] },
    { id: 'bike', word: 'BIKE', label: 'bike', emoji: '🚲', pattern: 'silent-e', phonemes: [p('b', 'B'), p('long-i', 'I…E', 'IE'), p('k', 'K')], skills: ['silentE'] },
    { id: 'home', word: 'HOME', label: 'home', emoji: '🏠', pattern: 'silent-e', phonemes: [p('h', 'H'), p('long-o', 'O…E', 'OE'), p('m', 'M')], skills: ['silentE'] },

    { id: 'team', word: 'TEAM', label: 'team', emoji: '🤝', pattern: 'vowel-team-ee', phonemes: [p('t', 'T'), p('long-e', 'EA'), p('m', 'M')], skills: ['vowelTeams'] },
    { id: 'boat', word: 'BOAT', label: 'boat', emoji: '⛵', pattern: 'vowel-team-oa', phonemes: [p('b', 'B'), p('long-o', 'OA'), p('t', 'T')], skills: ['vowelTeams'] },
    { id: 'rain', word: 'RAIN', label: 'rain', emoji: '🌧️', pattern: 'vowel-team-ai', phonemes: [p('r', 'R'), p('long-a', 'AI'), p('n', 'N')], skills: ['vowelTeams'] },

    { id: 'cats', word: 'CATS', label: 'cats', emoji: '🐈🐈', pattern: 'plural-s', phonemes: [p('k', 'C'), p('short-a', 'A'), p('t', 'T'), p('s', 'S')], skills: ['wordParts'] },
    { id: 'dogs', word: 'DOGS', label: 'dogs', emoji: '🐕🐕', pattern: 'plural-s', phonemes: [p('d', 'D'), p('short-o', 'O'), p('g', 'G'), p('z', 'S')], skills: ['wordParts'] },

    { id: 'one', word: 'ONE', label: 'one', emoji: '1️⃣', pattern: 'irregular', phonemes: [p('w', 'W'), p('short-u', 'U'), p('n', 'N')], spelling: ['O', 'N', 'E'], unexpected: [0, 2], skills: ['wordStars'], irregular: true },
    { id: 'two', word: 'TWO', label: 'two', emoji: '2️⃣', pattern: 'irregular', phonemes: [p('t', 'T'), p('long-o', 'OO')], spelling: ['T', 'W', 'O'], unexpected: [1, 2], skills: ['wordStars'], irregular: true },
    { id: 'the', word: 'THE', label: 'the', emoji: '⭐', pattern: 'irregular', phonemes: [p('th', 'TH'), p('short-u', 'UH')], spelling: ['T', 'H', 'E'], unexpected: [2], skills: ['wordStars'], irregular: true },
    { id: 'said', word: 'SAID', label: 'said', emoji: '💬', pattern: 'irregular', phonemes: [p('s', 'S'), p('short-e', 'E'), p('d', 'D')], spelling: ['S', 'A', 'I', 'D'], unexpected: [1, 2], skills: ['wordStars'], irregular: true },
    { id: 'was', word: 'WAS', label: 'was', emoji: '⏪', pattern: 'irregular', phonemes: [p('w', 'W'), p('short-u', 'UH'), p('z', 'Z')], spelling: ['W', 'A', 'S'], unexpected: [1], skills: ['wordStars'], irregular: true }
];

const wordById = Object.fromEntries(WORD_DEFINITIONS.map(word => [word.id, word]));
const skillById = Object.fromEntries(WORD_SKILLS.map(skill => [skill.id, skill]));

export function wordByID(id) {
    return wordById[id] || null;
}

export function wordSkill(id) {
    return skillById[id] || null;
}

export function wordsForSkill(skillId) {
    return WORD_DEFINITIONS.filter(word => word.skills.includes(skillId));
}

export function tileSequence(tile) {
    return tile.replace(/[^A-Z]/g, '');
}

export function cueForGrapheme(grapheme) {
    for (const word of WORD_DEFINITIONS) {
        const match = word.phonemes.find(phoneme => phoneme.grapheme === grapheme);
        if (match) return match.cue;
    }
    return grapheme.split('').join(', ');
}
