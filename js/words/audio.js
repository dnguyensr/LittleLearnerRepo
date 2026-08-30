/** @typedef {import('../types.js').WordPhoneme} WordPhoneme */

let currentClip = null;

export function stopWordAudio() {
    if (!currentClip) return;
    currentClip.pause();
    currentClip.currentTime = 0;
    currentClip = null;
}

/**
 * Prefer an authored, repository-local human clip. Curriculum entries without
 * one (or a clip that fails to load) use the caller's visible/TTS fallback, so
 * missing audio never blocks the activity.
 * @param {WordPhoneme} phoneme
 * @param {{enabled: boolean, fallback: () => void}} options
 */
export function playWordPhoneme(phoneme, { enabled, fallback }) {
    stopWordAudio();
    if (!enabled) return;
    if (!phoneme.audio) {
        fallback();
        return;
    }
    const clip = new Audio(phoneme.audio);
    currentClip = clip;
    let failed = false;
    const useFallback = () => {
        if (failed || currentClip !== clip) return;
        failed = true;
        currentClip = null;
        fallback();
    };
    clip.addEventListener('ended', () => {
        if (currentClip === clip) currentClip = null;
    }, { once: true });
    clip.addEventListener('error', useFallback, { once: true });
    clip.play().catch(useFallback);
}
