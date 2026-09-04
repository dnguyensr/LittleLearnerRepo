import { setSpeechEnabled, currentVoiceName, listVoices } from './speech.js';
import { LEGACY_STAGE, loadProgress, clearProgress, describeProgress } from './math/ladder.js';
import {
    clearWordsProgress, describeWordsProgress, loadWordsProgress
} from './words/progress.js';
import {
    clearNumbersProgress, describeNumbersProgress, loadNumbersProgress
} from './numbers/progress.js';
import {
    clearPatternsProgress, describePatternsProgress, loadPatternsProgress
} from './patterns/progress.js';

const STORAGE_KEY = 'lls-settings';
// mathTier has no row in the panel any more: Math Lab took over as the math
// mode, so it is only read by the unregistered js/modes/math.js. It remains in
// the stored contract so re-registering that legacy mode would preserve its
// setting.
const defaults = {
    speech: true,
    phonics: false,
    mathTier: 'auto',
    mathMethod: 'singapore',
    mathLabLevel: 'auto',
    wordStage: 'auto',
    numbersCounting: 'auto',
    patternStage: 'auto'
};

function load() {
    let stored;
    try {
        stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (err) {
        return { ...defaults };
    }
    // mathLabLevel used to be '1'-'4'; it is now a stage id. A stored numeric
    // value would otherwise match no <option> and silently reset the dropdown.
    if (LEGACY_STAGE[stored.mathLabLevel]) {
        stored.mathLabLevel = LEGACY_STAGE[stored.mathLabLevel];
    }
    return { ...defaults, ...stored };
}

const settings = load();

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) { /* private mode etc. */ }
}

export function getSetting(key) {
    return settings[key];
}

const listeners = [];

// Notified on every setSetting call so an active mode can react without polling.
export function onSettingChange(fn) {
    listeners.push(fn);
}

export function setSetting(key, value) {
    settings[key] = value;
    save();
    if (key === 'speech') setSpeechEnabled(value);
    for (const fn of listeners) fn(key, value);
}

/* ---------- Grown-up settings panel ---------- */

export function initSettingsUI() {
    setSpeechEnabled(settings.speech);

    const settingsBtn = document.getElementById('settings-btn');
    const panel = document.getElementById('settings-panel');
    const closeBtn = document.getElementById('settings-close');
    const input = id => /** @type {HTMLInputElement} */ (document.getElementById(id));
    const select = id => /** @type {HTMLSelectElement} */ (document.getElementById(id));

    const speechBox = input('set-speech');
    const phonicsBox = input('set-phonics');
    const methodSelect = select('set-math-method');
    const labLevelSelect = select('set-mathlab-level');
    const wordStageSelect = select('set-word-stage');
    const numbersCountingSelect = select('set-numbers-counting');
    const patternStageSelect = select('set-pattern-stage');

    speechBox.checked = settings.speech;
    phonicsBox.checked = settings.phonics;
    methodSelect.value = String(settings.mathMethod);
    labLevelSelect.value = String(settings.mathLabLevel);
    wordStageSelect.value = String(settings.wordStage);
    numbersCountingSelect.value = String(settings.numbersCounting);
    patternStageSelect.value = String(settings.patternStage);

    const methodNote = document.getElementById('math-method-note');
    const methodNotes = {
        singapore: 'Build it, see it, then write it.',
        classical: 'Count, practise facts, and use column math.',
        commoncore: 'Use ten frames, number lines, and blocks.',
        mix: 'Rotate through all three ways of seeing the same skill.'
    };
    const countingNote = document.getElementById('numbers-counting-note');
    const countingNotes = {
        auto: 'Numbers counts the first set for them, then hands the counting over.',
        watch: 'Numbers always counts out loud for them.',
        tap: 'Numbers always waits for them to touch each object.'
    };
    function refreshCountingNote() {
        countingNote.textContent = countingNotes[numbersCountingSelect.value] || '';
    }
    refreshCountingNote();

    function refreshMethodNote() {
        methodNote.textContent = methodNotes[methodSelect.value] || '';
    }
    refreshMethodNote();

    /* ---- Math Lab progress: read-out + two-tap reset ---- */

    const progressLabel = document.getElementById('mathlab-progress-label');
    const resetBtn = document.getElementById('mathlab-progress-reset');
    const wordsProgressLabel = document.getElementById('words-progress-label');
    const wordsResetBtn = document.getElementById('words-progress-reset');
    const numbersProgressLabel = document.getElementById('numbers-progress-label');
    const numbersResetBtn = document.getElementById('numbers-progress-reset');
    const patternsProgressLabel = document.getElementById('patterns-progress-label');
    const patternsResetBtn = document.getElementById('patterns-progress-reset');

    // Which voice the ranking actually landed on. The list differs per device
    // and can't be reproduced on a desktop, so on a phone this read-out is the
    // only way to tell a bad-sounding voice from a bad-sounding *engine*.
    const voiceReadout = document.getElementById('voice-readout');

    const voiceList = document.getElementById('voice-list');
    const voiceListRow = document.getElementById('voice-list-row');

    function refreshVoiceRow() {
        voiceReadout.textContent = `Voice: ${currentVoiceName() || 'browser default'}`;

        // The full inventory, so a device that sounds wrong can be diagnosed
        // from the device itself. iOS exposes its novelty and Eloquence voices
        // here alongside the real ones, and which of them are present depends on
        // what has been downloaded — none of which is visible from a desktop.
        const voices = listVoices();
        voiceList.textContent = '';
        for (const v of voices) {
            const item = document.createElement('li');
            item.textContent = `${v.chosen ? '▶ ' : ''}${v.name} — ${v.lang} — ${v.score}${v.uri ? ` — ${v.uri}` : ''}`;
            if (v.chosen) item.className = 'voice-chosen';
            voiceList.appendChild(item);
        }
        if (!voices.length) {
            const item = document.createElement('li');
            item.textContent = 'None reported (the list can arrive late — reopen this panel).';
            voiceList.appendChild(item);
        }
        voiceListRow.querySelector('summary').textContent = `Voices on this device (${voices.length})`;
    }

    function refreshProgressRow() {
        progressLabel.textContent = describeProgress(loadProgress());
        resetBtn.textContent = 'Start over';
        resetBtn.classList.remove('armed');
        wordsProgressLabel.textContent = describeWordsProgress(loadWordsProgress());
        wordsResetBtn.textContent = 'Start over';
        wordsResetBtn.classList.remove('armed');
        numbersProgressLabel.textContent = describeNumbersProgress(loadNumbersProgress());
        numbersResetBtn.textContent = 'Start over';
        numbersResetBtn.classList.remove('armed');
        patternsProgressLabel.textContent = describePatternsProgress(loadPatternsProgress());
        patternsResetBtn.textContent = 'Start over';
        patternsResetBtn.classList.remove('armed');
    }
    refreshProgressRow();

    // Two taps to reset: one mis-tap in a parent panel shouldn't erase weeks
    // of a child's climbing.
    resetBtn.addEventListener('click', () => {
        if (!resetBtn.classList.contains('armed')) {
            resetBtn.textContent = 'Tap again to erase';
            resetBtn.classList.add('armed');
            return;
        }
        clearProgress();
        window.dispatchEvent(new CustomEvent('lls-mathlab-progress-reset'));
        refreshProgressRow();
    });

    wordsResetBtn.addEventListener('click', () => {
        if (!wordsResetBtn.classList.contains('armed')) {
            wordsResetBtn.textContent = 'Tap again to erase';
            wordsResetBtn.classList.add('armed');
            return;
        }
        clearWordsProgress();
        window.dispatchEvent(new CustomEvent('lls-words-progress-reset'));
        refreshProgressRow();
    });

    numbersResetBtn.addEventListener('click', () => {
        if (!numbersResetBtn.classList.contains('armed')) {
            numbersResetBtn.textContent = 'Tap again to erase';
            numbersResetBtn.classList.add('armed');
            return;
        }
        clearNumbersProgress();
        window.dispatchEvent(new CustomEvent('lls-numbers-progress-reset'));
        refreshProgressRow();
    });

    patternsResetBtn.addEventListener('click', () => {
        if (!patternsResetBtn.classList.contains('armed')) {
            patternsResetBtn.textContent = 'Tap again to erase';
            patternsResetBtn.classList.add('armed');
            return;
        }
        clearPatternsProgress();
        window.dispatchEvent(new CustomEvent('lls-patterns-progress-reset'));
        refreshProgressRow();
    });

    function openPanel() {
        panel.hidden = false;
        settingsBtn.setAttribute('aria-expanded', 'true');
        refreshProgressRow();
        refreshVoiceRow();
        document.getElementById('settings-card').focus();
    }

    function closePanel() {
        panel.hidden = true;
        settingsBtn.setAttribute('aria-expanded', 'false');
        refreshProgressRow();
        settingsBtn.focus();
    }

    settingsBtn.addEventListener('click', openPanel);

    // Closing the panel disarms a half-finished reset.
    closeBtn.addEventListener('click', closePanel);
    panel.addEventListener('pointerdown', e => {
        if (e.target === panel) closePanel();
    });
    panel.addEventListener('keydown', e => {
        if (e.key === 'Escape') closePanel();
    });

    speechBox.addEventListener('change', () => setSetting('speech', speechBox.checked));
    phonicsBox.addEventListener('change', () => setSetting('phonics', phonicsBox.checked));
    methodSelect.addEventListener('change', () => {
        setSetting('mathMethod', methodSelect.value);
        refreshMethodNote();
    });
    labLevelSelect.addEventListener('change', () => setSetting('mathLabLevel', labLevelSelect.value));
    wordStageSelect.addEventListener('change', () => setSetting('wordStage', wordStageSelect.value));
    patternStageSelect.addEventListener('change', () => setSetting('patternStage', patternStageSelect.value));
    numbersCountingSelect.addEventListener('change', () => {
        setSetting('numbersCounting', numbersCountingSelect.value);
        refreshCountingNote();
    });
}
