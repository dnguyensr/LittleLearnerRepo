# Words phoneme audio

Words supports repository-local, human-recorded phoneme clips through the optional `audio` field on each phoneme in `./js/words/curriculum.js`. Runtime audio must never be fetched from a third party.

No clip is licensed for shipment yet. Until a reviewed General American English recording set is added, the module falls back to the authored speech cue and remains fully operable visually when speech is unavailable. Do not add a file or populate an `audio` field without documenting all of the following here:

- filename and phoneme;
- speaker/dialect and recording date;
- creator and source URL;
- redistribution license and required attribution;
- edits such as trimming, normalization, or format conversion; and
- review confirmation that stop consonants do not add a schwa.

Prefer short mono clips in a browser-supported format. Paths must remain relative, for example `./assets/phonemes/s.ogg`.
